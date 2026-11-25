package com.crystalpower.website.service;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class DocksReportRetentionSchedule {
    private final DocksReports reports;

    public DocksReportRetentionSchedule(DocksReports reports) {
        this.reports = reports;
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 60000)
    public void removeExpiredReports() {
        reports.purgeExpired();
        reports.purgeExpiredSupport();
    }
}
