package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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

    @Test void dedicatedLiveDocksConnectionKeepsWebsiteBillingAndPublicCheckoutOff() {
        new ApplicationContextRunner()
                .withBean(ObjectMapper.class, ObjectMapper::new)
                .withUserConfiguration(StripeGateway.class, DocksStripeConfiguration.class, DocksBillingMode.class)
                .withPropertyValues("app.public-url=https://example.invalid", "app.billing.enabled=false",
                        "app.docks.stripe-live-enabled=true", "app.docks.stripe-live-checkout-enabled=false",
                        "app.docks.stripe-live-secret=rk_live_SyntheticLocalOnly",
                        "app.docks.stripe-webhook-secret=whsec_SyntheticDocksOnly")
                .run(context -> {
                    assertThat(context.getBean(StripeGateway.class).connected()).isFalse();
                    var docks = context.getBean("docksStripeGateway", StripeGateway.class);
                    assertThat(docks.connected()).isTrue();
                    assertThat(docks.liveMode()).isTrue();
                    var mode = context.getBean(DocksBillingMode.class);
                    assertThat(mode.seatsEnabled()).isTrue();
                    assertThat(mode.checkoutEnabled()).isFalse();
                    byte[] currentEvent = liveWebhookBody("2026-11-18.endive");
                    byte[] otherVersionEvent = liveWebhookBody("2026-09-30.endive");
                    String signingSecret = "whsec_SyntheticDocksOnly";
                    assertThat(docks.verifyDocksEvent(currentEvent, sign(currentEvent, signingSecret), signingSecret)
                            .path("id").asText()).isEqualTo("evt_DocksFixture");
                    String otherVersionSignature = sign(otherVersionEvent, signingSecret);
                    assertThatThrownBy(() -> docks.verifyDocksEvent(otherVersionEvent, otherVersionSignature, signingSecret))
                            .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
                });
    }

    private static byte[] liveWebhookBody(String version) {
        return """
                {"id":"evt_DocksFixture","livemode":true,"api_version":"%s"}
                """.formatted(version).getBytes(StandardCharsets.UTF_8);
    }

    private static String sign(byte[] body, String secret) throws GeneralSecurityException {
        long timestamp = Instant.now().getEpochSecond();
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
        return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(mac.doFinal(body));
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

    @Test void liveDocksPricesMustMatchTheApprovedAmountsAndIntervals() throws Exception {
        var expected = Map.of(DocksSubscriptions.Plan.SINGLE_MONTHLY, 1299,
                DocksSubscriptions.Plan.SINGLE_ANNUAL, 9999, DocksSubscriptions.Plan.HOUSEHOLD_MONTHLY, 2499,
                DocksSubscriptions.Plan.HOUSEHOLD_ANNUAL, 17999);
        var json = new ObjectMapper();
        for (var entry : expected.entrySet()) {
            var plan = entry.getKey();
            var price = json.createObjectNode()
                    .put("id", "price_Fixture").put("object", "price").put("livemode", true)
                    .put("active", true).put("currency", "gbp").put("billing_scheme", "per_unit")
                    .put("unit_amount", entry.getValue());
            price.putObject("recurring").put("interval", plan.name().endsWith("ANNUAL") ? "year" : "month")
                    .put("interval_count", 1).put("usage_type", "licensed");
            assertThat(StripeGateway.matchesDocksLivePrice(price, "price_Fixture", plan)).isTrue();
            assertThat(StripeGateway.matchesDocksLivePrice(price.deepCopy().put("unit_amount", 100),
                    "price_Fixture", plan)).isFalse();
            assertThat(StripeGateway.matchesDocksLivePrice(price.deepCopy().put("livemode", false),
                    "price_Fixture", plan)).isFalse();
        }
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
