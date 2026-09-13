package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.RecoveryRepository;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

@Service
public class OwnerRecoveryService {
    private final OwnerRepository owners;
    private final RecoveryRepository recovery;
    private final OwnerService authentication;
    private final PasswordEncoder passwords;
    private final EmailTransport email;
    private final String publicUrl;
    public OwnerRecoveryService(OwnerRepository owners, RecoveryRepository recovery, OwnerService authentication, PasswordEncoder passwords, EmailTransport email, @Value("${app.public-url}") String publicUrl) {
        this.owners = owners; this.recovery = recovery; this.authentication = authentication; this.passwords = passwords; this.email = email; this.publicUrl = publicUrl.replaceAll("/+$", "");
    }
    @Transactional
    public void request(String address) {
        var account = owners.byEmail(OwnerService.normaliseEmail(address)).filter(OwnerRepository.Owner::mfaEnabled);
        if (account.isEmpty()) return;
        var owner = owners.lock(account.get().id()).orElseThrow();
        byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes); String token = HexFormat.of().formatHex(bytes);
        recovery.create(owner.id(), DigestUtils.sha256Hex(token), Instant.now().plusSeconds(900));
        // Fragment keeps the reset token out of server access logs and Referer headers.
        String link = HtmlUtils.htmlEscape(publicUrl + "/admin/reset#" + token);
        email.send(new EmailTransport.Message(owner.email(), null, "Reset your Crystal Powers password",
                "<p>A password reset was requested for your Crystal Powers owner account.</p><p><a href=\"" + link + "\">Reset your password</a></p><p>This link expires in 15 minutes and works once. You will also need your authenticator or an unused recovery code. If you did not request this, you can ignore this email.</p>", List.of()));
        owners.audit(owner.id(), "OWNER_PASSWORD_RESET_REQUESTED");
    }
    @Transactional
    public void reset(String token, String password, String code) {
        OwnerService.validatePassword(password);
        String hash = DigestUtils.sha256Hex(token);
        var id = recovery.owner(hash).orElseThrow(OwnerRecoveryService::invalid);
        var owner = owners.lock(id).orElseThrow(OwnerRecoveryService::invalid);
        if (!recovery.consume(hash)) throw invalid();
        authentication.verify(id, owner.credentialsVersion(), code);
        recovery.changePassword(id, passwords.encode(password));
        recovery.invalidateResets(id);
        owners.audit(id, "OWNER_PASSWORD_RESET_COMPLETED");
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "This reset link is invalid or has expired. Request a new one."); }
}
