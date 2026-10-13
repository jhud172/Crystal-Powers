package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingInvoiceRepository;
import org.springframework.stereotype.Service;

@Service
public class BillingInvoiceRecovery {
    private final BillingInvoiceRepository invoices;
    private final BillingInvoiceService service;
    private final BillingInvoiceStore store;
    private final StripeGateway stripe;
    public BillingInvoiceRecovery(BillingInvoiceRepository invoices,BillingInvoiceService service,BillingInvoiceStore store,StripeGateway stripe) { this.invoices=invoices;this.service=service;this.store=store;this.stripe=stripe; }
    public void recoverDue() {
        if(!stripe.connected())return;
        for(var job:invoices.due(stripe.liveMode())) {
            try { service.continueSystem(job.invoiceId(),job.billId(),job.version()); }
            catch(RuntimeException failure) {
                // A committed failure changes the version; this only backs off failures before a lease was created.
                try { store.failedWorkerStart(job); } catch(RuntimeException ignored) { /* Next pass still uses fresh persisted state. */ }
            }
        }
    }
}
