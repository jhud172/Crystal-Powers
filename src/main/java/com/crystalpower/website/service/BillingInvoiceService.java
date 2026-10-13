package com.crystalpower.website.service;

import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

@Service
public class BillingInvoiceService {
    private final BillingInvoiceStore store;
    private final StripeGateway stripe;
    public BillingInvoiceService(BillingInvoiceStore store,StripeGateway stripe) { this.store=store;this.stripe=stripe; }
    public Object continuePage(Authentication auth,UUID request,UUID bill,String invoice,int version) {
        var lease=store.begin(auth,request,bill,invoice,version);
        try {
            var current=stripe.invoice(invoice);
            if(!invoice.equals(BillingCheckoutStore.reference(current)) || !lease.customer().equals(BillingCheckoutStore.reference(current.path("customer"))) || lease.subscription()==null || !lease.subscription().equals(BillingCheckoutStore.reference(current.path("parent").path("subscription_details").path("subscription"))) || !"gbp".equals(current.path("currency").asText()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Invoice ownership could not be verified.");
            return store.finish(auth,request,lease,stripe.invoicePayments(invoice,lease.cursor()));
        } catch(RuntimeException failure) { store.fail(lease);throw failure; }
    }
    public void continueSystem(String invoice,UUID bill,int version) {
        var lease=store.beginSystem(invoice,bill,version);
        try {
            var current=stripe.invoice(invoice);
            if(!invoice.equals(BillingCheckoutStore.reference(current)) || !lease.customer().equals(BillingCheckoutStore.reference(current.path("customer"))) || lease.subscription()==null || !lease.subscription().equals(BillingCheckoutStore.reference(current.path("parent").path("subscription_details").path("subscription"))) || !"gbp".equals(current.path("currency").asText()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Invoice ownership could not be verified.");
            store.finishSystem(lease,stripe.invoicePayments(invoice,lease.cursor()));
        } catch(RuntimeException failure) { store.fail(lease);throw failure; }
    }
}
