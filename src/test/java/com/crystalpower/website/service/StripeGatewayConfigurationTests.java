package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.assertThat;

/** Synthetic key shapes only; no Stripe request or real credential is used. */
class StripeGatewayConfigurationTests {
    private final List<StripeGateway> gateways = new ArrayList<>();
    private StripeGateway gateway(boolean enabled, boolean live, String key, String signing, String url) {
        var result = new StripeGateway(new ObjectMapper(), enabled, live, key, signing, url);
        gateways.add(result);
        return result;
    }
    @AfterEach void close() { gateways.forEach(StripeGateway::stopBodyDeadlines); }

    @Test void docksUsesItsOwnWebhookWithoutConnectingWebsiteBilling() {
        new ApplicationContextRunner()
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withUserConfiguration(StripeGateway.class, DocksStripeConfiguration.class, DocksBillingMode.class)
                .withPropertyValues("app.public-url=https://pilot.example.invalid", "app.billing.enabled=false",
                        "app.billing.stripe-secret=rk_test_SyntheticLocalOnly",
                        "app.docks.stripe-test-enabled=true", "app.docks.stripe-test-entitlements=true",
                        "app.docks.stripe-webhook-secret=whsec_SyntheticDocksOnly")
                .run(context -> {
                    assertThat(context.getBean(StripeGateway.class).connected()).isFalse();
                    assertThat(context.getBean("docksStripeGateway", StripeGateway.class).connected()).isTrue();
                    assertThat(context.getBean(DocksBillingMode.class).seatsEnabled()).isTrue();
                });
    }

    @Test void sandboxRestrictedKeysSupportPaymentsAndReadOnlyManagementConfiguration() {
        for (String key : List.of("sk_test_SyntheticLocalOnly", "rk_test_SyntheticLocalOnly")) {
            assertThat(gateway(true, false, key, "whsec_SyntheticLocalOnly", "http://127.0.0.1:18084").configured()).isTrue();
            var paused = gateway(false, false, key, "whsec_SyntheticLocalOnly", "http://127.0.0.1:18084");
            assertThat(paused.connected()).isTrue();
            assertThat(paused.configured()).isFalse();
        }
    }

    @Test void liveRestrictedKeyStillRequiresLiveOptInAndHttps() {
        assertThat(gateway(true, true, "rk_live_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "https://example.invalid").configured()).isTrue();
        assertThat(gateway(true, true, "rk_live_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "http://127.0.0.1:18084").connected()).isFalse();
        assertThat(gateway(true, false, "rk_live_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "https://example.invalid").connected()).isFalse();
        assertThat(gateway(true, true, "rk_test_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "https://example.invalid").connected()).isFalse();
    }

    @Test void claimableSandboxKeyIsLimitedToLoopbackWithWebsiteBillingDisabled() {
        String key = "rkcs_test_SyntheticLocalOnly";
        String secret = "whsec_SyntheticLocalOnly";
        var local = gateway(false, false, key, secret, "http://127.0.0.1:18085");
        assertThat(local.connected()).isTrue();
        assertThat(local.configured()).isFalse();
        assertThat(gateway(true, false, key, secret, "http://127.0.0.1:18085").connected()).isFalse();
        assertThat(gateway(false, true, key, secret, "http://127.0.0.1:18085").connected()).isFalse();
        assertThat(gateway(false, false, key, secret, "https://example.invalid").connected()).isFalse();
    }

    @Test void unsupportedKeysOrMissingWebhookAndUnsafeReturnOriginsStayDisconnected() {
        for (String key : List.of("pk_test_SyntheticLocalOnly", "sk_org_SyntheticLocalOnly", "rk_test_Synthetic-WithPunctuation", "rk_live_SyntheticLocalOnly", ""))
            assertThat(gateway(true, false, key, "whsec_SyntheticLocalOnly", "https://example.invalid").connected()).isFalse();
        assertThat(gateway(true, false, "rk_test_SyntheticLocalOnly", "", "http://127.0.0.1:18084").connected()).isFalse();
        assertThat(gateway(true, false, "rk_test_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "https://user@example.invalid").connected()).isFalse();
    }
}
