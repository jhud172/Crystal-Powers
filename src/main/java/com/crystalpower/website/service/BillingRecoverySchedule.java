package com.crystalpower.website.service;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
@ConditionalOnProperty(name="app.billing.event-recovery-enabled",havingValue="true")
public class BillingRecoverySchedule {
    private final BillingEventRecoveryService recovery;
    public BillingRecoverySchedule(BillingEventRecoveryService recovery) { this.recovery=recovery; }
    @Scheduled(fixedDelay=60000,initialDelay=60000)
    public void retryPending() { recovery.recoverDue(); }
}
