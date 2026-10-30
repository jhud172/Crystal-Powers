package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
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

    @Test void unsupportedKeysOrMissingWebhookAndUnsafeReturnOriginsStayDisconnected() {
        for (String key : List.of("pk_test_SyntheticLocalOnly", "sk_org_SyntheticLocalOnly", "rk_test_Synthetic-WithPunctuation", "rk_live_SyntheticLocalOnly", ""))
            assertThat(gateway(true, false, key, "whsec_SyntheticLocalOnly", "https://example.invalid").connected()).isFalse();
        assertThat(gateway(true, false, "rk_test_SyntheticLocalOnly", "", "http://127.0.0.1:18084").connected()).isFalse();
        assertThat(gateway(true, false, "rk_test_SyntheticLocalOnly", "whsec_SyntheticLocalOnly", "https://user@example.invalid").connected()).isFalse();
    }
}
