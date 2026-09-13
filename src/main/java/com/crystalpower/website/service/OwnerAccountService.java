package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.RecoveryRepository;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.security.TotpService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;

@Service
public class OwnerAccountService {
    private final OwnerService auth;
    private final OwnerRepository owners;
    private final RecoveryRepository recovery;
    private final PasswordEncoder passwords;
    private final TotpService totp;
    private final SecretVault vault;
    public OwnerAccountService(OwnerService auth, OwnerRepository owners, RecoveryRepository recovery, PasswordEncoder passwords, TotpService totp, SecretVault vault) {
        this.auth = auth; this.owners = owners; this.recovery = recovery; this.passwords = passwords; this.totp = totp; this.vault = vault;
    }
    @Transactional
    public void changePassword(OwnerPrincipal owner, String password, String code, String next) {
        OwnerService.validatePassword(next); reauthenticate(owner, password, code);
        recovery.changePassword(owner.id(), passwords.encode(next)); recovery.invalidateResets(owner.id());
        owners.audit(owner.id(), "OWNER_PASSWORD_CHANGED");
    }
    @Transactional
    public List<String> replaceRecoveryCodes(OwnerPrincipal owner, String password, String code) {
        reauthenticate(owner, password, code); owners.invalidateSessions(owner.id()); recovery.invalidateResets(owner.id());
        owners.audit(owner.id(), "OWNER_RECOVERY_CODES_REPLACED");
        return auth.newRecoveryCodes(owner.id());
    }
    @Transactional
    public String beginAuthenticator(OwnerPrincipal owner, String password, String code) {
        reauthenticate(owner, password, code);
        return totp.createSecret();
    }
    @Transactional
    public List<String> confirmAuthenticator(OwnerPrincipal principal, String secret, String code) {
        var owner = owners.lock(principal.id()).orElseThrow(OwnerAccountService::invalid);
        if (owner.credentialsVersion() != principal.credentialsVersion()) throw invalid();
        long step = totp.verify(secret, code, -1, Instant.now()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Enter a fresh code from the new authenticator."));
        owners.replaceAuthenticator(owner.id(), vault.encrypt(secret), step); recovery.invalidateResets(owner.id());
        owners.audit(owner.id(), "OWNER_AUTHENTICATOR_REPLACED");
        return auth.newRecoveryCodes(owner.id());
    }
    private void reauthenticate(OwnerPrincipal owner, String password, String code) {
        var checked = auth.password(owner.email(), password);
        if (!checked.id().equals(owner.id()) || checked.credentialsVersion() != owner.credentialsVersion()) throw invalid();
        auth.verify(owner.id(), owner.credentialsVersion(), code.trim());
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again before changing account security."); }
}
