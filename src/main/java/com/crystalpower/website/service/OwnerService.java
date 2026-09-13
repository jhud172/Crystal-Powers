package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.OwnerRepository.Owner;
import com.crystalpower.website.security.OwnerPrincipal;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.security.TotpService;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class OwnerService {
    private final OwnerRepository owners;
    private final PasswordEncoder passwords;
    private final SecretVault vault;
    private final TotpService totp;
    private final String setupToken;
    private final String dummyHash;
    private final SecureRandom random = new SecureRandom();

    public OwnerService(OwnerRepository owners, PasswordEncoder passwords, SecretVault vault, TotpService totp,
            @Value("${app.owner.setup-token:}") String setupToken) {
        this.owners = owners; this.passwords = passwords; this.vault = vault; this.totp = totp; this.setupToken = setupToken;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }
    public record Verification(OwnerPrincipal principal, List<String> recoveryCodes) {}
    public boolean setupAvailable() { return setupToken.length() >= 32 && !owners.exists(); }

    @Transactional
    public Owner setup(String token, String email, String password) {
        if (!setupAvailable() || !MessageDigest.isEqual(setupToken.getBytes(StandardCharsets.UTF_8), token.getBytes(StandardCharsets.UTF_8))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner setup is unavailable or the setup token is invalid.");
        }
        validatePassword(password);
        Owner owner = owners.create(normaliseEmail(email), passwords.encode(password), vault.encrypt(totp.createSecret()));
        owners.audit(owner.id(), "OWNER_CREATED");
        return owner;
    }

    public Owner password(String email, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            passwords.matches("invalid", dummyHash);
            throw unauthorised();
        }
        Owner owner = owners.byEmail(normaliseEmail(email)).orElse(null);
        boolean valid = passwords.matches(password, owner == null ? dummyHash : owner.passwordHash());
        if (!valid || owner == null) throw unauthorised();
        return owner;
    }
    public Owner owner(UUID id) { return owners.byId(id).orElseThrow(OwnerService::unauthorised); }
    public String enrolmentSecret(UUID id) {
        Owner owner = owner(id);
        if (owner.mfaEnabled()) throw new ResponseStatusException(HttpStatus.CONFLICT, "An authenticator is already enrolled.");
        return vault.decrypt(owner.encryptedTotp());
    }

    @Transactional
    public Verification verify(UUID id, int credentialsVersion, String code) {
        Owner owner = owners.lock(id).orElseThrow(OwnerService::unauthorised);
        if (owner.credentialsVersion() != credentialsVersion) throw unauthorised();
        var acceptedStep = totp.verify(vault.decrypt(owner.encryptedTotp()), code, owner.lastTotpStep(), Instant.now());
        boolean recovery = false;
        if (acceptedStep.isEmpty() && owner.mfaEnabled()) {
            recovery = owners.useRecovery(id, DigestUtils.sha256Hex(code.trim().toLowerCase(Locale.ROOT)));
        }
        if (acceptedStep.isEmpty() && !recovery) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "That code is invalid or has already been used.");
        List<String> codes = new ArrayList<>();
        if (acceptedStep.isPresent()) owners.acceptTotp(id, acceptedStep.getAsLong());
        if (!owner.mfaEnabled()) {
            codes.addAll(newRecoveryCodes(id));
        }
        owners.audit(id, recovery ? "OWNER_RECOVERY_LOGIN" : "OWNER_MFA_LOGIN");
        return new Verification(new OwnerPrincipal(id, owner.email(), owner.credentialsVersion()), List.copyOf(codes));
    }

    public boolean valid(OwnerPrincipal principal) {
        return owners.byId(principal.id()).filter(owner -> owner.mfaEnabled() && owner.credentialsVersion() == principal.credentialsVersion()).isPresent();
    }
    public List<String> newRecoveryCodes(UUID id) {
        List<String> codes = new ArrayList<>();
        owners.clearRecovery(id);
        for (int i = 0; i < 10; i++) {
            byte[] bytes = new byte[16]; random.nextBytes(bytes);
            String generated = HexFormat.of().formatHex(bytes);
            owners.addRecovery(id, DigestUtils.sha256Hex(generated)); codes.add(generated);
        }
        return List.copyOf(codes);
    }

    public static String normaliseEmail(String value) { return value.trim().toLowerCase(Locale.ROOT); }
    public static void validatePassword(String password) {
        int bytes = password.getBytes(StandardCharsets.UTF_8).length;
        if (password.length() < 12 || bytes > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use at least 12 characters and no more than 72 UTF-8 bytes for your password.");
    }
    private static ResponseStatusException unauthorised() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "The sign-in details are invalid or the session has expired."); }
}
