package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;

@Component
public class GoogleDocksProvider {
    private static final String ISSUER = "https://accounts.google.com";
    private static final String CALLBACK = "/api/docks/auth/google/callback";
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final ObjectMapper json;
    private final String clientId, secret, origin;
    private final NimbusJwtDecoder decoder;

    public record Identity(String subject, String email, boolean authoritativeEmail) {}

    GoogleDocksProvider(ObjectMapper json, @Value("${app.docks.google-client-id:}") String clientId,
            @Value("${app.docks.google-client-secret:}") String secret, @Value("${app.public-url}") String publicUrl) {
        this.json = json;
        this.clientId = clientId;
        this.secret = secret;
        this.origin = httpsOrigin(publicUrl);
        decoder = enabled() ? NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build() : null;
    }

    public boolean enabled() {
        return origin != null && clientId.matches("[A-Za-z0-9_-]{5,150}\\.apps\\.googleusercontent\\.com")
                && !secret.isBlank();
    }

    public boolean acceptsOrigin(String candidate) {
        return enabled() && origin.equals(candidate);
    }

    public URI authorise(String state, String nonce) {
        return URI.create(ISSUER + "/o/oauth2/v2/auth?client_id=" + encode(clientId)
                + "&redirect_uri=" + encode(origin + CALLBACK)
                + "&response_type=code&scope=openid%20email&prompt=select_account&state=" + encode(state)
                + "&nonce=" + encode(nonce));
    }

    public Optional<Identity> exchange(String code, String nonce) {
        if (!enabled() || code == null || !code.matches("[A-Za-z0-9_./-]{1,2048}")) return Optional.empty();
        String body = "grant_type=authorization_code&code=" + encode(code) + "&client_id=" + encode(clientId)
                + "&client_secret=" + encode(secret) + "&redirect_uri=" + encode(origin + CALLBACK);
        var request = HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/token"))
                .timeout(Duration.ofSeconds(12)).header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        try {
            var response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200 || response.body().length > 64 * 1024) return Optional.empty();
            String token = json.readTree(response.body()).path("id_token").asText();
            if (token.isEmpty() || token.length() > 16000) return Optional.empty();
            return verify(decoder.decode(token), clientId, nonce);
        } catch (IOException | JwtException | IllegalArgumentException rejected) {
            return Optional.empty();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        }
    }

    static Optional<Identity> verify(Jwt jwt, String clientId, String nonce) {
        String issuer = jwt.getClaimAsString("iss");
        String subject = jwt.getSubject();
        String azp = jwt.getClaimAsString("azp");
        var now = Instant.now();
        if ((!ISSUER.equals(issuer) && !"accounts.google.com".equals(issuer))
                || jwt.getAudience() == null || !jwt.getAudience().equals(java.util.List.of(clientId))
                || (azp != null && !clientId.equals(azp)) || !nonce.equals(jwt.getClaimAsString("nonce"))
                || jwt.getExpiresAt() == null || !jwt.getExpiresAt().isAfter(now)
                || jwt.getIssuedAt() == null || jwt.getIssuedAt().isAfter(now.plusSeconds(60))
                || subject == null || !subject.matches("[A-Za-z0-9_-]{1,255}")) return Optional.empty();

        String rawEmail = jwt.getClaimAsString("email");
        String email = rawEmail == null ? "" : DocksEmailSignIn.normaliseEmail(rawEmail);
        String hosted = jwt.getClaimAsString("hd");
        boolean authoritative = Boolean.TRUE.equals(jwt.getClaim("email_verified")) && email.length() <= 254
                && email.matches("[^@\\s]+@[^@\\s]+")
                && (email.endsWith("@gmail.com") || (hosted != null
                    && email.substring(email.lastIndexOf('@') + 1).equalsIgnoreCase(hosted)));
        return Optional.of(new Identity(subject, email, authoritative));
    }

    private static String httpsOrigin(String value) {
        try {
            URI uri = URI.create(value);
            if (!"https".equals(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getQuery() != null || uri.getFragment() != null
                    || !(uri.getPath().isEmpty() || "/".equals(uri.getPath()))) return null;
            return "https://" + uri.getHost() + (uri.getPort() == -1 || uri.getPort() == 443 ? "" : ":" + uri.getPort());
        } catch (IllegalArgumentException rejected) {
            return null;
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
