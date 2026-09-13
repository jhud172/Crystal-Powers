package com.crystalpower.website;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.service.EmailTransport;
import com.crystalpower.website.service.OwnerRecoveryService;
import com.crystalpower.website.service.OwnerService;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = "app.owner.setup-token=synthetic-test-only-setup-token-0000000000")
class OwnerRecoveryTests {
    @Autowired OwnerService owners;
    @Autowired OwnerRepository accounts;
    @Autowired OwnerRecoveryService recovery;
    @Autowired com.crystalpower.website.service.OwnerAccountService settings;
    @Autowired SecretVault vault;
    @Autowired JdbcTemplate database;
    @MockitoBean EmailTransport email;
    @BeforeEach void clearSyntheticAccounts() {
        for (String table : List.of("admin_audit", "password_reset", "recovery_code", "admin_account")) database.update("DELETE FROM " + table);
    }
    @Test void passwordResetRequiresASecondFactorIsSingleUseAndInvalidatesOldSessions() throws Exception {
        var account = owners.setup("synthetic-test-only-setup-token-0000000000", "reset@example.invalid", "Synthetic-initial-password");
        var generator = new TimeBasedOneTimePasswordGenerator();
        String code = generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(vault.decrypt(account.encryptedTotp())), generator.getAlgorithm()), Instant.now());
        var enrolled = owners.verify(account.id(), account.credentialsVersion(), code);
        recovery.request(account.email());
        var sent = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(email).send(sent.capture());
        assertThat(sent.getValue().to()).isEqualTo("reset@example.invalid");
        var matcher = java.util.regex.Pattern.compile("/admin/reset#([a-f0-9]{64})").matcher(sent.getValue().html());
        assertThat(matcher.find()).isTrue(); String token = matcher.group(1);
        assertThat(database.queryForObject("SELECT token_hash FROM password_reset", String.class)).isNotEqualTo(token);
        assertThatThrownBy(() -> recovery.reset(token, "Synthetic-new-password-2026", "bad-code")).isInstanceOf(ResponseStatusException.class);
        assertThat(owners.valid(enrolled.principal())).isTrue();
        recovery.reset(token, "Synthetic-new-password-2026", enrolled.recoveryCodes().get(0));
        assertThat(owners.valid(enrolled.principal())).isFalse();
        assertThatThrownBy(() -> owners.password(account.email(), "Synthetic-initial-password")).isInstanceOf(ResponseStatusException.class);
        assertThat(owners.password(account.email(), "Synthetic-new-password-2026").mfaEnabled()).isTrue();
        assertThatThrownBy(() -> recovery.reset(token, "Another-synthetic-password", enrolled.recoveryCodes().get(1))).isInstanceOf(ResponseStatusException.class);
        recovery.request("unknown@example.invalid");
        verifyNoMoreInteractions(email);
    }
    @Test void expiredResetTokensCannotChangePasswords() throws Exception {
        var account = owners.setup("synthetic-test-only-setup-token-0000000000", "expired@example.invalid", "Synthetic-initial-password");
        String token = "a".repeat(64);
        database.update("INSERT INTO password_reset (token_hash, account_id, expires_at) VALUES (?, ?, ?)", org.apache.commons.codec.digest.DigestUtils.sha256Hex(token), account.id(), java.sql.Timestamp.from(Instant.now().minusSeconds(10)));
        assertThatThrownBy(() -> recovery.reset(token, "Synthetic-new-password-2026", "000000")).isInstanceOf(ResponseStatusException.class);
        assertThat(owners.password(account.email(), "Synthetic-initial-password").id()).isEqualTo(account.id());
    }
    @Test void authenticatorReplacementKeepsTheOldDeviceUntilConfirmedAndInvalidatesOldRecoveryCodes() throws Exception {
        var account = owners.setup("synthetic-test-only-setup-token-0000000000", "mfa-change@example.invalid", "Synthetic-initial-password");
        var generator = new TimeBasedOneTimePasswordGenerator();
        String initialSecret = vault.decrypt(account.encryptedTotp());
        String initialCode = generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(initialSecret), generator.getAlgorithm()), Instant.now());
        var enrolled = owners.verify(account.id(), account.credentialsVersion(), initialCode);
        String nextSecret = settings.beginAuthenticator(enrolled.principal(), "Synthetic-initial-password", enrolled.recoveryCodes().get(0));
        assertThat(vault.decrypt(accounts.byId(account.id()).orElseThrow().encryptedTotp())).isEqualTo(initialSecret);
        assertThatThrownBy(() -> settings.confirmAuthenticator(enrolled.principal(), nextSecret, "wrong")).isInstanceOf(ResponseStatusException.class);
        String nextCode = generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(nextSecret), generator.getAlgorithm()), Instant.now());
        var nextCodes = settings.confirmAuthenticator(enrolled.principal(), nextSecret, nextCode);
        assertThat(nextCodes).hasSize(10).doesNotContainAnyElementsOf(enrolled.recoveryCodes());
        assertThat(owners.valid(enrolled.principal())).isFalse();
        var updated = accounts.byId(account.id()).orElseThrow();
        assertThat(vault.decrypt(updated.encryptedTotp())).isEqualTo(nextSecret);
        assertThatThrownBy(() -> owners.verify(account.id(), updated.credentialsVersion(), enrolled.recoveryCodes().get(1))).isInstanceOf(ResponseStatusException.class);
        assertThat(owners.verify(account.id(), updated.credentialsVersion(), nextCodes.get(0)).principal().id()).isEqualTo(account.id());
    }
}
