package com.crystalpower.website.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name="app.billing.invoice-recovery-enabled",havingValue="true")
public class BillingInvoiceSchedule {
    private final BillingInvoiceRecovery recovery;
    public BillingInvoiceSchedule(BillingInvoiceRecovery recovery) { this.recovery=recovery; }
    @Scheduled(fixedDelay=60000,initialDelay=60000)
    public void recoverInvoices() { recovery.recoverDue(); }
}
