package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamIdentityRepository.Credentials;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.security.TeamPrincipal;
import com.crystalpower.website.security.TotpService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

@Service
public class TeamAuthenticationService {
    private final TeamIdentityRepository teams;
    private final PasswordEncoder passwords;
    private final SecretVault vault;
    private final TotpService totp;
    private final String missingPassword;
    private final TeamRoleResolver roles;
    public TeamAuthenticationService(TeamIdentityRepository teams, PasswordEncoder passwords, SecretVault vault, TotpService totp, TeamRoleResolver roles) {
        this.roles = roles; this.teams = teams; this.passwords = passwords; this.vault = vault; this.totp = totp;
        missingPassword = passwords.encode(UUID.randomUUID().toString());
    }
    public Credentials password(String email, String password) {
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) throw unauthorised();
        var credentials = teams.credentials(email.strip().toLowerCase(Locale.ROOT));
        String expected = credentials.map(Credentials::passwordHash).orElse(null);
        boolean matches = passwords.matches(password, expected == null ? missingPassword : expected);
        if (!matches || credentials.isEmpty() || !credentials.get().member().state().equals("ACTIVE") || !roles.usable(credentials.get().member())) throw unauthorised();
        return credentials.get();
    }
    public Credentials current(UUID id, int version, boolean lock) {
        return teams.credentials(id, lock).filter(value -> value.member().state().equals("ACTIVE") && value.member().credentialsVersion() == version && roles.usable(value.member())).orElseThrow(TeamAuthenticationService::unauthorised);
    }
    /** Match administrative workspace -> account write order, including audit foreign keys. */
    public Credentials lockedCurrent(UUID id, int version) {
        var candidate = current(id, version, false);
        teams.lockWorkspace(candidate.member().workspaceId());
        return current(id, version, true);
    }
    @Transactional
    public String setup(UUID id, int version) {
        return setup(id, version, Instant.now().getEpochSecond() + 300);
    }
    @Transactional
    public String setup(UUID id, int version, long expiresAt) {
        Credentials current = lockedCurrent(id, version);
        requireUnexpired(expiresAt);
        if (current.mfaEnabled()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The authenticator is already configured.");
        if (current.encryptedTotp() == null) {
            String secret = totp.createSecret(); teams.setAuthenticator(id, vault.encrypt(secret)); return secret;
        }
        return vault.decrypt(current.encryptedTotp());
    }
    @Transactional
    public TeamPrincipal verify(UUID id, int version, String code) {
        return verify(id, version, code, Instant.now().getEpochSecond() + 300);
    }
    @Transactional
    public TeamPrincipal verify(UUID id, int version, String code, long expiresAt) {
        Credentials current = lockedCurrent(id, version);
        requireUnexpired(expiresAt);
        if (current.encryptedTotp() == null) throw unauthorised();
        var step = totp.verify(vault.decrypt(current.encryptedTotp()), code, current.lastTotpStep(), Instant.now());
        if (step.isEmpty()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "The authenticator code was not accepted. Try a new code.");
        int nextVersion = current.mfaEnabled() ? version : version + 1;
        teams.acceptAuthenticator(id, step.getAsLong(), nextVersion);
        teams.auditMember(id, current.mfaEnabled() ? "TEAM_SIGNED_IN" : "TEAM_AUTHENTICATOR_ENROLLED");
        var member = current.member();
        return new TeamPrincipal(member.id(), member.workspaceId(), member.email(), member.displayName(), member.role(), nextVersion);
    }
    public boolean valid(TeamPrincipal principal) {
        return teams.credentials(principal.id(), false).filter(value -> value.mfaEnabled() && value.member().state().equals("ACTIVE") && value.member().credentialsVersion() == principal.credentialsVersion() && value.member().workspaceId().equals(principal.workspaceId()) && roles.usable(value.member())).isPresent();
    }
    private static void requireUnexpired(long expiresAt) {
        if (expiresAt <= Instant.now().getEpochSecond()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again to continue.");
    }
    private static ResponseStatusException unauthorised() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign-in details were not accepted. Check them or ask your admin for help."); }
}
