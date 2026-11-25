package com.crystalpower.website.api;

import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksGoogleSignIn;
import com.crystalpower.website.service.DocksOnlineExplanation;
import com.crystalpower.website.service.DocksSubscriptions;
import com.crystalpower.website.service.DocksWindowsRelease;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class OwnerDocksConfigurationController {
    public record Configuration(boolean emailSignIn, boolean googleSignIn, boolean testBilling,
                                 int checkoutPlans, boolean subscriptionPortal, boolean onlineExplanations,
                                 String windowsVersion, DocksOnlineExplanation.BudgetStatus onlineAiBudget) {}

    private final DocksEmailSignIn email;
    private final DocksGoogleSignIn google;
    private final DocksSubscriptions billing;
    private final DocksOnlineExplanation explanations;
    private final DocksWindowsRelease releases;

    public OwnerDocksConfigurationController(DocksEmailSignIn email, DocksGoogleSignIn google,
            DocksSubscriptions billing, DocksOnlineExplanation explanations, DocksWindowsRelease releases) {
        this.email = email;
        this.google = google;
        this.billing = billing;
        this.explanations = explanations;
        this.releases = releases;
    }

    @GetMapping("/api/admin/docks/configuration")
    public ResponseEntity<Configuration> view() {
        String version = releases.current().map(DocksWindowsRelease.Release::version).orElse(null);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new Configuration(
                email.available(), google.enabled(), billing.testMode(), billing.availablePlans().size(),
                billing.portalConfigured(), explanations.available(), version, explanations.budgetStatus()));
    }
}
