package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/** Server-only Stripe boundary. Callers must persist and authorise billing intents before using it. */
@Component
@Primary
public class StripeGateway {
    public static final String API_VERSION = "2026-09-30.endive";
    private static final String CLAIMABLE_SANDBOX_API_VERSION = "2026-11-18.endive";
    public record Checkout(String id, String url, long expiresAt) {}
    private final ObjectMapper json;
    private final boolean enabled, liveMode;
    private final String secret, webhookSecret, publicUrl;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    private final java.util.Set<java.io.InputStream> activeBodies=java.util.concurrent.ConcurrentHashMap.newKeySet();
    private final java.util.concurrent.ScheduledThreadPoolExecutor bodyDeadlines=new java.util.concurrent.ScheduledThreadPoolExecutor(1,runnable->{var thread=new Thread(runnable,"stripe-body-deadline");thread.setDaemon(true);return thread;});
    public StripeGateway(ObjectMapper json, @Value("${app.billing.enabled:false}") boolean enabled, @Value("${app.billing.live-mode:false}") boolean liveMode,
            @Value("${app.billing.stripe-secret:}") String secret, @Value("${app.billing.stripe-webhook-secret:}") String webhookSecret, @Value("${app.public-url:}") String publicUrl) {
        this.json = json; this.enabled = enabled; this.liveMode = liveMode; this.secret = secret; this.webhookSecret = webhookSecret; this.publicUrl = publicUrl.replaceAll("/+$", "");
        bodyDeadlines.setRemoveOnCancelPolicy(true);
    }
    public boolean configured() {
        return enabled && connected();
    }
    public boolean connected() {
        boolean standardKey = secret.matches(liveMode ? "(?:sk|rk)_live_[A-Za-z0-9]+" : "(?:sk|rk)_test_[A-Za-z0-9]+");
        return (standardKey || claimableSandboxKey()) && webhookSecret.matches("whsec_[A-Za-z0-9]+") && validPublicUrl();
    }

    private boolean claimableSandboxKey() {
        if (enabled || liveMode || !secret.matches("rkcs_test_[A-Za-z0-9]+")) return false;
        try {
            var origin = URI.create(publicUrl);
            return "http".equals(origin.getScheme())
                    && ("127.0.0.1".equals(origin.getHost()) || "localhost".equals(origin.getHost()));
        } catch (IllegalArgumentException invalid) { return false; }
    }

    private String apiVersion() { return claimableSandboxKey() ? CLAIMABLE_SANDBOX_API_VERSION : API_VERSION; }
    public void requireConnected() { if(!connected()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Stripe billing management is not configured. Contact the team for help with an existing payment or subscription."); }
    public boolean liveMode() { return liveMode; }
    public void requireConfigured() { if (!configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Payments are not configured. No charge or subscription has been created."); }
    private boolean validPublicUrl() {
        try {
            var url = URI.create(publicUrl);
            if (url.getHost() == null || url.getUserInfo() != null || url.getQuery() != null || url.getFragment() != null || !(url.getPath().isEmpty() || url.getPath().equals("/"))) return false;
            if ("https".equals(url.getScheme())) return true;
            return !liveMode && "http".equals(url.getScheme()) && (url.getHost().equals("localhost") || url.getHost().equals("127.0.0.1"));
        } catch (IllegalArgumentException invalid) { return false; }
    }
    /** Immutable persisted input and persisted attempt expiry/key are essential for safe retries. */
    public Checkout checkout(UUID bill, UUID attempt, long pence, String title, String customer, boolean monthly, long expiresAt) {
        requireConfigured();
        if (pence < 1 || pence > 99999999 || title == null || title.isBlank() || title.length() > 200 || customer == null || !customer.matches("cus_[A-Za-z0-9]+") || expiresAt < Instant.now().getEpochSecond() + 1800 || expiresAt > Instant.now().getEpochSecond() + 86400) throw new IllegalArgumentException("Invalid persisted checkout input");
        Map<String, String> data = new LinkedHashMap<>();
        data.put("mode", monthly ? "subscription" : "payment");
        data.put("payment_method_types[0]", "card");
        data.put("locale", "en-GB");
        data.put("adaptive_pricing[enabled]", "false");
        data.put("client_reference_id", bill.toString());
        data.put("metadata[billing_request_id]", bill.toString());
        data.put("metadata[checkout_attempt_id]", attempt.toString());
        data.put("customer", customer);
        data.put("line_items[0][quantity]", "1");
        data.put("line_items[0][price_data][currency]", "gbp");
        data.put("line_items[0][price_data][unit_amount]", Long.toString(pence));
        data.put("line_items[0][price_data][product_data][name]", title);
        data.put("expires_at", Long.toString(expiresAt));
        data.put("success_url", publicUrl + "/client/billing?checkout=returned");
        data.put("cancel_url", publicUrl + "/client/billing?checkout=cancelled");
        if (monthly) {
            data.put("line_items[0][price_data][recurring][interval]", "month");
            data.put("subscription_data[metadata][billing_request_id]", bill.toString());
        } else {
            data.put("payment_intent_data[metadata][billing_request_id]", bill.toString());
            data.put("invoice_creation[enabled]", "true");
            data.put("invoice_creation[invoice_data][metadata][billing_request_id]",bill.toString());
        }
        JsonNode response = post("/checkout/sessions", data, "cp-checkout-" + attempt);
        String id = response.path("id").asText(), url = response.path("url").asText();
        if (!id.matches("cs_(test_|live_)?[A-Za-z0-9]+") || !response.path("livemode").isBoolean() || response.path("livemode").asBoolean() != liveMode || !bill.toString().equals(response.path("client_reference_id").asText()) || !attempt.toString().equals(response.path("metadata").path("checkout_attempt_id").asText()) || !bill.toString().equals(response.path("metadata").path("billing_request_id").asText()) || !customer.equals(response.path("customer").asText()) || response.path("amount_total").asLong(-1)!=pence || !providerUrl(url, "checkout.stripe.com")) throw unavailable();
        return new Checkout(id, url, response.path("expires_at").asLong());
    }

    public Checkout docksCheckout(UUID account, UUID attempt, String priceId, long expiresAt) {
        requireConnected();
        if (!priceId.matches("price_[A-Za-z0-9]{1,94}"))
            throw new IllegalArgumentException("Docks checkout requires a Stripe price.");
        var response = post("/checkout/sessions", docksCheckoutFields(account, attempt, priceId, expiresAt),
                "cp-docks-checkout-" + attempt);
        String id = response.path("id").asText();
        String url = response.path("url").asText();
        if (!docksSessionId(id, liveMode) || !response.path("livemode").isBoolean()
                || response.path("livemode").asBoolean() != liveMode
                || !attempt.toString().equals(response.path("client_reference_id").asText())
                || !account.toString().equals(response.path("metadata").path("docks_account_id").asText())
                || response.path("expires_at").asLong(-1) != expiresAt || url.length() > 2048
                || !providerUrl(url, "checkout.stripe.com"))
            throw unavailable();
        return new Checkout(id, url, expiresAt);
    }

    static boolean docksSessionId(String id, boolean live) {
        return id.matches((live ? "cs_live_" : "cs_test_") + "[A-Za-z0-9]{1,90}");
    }

    void verifyDocksPrice(String priceId, DocksSubscriptions.Plan plan) {
        if (!priceId.matches("price_[A-Za-z0-9]{1,94}")) throw unavailable();
        var price = get("/prices/" + priceId);
        var recurring = price.path("recurring");
        if (!priceId.equals(price.path("id").asText()) || !"price".equals(price.path("object").asText())
                || !price.path("active").asBoolean() || !"gbp".equals(price.path("currency").asText())
                || !"per_unit".equals(price.path("billing_scheme").asText())
                || !price.path("unit_amount").isIntegralNumber() || price.path("unit_amount").asLong() <= 0
                || !plan.interval().equals(recurring.path("interval").asText())
                || recurring.path("interval_count").asInt() != 1 || !"licensed".equals(recurring.path("usage_type").asText()))
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "This Premium plan is not available.");
    }

    Map<String, String> docksCheckoutFields(UUID account, UUID attempt, String priceId, long expiresAt) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("mode", "subscription");
        fields.put("locale", "en-GB");
        fields.put("integration_identifier", "crystal-docks-premium-qmrvkxht");
        fields.put("line_items[0][price]", priceId);
        fields.put("line_items[0][quantity]", "1");
        fields.put("client_reference_id", attempt.toString());
        fields.put("metadata[docks_account_id]", account.toString());
        fields.put("subscription_data[metadata][docks_account_id]", account.toString());
        fields.put("subscription_data[metadata][docks_checkout_attempt]", attempt.toString());
        fields.put("expires_at", Long.toString(expiresAt));
        fields.put("success_url", publicUrl + "/docks/reports?checkout=returned");
        fields.put("cancel_url", publicUrl + "/docks/reports?checkout=cancelled");
        return fields;
    }
    /** Requires a verified client's stored customer ID; never accept customer IDs from the browser. */
    public String customerPortal(String storedCustomerId, UUID attempt) {
        requireConnected();
        if (storedCustomerId == null || !storedCustomerId.matches("cus_[A-Za-z0-9]+")) throw new IllegalArgumentException("Invalid stored customer");
        var response = post("/billing_portal/sessions", Map.of("customer", storedCustomerId, "return_url", publicUrl + "/client/billing"), "cp-portal-" + attempt);
        String url = response.path("url").asText();
        if (!providerUrl(url, "billing.stripe.com")) throw unavailable();
        return url;
    }

    String docksPortal(String customerId, String configuration) {
        requireConnected();
        if (!customerId.matches("cus_[A-Za-z0-9]{1,96}")
                || !configuration.matches("bpc_[A-Za-z0-9]{1,96}")) throw unavailable();
        var portal = post("/billing_portal/sessions", Map.of("customer", customerId, "configuration", configuration,
                "return_url", publicUrl + "/docks/reports"), "cp-docks-portal-" + UUID.randomUUID());
        String url = portal.path("url").asText();
        if (!"billing_portal.session".equals(portal.path("object").asText())
                || !portal.path("livemode").isBoolean() || portal.path("livemode").asBoolean() != liveMode
                || !customerId.equals(portal.path("customer").asText()) || !configuration.equals(portal.path("configuration").asText())
                || url.length() > 2048 || !providerUrl(url, "billing.stripe.com")) throw unavailable();
        return url;
    }
    public String createCustomer(UUID account,String email,String name) {
        requireConfigured();
        var response=post("/customers",Map.of("email",email,"name",name,"metadata[client_account_id]",account.toString()),"cp-customer-"+account+"-"+liveMode);
        String id=response.path("id").asText();
        if(!id.matches("cus_[A-Za-z0-9]+") || !response.path("livemode").isBoolean() || response.path("livemode").asBoolean()!=liveMode) throw unavailable();
        return id;
    }
    public JsonNode session(String id) { if(id==null || !id.matches("cs_(test_|live_)?[A-Za-z0-9]+")) throw invalidSignature(); return get("/checkout/sessions/"+id+"?expand%5B%5D=invoice"); }
    public JsonNode subscription(String id) { if(id==null || !id.matches("sub_[A-Za-z0-9]+")) throw invalidSignature(); return get("/subscriptions/"+id+"?expand%5B%5D=latest_invoice"); }
    public JsonNode invoice(String id) { if(id==null || !id.matches("in_[A-Za-z0-9]+")) throw invalidSignature(); return get("/invoices/"+id); }
    public JsonNode invoicePayments(String invoice,String after) {
        if(invoice==null || !invoice.matches("in_[A-Za-z0-9]+") || (after!=null && !after.matches("inpay_[A-Za-z0-9]+")))throw invalidSignature();
        var result=get("/invoice_payments?invoice="+invoice+"&limit=2"+(after==null ? "" : "&starting_after="+after),false);
        if(!"list".equals(result.path("object").asText()) || !result.path("data").isArray() || result.path("data").size()>2 || !result.path("has_more").isBoolean())throw unavailable();return result;
    }
    JsonNode docksPaidInvoicePayments(String paymentIntent) {
        if (!paymentIntent.matches("pi_[A-Za-z0-9]{1,96}")) throw invalidSignature();
        var payments = get("/invoice_payments?payment%5Btype%5D=payment_intent"
                + "&payment%5Bpayment_intent%5D=" + paymentIntent + "&status=paid&limit=10", false);
        if (!"list".equals(payments.path("object").asText()) || !payments.path("data").isArray()
                || payments.path("data").size() > 10 || !payments.path("has_more").isBoolean()
                || payments.path("has_more").asBoolean()) throw unavailable();
        return payments.path("data");
    }

    JsonNode docksFraudWarning(String id) {
        if (!id.matches("issfr_[A-Za-z0-9]{1,94}")) throw invalidSignature();
        return get("/radar/early_fraud_warnings/" + id);
    }
    public JsonNode paymentIntent(String id) { if(id==null || !id.matches("pi_[A-Za-z0-9]+"))throw invalidSignature();return get("/payment_intents/"+id); }
    public JsonNode charge(String id) { if(id==null || !id.matches("ch_[A-Za-z0-9]+"))throw invalidSignature();return get("/charges/"+id); }
    public JsonNode dispute(String id) { if(id==null || !id.matches("dp_[A-Za-z0-9]+"))throw invalidSignature();return get("/disputes/"+id); }
    // Refund objects have no livemode field. Their retrieved charge establishes the mode and ownership.
    public JsonNode refund(String id) { if(id==null || !id.matches("re_[A-Za-z0-9]+"))throw invalidSignature();var result=get("/refunds/"+id,false);if(!"refund".equals(result.path("object").asText()) || !id.equals(result.path("id").asText()))throw unavailable();return result; }
    public void expireSession(String id) { requireConnected(); if(id==null || !id.matches("cs_(test_|live_)?[A-Za-z0-9]+")) throw invalidSignature(); var result=post("/checkout/sessions/"+id+"/expire",Map.of(),"cp-expire-"+id); if(!result.path("status").asText().equals("expired") || !id.equals(result.path("id").asText()) || !result.path("livemode").isBoolean() || result.path("livemode").asBoolean()!=liveMode) throw unavailable(); }
    public String createRefund(RefundDraftService.ExecutionPlan plan) {
        requireConnected();if(plan.liveMode()!=liveMode || plan.amountPence()<1 || plan.amountPence()>99999999 || plan.lease()==null || plan.lease().leaseUntil()==null || !plan.lease().leaseUntil().isAfter(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC)) || plan.lease().firstSubmissionAt()==null || !plan.lease().firstSubmissionAt().isAfter(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusHours(23)))throw unavailable();
        var result=post("/refunds",Map.of("charge",plan.chargeId(),"amount",Long.toString(plan.amountPence()),"reason",plan.reason(),"metadata[crystal_refund_id]",plan.proposalId().toString()),"cp-refund-"+plan.proposalId());
        String id=result.path("id").asText();if(!id.matches("re_[A-Za-z0-9]+") || id.length()>100 || !"refund".equals(result.path("object").asText()) || !plan.chargeId().equals(BillingCheckoutStore.reference(result.path("charge"))) || !"gbp".equals(result.path("currency").asText()) || !result.path("amount").isIntegralNumber() || !result.path("amount").canConvertToLong() || result.path("amount").asLong()!=plan.amountPence() || !plan.reason().equals(result.path("reason").asText()) || !plan.proposalId().toString().equals(result.path("metadata").path("crystal_refund_id").asText()))throw unavailable();
        return id;
    }
    public String trustedReceiptUrl(JsonNode charge) { String url=charge.path("receipt_url").asText("");if(url.length()>2048 || !providerUrl(url,"pay.stripe.com") || !URI.create(url).getPath().startsWith("/receipts/"))return null;return url; }
    public String trustedInvoiceUrl(JsonNode invoice) { String url=invoice.path("hosted_invoice_url").asText(""); return providerUrl(url,"invoice.stripe.com") ? url : null; }
    public String trustedCheckoutUrl(JsonNode session) { String url=session.path("url").asText(""); return providerUrl(url,"checkout.stripe.com") ? url : null; }
    /** Validate the exact raw bytes before parsing. The caller must persist/deduplicate and reconcile events. */
    public JsonNode verifyEvent(byte[] body, String signature) {
        requireConnected();
        return verifyEvent(body, signature, webhookSecret);
    }

    public JsonNode verifyDocksEvent(byte[] body, String signature, String signingSecret) {
        requireConnected();
        if (!signingSecret.matches("whsec_[A-Za-z0-9]+")) throw invalidSignature();
        return verifyEvent(body, signature, signingSecret);
    }

    private JsonNode verifyEvent(byte[] body, String signature, String signingSecret) {
        if (body == null || body.length > 262144 || signature == null || signature.length() > 4096) throw invalidSignature();
        String timestamp = null;
        for (String field : signature.split(",")) {
            String part = field.strip();
            if (part.startsWith("t=")) { if (timestamp != null) throw invalidSignature(); timestamp = part.substring(2); }
        }
        try {
            if (timestamp == null || !timestamp.matches("[0-9]{1,12}") || Math.abs(Instant.now().getEpochSecond() - Long.parseLong(timestamp)) > 300) throw invalidSignature();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
            byte[] expected = mac.doFinal(body); boolean verified = false;
            for (String field : signature.split(",")) {
                String part = field.strip();
                if (part.matches("v1=[a-fA-F0-9]{64}")) verified |= MessageDigest.isEqual(expected, HexFormat.of().parseHex(part.substring(3)));
            }
            if (!verified) throw invalidSignature();
            JsonNode event = json.reader().with(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(body);
            if (event == null || !event.isObject() || !event.path("id").isTextual() || event.path("id").asText().length()>100 || !event.path("id").asText().matches("evt_[A-Za-z0-9]+") || !event.path("livemode").isBoolean() || event.path("livemode").asBoolean() != liveMode || !apiVersion().equals(event.path("api_version").asText())) throw invalidSignature();
            return event;
        } catch (ResponseStatusException expected) { throw expected; }
        catch (Exception invalid) { throw invalidSignature(); }
    }
    private JsonNode post(String path, Map<String, String> fields, String key) {
        try {
            String form = fields.entrySet().stream().map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue())).collect(java.util.stream.Collectors.joining("&"));
            var request = HttpRequest.newBuilder(URI.create("https://api.stripe.com/v1" + path)).timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + secret).header("Stripe-Version", apiVersion()).header("Idempotency-Key", key)
                    .header("Content-Type", "application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(form)).build();
            long deadline=System.nanoTime()+Duration.ofSeconds(20).toNanos();var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
            try (var input = response.body()) {
                byte[] bytes = readBody(input,deadline);
                if (response.statusCode() < 200 || response.statusCode() >= 300 || bytes.length > 1048576) throw unavailable();
                JsonNode result = json.readTree(bytes);
                if (result == null || !result.isObject()) throw unavailable();
                return result;
            }
        } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw unavailable(); }
        catch (Exception failure) { throw unavailable(); }
    }
    private JsonNode get(String path) {
        return get(path,true);
    }
    private JsonNode get(String path,boolean modeRequired) {
        requireConnected();
        try {
            var request=HttpRequest.newBuilder(URI.create("https://api.stripe.com/v1"+path)).timeout(Duration.ofSeconds(20)).header("Authorization","Bearer "+secret).header("Stripe-Version",apiVersion()).GET().build();
            long deadline=System.nanoTime()+Duration.ofSeconds(20).toNanos();var response=http.send(request,HttpResponse.BodyHandlers.ofInputStream());
            try(var input=response.body()) {
                byte[] bytes=readBody(input,deadline); if(response.statusCode()<200 || response.statusCode()>=300 || bytes.length>1048576) throw unavailable();
                var result=json.readTree(bytes); if(result==null || !result.isObject() || (modeRequired && (!result.path("livemode").isBoolean() || result.path("livemode").asBoolean()!=liveMode))) throw unavailable(); return result;
            }
        } catch(InterruptedException interrupted) { Thread.currentThread().interrupt(); throw unavailable(); }
        catch(Exception failure) { throw unavailable(); }
    }
    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8); }
    private byte[] readBody(java.io.InputStream input,long deadline) throws java.io.IOException {
        activeBodies.add(input);java.util.concurrent.ScheduledFuture<?> close=null;
        try {
            long remaining=deadline-System.nanoTime();if(remaining<=0)throw new java.net.http.HttpTimeoutException("Provider response deadline exceeded");
            close=bodyDeadlines.schedule(()->{try{input.close();}catch(java.io.IOException ignored){}},remaining,java.util.concurrent.TimeUnit.NANOSECONDS);
            byte[] bytes=input.readNBytes(1048577);if(System.nanoTime()>=deadline)throw new java.net.http.HttpTimeoutException("Provider response deadline exceeded");return bytes;
        } finally { if(close!=null)close.cancel(false);activeBodies.remove(input); }
    }
    @jakarta.annotation.PreDestroy public void stopBodyDeadlines() { for(var input:activeBodies){try{input.close();}catch(java.io.IOException ignored){}}bodyDeadlines.shutdownNow(); }
    private static boolean providerUrl(String value, String host) {
        try { var uri = URI.create(value); return "https".equals(uri.getScheme()) && host.equals(uri.getHost()) && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443); }
        catch (IllegalArgumentException invalid) { return false; }
    }
    private static ResponseStatusException invalidSignature() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "This payment event could not be verified."); }
    private static ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Stripe did not confirm this operation. Reload its status before trying again."); }
}
