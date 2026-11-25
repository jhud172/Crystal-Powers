package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class DocksStripeRisk {
    enum Kind {
        REFUND("refund"), DISPUTE("dispute"), FRAUD_WARNING("fraud_warning");

        final String value;
        Kind(String value) { this.value = value; }
    }
    record Source(Kind kind, String id, String chargeId, String paymentIntent, String customer) {}
    record Pointer(String id, String chargeId) {}
    record Invoice(String id, String subscriptionId, String attemptId) {}
    record Outcome(String value, boolean holdsAccess) {}

    private final StripeGateway stripe;
    public DocksStripeRisk(StripeGateway stripe) { this.stripe = stripe; }

    static Kind kind(String eventType) {
        return switch (eventType) {
            case "charge.refunded" -> Kind.REFUND;
            case "charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed" -> Kind.DISPUTE;
            case "radar.early_fraud_warning.created" -> Kind.FRAUD_WARNING;
            default -> null;
        };
    }

    static Pointer pointer(Kind kind, JsonNode object) {
        String id = id(object.path("id"), switch (kind) {
            case REFUND -> "ch_";
            case DISPUTE -> "dp_";
            case FRAUD_WARNING -> "issfr_";
        });
        String chargeId = kind == Kind.REFUND ? id : id(object.path("charge"), "ch_");
        if (id == null || chargeId == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid Stripe payment reference.");
        return new Pointer(id, chargeId);
    }

    Optional<Source> source(Kind kind, Pointer pointer) {
        var charge = charge(pointer.chargeId());
        String paymentIntent = id(charge.path("payment_intent"), "pi_");
        String customer = id(charge.path("customer"), "cus_");
        if (paymentIntent == null || customer == null) return Optional.empty();
        return Optional.of(new Source(kind, pointer.id(), pointer.chargeId(), paymentIntent, customer));
    }

    List<Invoice> invoices(Source source) {
        var invoiceIds = new LinkedHashSet<String>();
        for (var payment : stripe.docksPaidInvoicePayments(source.paymentIntent())) {
            var value = payment.path("payment");
            String invoice = id(payment.path("invoice"), "in_");
            if (invoice == null || !"invoice_payment".equals(payment.path("object").asText())
                    || !"paid".equals(payment.path("status").asText()) || !sameMode(payment)
                    || !"payment_intent".equals(value.path("type").asText())
                    || !source.paymentIntent().equals(id(value.path("payment_intent"), "pi_")))
                throw unexpected();
            invoiceIds.add(invoice);
        }
        var result = new java.util.ArrayList<Invoice>();
        for (String invoiceId : invoiceIds) {
            var invoice = stripe.invoice(invoiceId);
            if (!invoiceId.equals(id(invoice.path("id"), "in_")) || !"invoice".equals(invoice.path("object").asText())
                    || !sameMode(invoice) || !source.customer().equals(id(invoice.path("customer"), "cus_")))
                throw unexpected();
            var parent = invoice.path("parent");
            if (!"subscription_details".equals(parent.path("type").asText())) continue;
            var details = parent.path("subscription_details");
            String subscription = id(details.path("subscription"), "sub_");
            if (subscription == null) throw unexpected();
            result.add(new Invoice(invoiceId, subscription, details.path("metadata").path("docks_checkout_attempt").asText()));
        }
        return result;
    }

    Outcome outcome(Source source) {
        return switch (source.kind()) {
            case REFUND -> refund(source);
            case DISPUTE -> dispute(source);
            case FRAUD_WARNING -> warning(source);
        };
    }

    private Outcome refund(Source source) {
        var charge = charge(source.chargeId());
        if (!source.paymentIntent().equals(id(charge.path("payment_intent"), "pi_"))
                || !source.customer().equals(id(charge.path("customer"), "cus_"))
                || !charge.path("refunded").isBoolean() || !charge.path("amount_refunded").isIntegralNumber())
            throw unexpected();
        if (charge.path("refunded").asBoolean()) return new Outcome("fully_refunded", true);
        return new Outcome(charge.path("amount_refunded").asLong() > 0 ? "partially_refunded" : "not_refunded", false);
    }

    private Outcome dispute(Source source) {
        var dispute = stripe.dispute(source.id());
        validateRisk(dispute, "dispute", source);
        String status = dispute.path("status").asText();
        if (!status.matches("[a-z_]{1,32}")) throw unexpected();
        return new Outcome(status, !List.of("won", "warning_closed", "prevented").contains(status));
    }

    private Outcome warning(Source source) {
        var warning = stripe.docksFraudWarning(source.id());
        validateRisk(warning, "radar.early_fraud_warning", source);
        if (!warning.path("actionable").isBoolean()) throw unexpected();
        return warning.path("actionable").asBoolean() ? new Outcome("actionable", true) : new Outcome("closed", false);
    }

    private void validateRisk(JsonNode object, String type, Source source) {
        var paymentIntent = object.path("payment_intent");
        if (!source.id().equals(object.path("id").asText()) || !type.equals(object.path("object").asText())
                || !sameMode(object) || !source.chargeId().equals(id(object.path("charge"), "ch_"))
                || (!paymentIntent.isNull() && !paymentIntent.isMissingNode()
                    && !source.paymentIntent().equals(id(paymentIntent, "pi_")))) throw unexpected();
    }

    private JsonNode charge(String chargeId) {
        var charge = stripe.charge(chargeId);
        if (!chargeId.equals(id(charge.path("id"), "ch_")) || !"charge".equals(charge.path("object").asText())
                || !sameMode(charge)) throw unexpected();
        return charge;
    }

    private boolean sameMode(JsonNode object) {
        return object.path("livemode").isBoolean() && object.path("livemode").asBoolean() == stripe.liveMode();
    }

    private static String id(JsonNode node, String prefix) {
        String id = node.isObject() ? node.path("id").asText() : node.asText();
        return id.length() <= 100 && id.matches(prefix + "[A-Za-z0-9]+") ? id : null;
    }

    private static ResponseStatusException unexpected() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not verify the Stripe payment event.");
    }
}
