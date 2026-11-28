package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
class DocksStripeConfiguration {
    private static final String LIVE_API_VERSION = "2026-11-18.endive";

    @Bean
    StripeGateway docksStripeGateway(ObjectMapper json,
            @Value("${app.billing.enabled:false}") boolean websiteBillingEnabled,
            @Value("${app.billing.live-mode:false}") boolean live,
            @Value("${app.billing.stripe-secret:}") String apiKey,
            @Value("${app.docks.stripe-live-secret:}") String docksLiveKey,
            @Value("${app.docks.stripe-webhook-secret:}") String webhookSecret,
            @Value("${app.public-url:}") String publicUrl) {
        if (!docksLiveKey.isBlank()) {
            return new StripeGateway(json, false, true, docksLiveKey, webhookSecret, publicUrl, LIVE_API_VERSION);
        }
        return new StripeGateway(json, websiteBillingEnabled, live, apiKey, webhookSecret, publicUrl);
    }
}
