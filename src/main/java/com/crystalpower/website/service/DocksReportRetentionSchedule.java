package com.crystalpower.website.service;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
public class DocksReportRetentionSchedule {
    private final DocksReports reports;
    private final DocksResearch research;
    private final DocksDiagnosticLogs logs;

    public DocksReportRetentionSchedule(DocksReports reports, DocksResearch research, DocksDiagnosticLogs logs) {
        this.reports = reports;
        this.research = research;
        this.logs = logs;
    }

    @Scheduled(fixedDelay = 300000, initialDelay = 60000)
    public void removeExpiredReports() {
        reports.purgeExpired();
        reports.purgeExpiredSupport();
        research.purgeExpired();
        logs.purgeExpired();
    }
}
