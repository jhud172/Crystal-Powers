package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class DocksBillingMode {
    private final StripeGateway stripe;
    private final boolean testEnabled;
    private final boolean testEntitlements;
    private final boolean liveEnabled;
    private final String webhook;

    public DocksBillingMode(StripeGateway stripe,
            @Value("${app.docks.stripe-test-enabled:false}") boolean testEnabled,
            @Value("${app.docks.stripe-test-entitlements:false}") boolean testEntitlements,
            @Value("${app.docks.stripe-live-enabled:false}") boolean liveEnabled,
            @Value("${app.docks.stripe-webhook-secret:}") String webhook) {
        this.stripe = stripe;
        this.testEnabled = testEnabled;
        this.testEntitlements = testEntitlements;
        this.liveEnabled = liveEnabled;
        this.webhook = webhook;
    }

    boolean live() { return stripe.liveMode(); }
    String webhook() { return webhook; }

    boolean enabled() {
        if (!stripe.connected()) return false;
        return live() ? liveEnabled && webhook.matches("whsec_[A-Za-z0-9]+") : testEnabled;
    }

    boolean seatsEnabled() { return enabled() && (live() || testEntitlements); }
}
