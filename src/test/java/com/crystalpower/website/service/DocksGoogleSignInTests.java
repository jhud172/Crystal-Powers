package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.support.TransactionTemplate;

class DocksGoogleSignInTests {
    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void browserAndWindowsCodesAreBoundSingleUseAndPreserveTheExistingAccount(boolean staging) {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScripts("classpath:db/migration/V87__docks_accounts_and_devices.sql",
                        "classpath:db/migration/V88__docks_email_sign_in.sql",
                        "classpath:db/migration/V106__docks_account_deletion.sql",
                        "classpath:db/migration/V99__docks_google_sign_in.sql",
                        "classpath:db/migration/V111__docks_browser_sessions.sql").build();
        try {
            var db = new JdbcTemplate(database);
            var tx = new TransactionTemplate(new DataSourceTransactionManager(database));
            var environment = new MockEnvironment().withProperty("DOCKS_PILOT_ALLOWED_EMAILS", "owner@gmail.com");
            if (staging) environment.setActiveProfiles("docks-pilot");
            var accounts = new DocksEmailSignIn(db, tx, mock(EmailTransport.class), true, new DocksPilotAccess(environment), mock(com.crystalpower.website.security.SecretVault.class));
            var provider = mock(GoogleDocksProvider.class);
            when(provider.enabled()).thenReturn(true);
            when(provider.authorise(anyString(), anyString())).thenAnswer(call ->
                    URI.create("https://accounts.google.com/?state=" + call.getArgument(0)));
            when(provider.exchange(eq("fixture-code"), anyString()))
                    .thenReturn(Optional.of(new GoogleDocksProvider.Identity("fixture-subject", "owner@gmail.com", true)));
            var google = new DocksGoogleSignIn(db, tx, accounts, provider);
            UUID account = UUID.randomUUID();
            db.update("INSERT INTO docks_account(id, display_name) VALUES (?, 'Fixture')", account);
            db.update("INSERT INTO docks_identity(issuer, subject, account_id) VALUES (?, 'owner@gmail.com', ?)",
                    DocksEmailSignIn.ISSUER, account);

            var start = google.start();
            String state = start.authorisation().getQuery().substring("state=".length());
            assertTrue(google.complete(state, DocksEmailSignIn.randomToken(), "fixture-code").isEmpty());
            verify(provider, never()).exchange(anyString(), anyString());
            var ticket = google.complete(state, start.browserToken(), "fixture-code").orElseThrow();
            assertTrue(google.complete(state, start.browserToken(), "fixture-code").isEmpty());
            assertTrue(google.exchangeDesktop(ticket).isEmpty());
            var session = google.exchange(ticket).orElseThrow();
            assertEquals(account, session.accountId());
            assertEquals(Optional.of(account), accounts.account("Bearer " + session.accessToken()));
            assertTrue(google.exchange(ticket).isEmpty());
            if (staging) {
                when(provider.exchange(eq("outside"), anyString())).thenReturn(Optional.of(
                        new GoogleDocksProvider.Identity("outside-subject", "outside@gmail.com", true)));
                when(provider.exchange(eq("unproven"), anyString())).thenReturn(Optional.of(
                        new GoogleDocksProvider.Identity("unproven-subject", "owner@gmail.com", false)));
                for (String rejected : List.of("outside", "unproven")) {
                    var challenge = google.start();
                    String challengeState = challenge.authorisation().getQuery().substring("state=".length());
                    assertTrue(google.complete(challengeState, challenge.browserToken(), rejected).isEmpty());
                }
                assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM docks_account", Integer.class));
            }

            var superseded = google.desktopCode(account);
            var code = google.desktopCode(account);
            assertTrue(google.exchangeDesktop(superseded).isEmpty());
            assertTrue(google.exchange(code).isEmpty());
            assertEquals(account, google.exchangeDesktop(code).orElseThrow().accountId());
            assertTrue(google.exchangeDesktop(code).isEmpty());
            String expired = google.desktopCode(account);
            db.update("UPDATE docks_google_ticket SET expires_at = ? WHERE account_id = ?",
                    java.time.OffsetDateTime.now().minusSeconds(1), account);
            assertTrue(google.exchangeDesktop(expired).isEmpty());

            UUID nonauthoritative = accounts.googleIdentity(
                    new GoogleDocksProvider.Identity("other-google-id", "owner@gmail.com", false));
            assertNotEquals(account, nonauthoritative);
            assertEquals(nonauthoritative, accounts.googleIdentity(
                    new GoogleDocksProvider.Identity("other-google-id", "changed@example.org", false)));
        } finally {
            database.shutdown();
        }
    }

    @Test
    void providerRejectsIncorrectClaimsAndDoesNotTrustThirdPartyEmailOwnership() {
        assertTrue(GoogleDocksProvider.verify(token("https://accounts.google.com", "client", "nonce", "owner@gmail.com"),
                "client", "nonce").orElseThrow().authoritativeEmail());
        assertFalse(GoogleDocksProvider.verify(token("https://accounts.google.com", "client", "nonce", "owner@example.org"),
                "client", "nonce").orElseThrow().authoritativeEmail());
        assertTrue(GoogleDocksProvider.verify(token("https://accounts.google.com", "wrong", "nonce", "owner@gmail.com"),
                "client", "nonce").isEmpty());
        assertTrue(GoogleDocksProvider.verify(token("https://accounts.google.com", "client", "nonce", "owner@gmail.com"),
                "client", "wrong").isEmpty());
        assertTrue(GoogleDocksProvider.verify(token("https://example.com", "client", "nonce", "owner@gmail.com"),
                "client", "nonce").isEmpty());
    }

    private static Jwt token(String issuer, String audience, String nonce, String email) {
        return Jwt.withTokenValue("fixture").header("alg", "RS256").subject("subject")
                .issuer(issuer).audience(List.of(audience)).claim("nonce", nonce).claim("email", email)
                .claim("email_verified", true).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
    }
}
