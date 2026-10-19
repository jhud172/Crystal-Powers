package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.security.TeamPrincipal;
import com.crystalpower.website.security.TotpService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

/** Self-service only: no caller-selected account, role or protected-owner credentials. */
@Service
public class TeamAccountService {
    public record Setup(String secret, String encryptedSecret) {}
    private record Proof(TeamIdentityRepository.Credentials credentials,long step) {}
    private final TeamAuthenticationService authentication;
    private final TeamIdentityRepository accounts;
    private final PasswordEncoder passwords;
    private final SecretVault vault;
    private final TotpService totp;
    public TeamAccountService(TeamAuthenticationService authentication,TeamIdentityRepository accounts,PasswordEncoder passwords,SecretVault vault,TotpService totp) {
        this.authentication=authentication;this.accounts=accounts;this.passwords=passwords;this.vault=vault;this.totp=totp;
    }
    public TeamPrincipal principal(Authentication auth) {
        if(auth==null || !auth.isAuthenticated())throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sign in again before changing team account security.");
        if(!(auth.getPrincipal() instanceof TeamPrincipal principal))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Use the separate security controls for your account.");
        return principal;
    }
    private TeamIdentityRepository.Credentials locked(TeamPrincipal principal) {
        var current=authentication.lockedCurrent(principal.id(),principal.credentialsVersion());
        if(!current.member().workspaceId().equals(principal.workspaceId()) || !current.mfaEnabled() || current.encryptedTotp()==null)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sign in again before changing team account security.");
        return current;
    }
    private Proof proof(Authentication auth,String password,String code) {
        var current=locked(principal(auth));
        if(password==null || password.getBytes(StandardCharsets.UTF_8).length>72 || !passwords.matches(password,current.passwordHash()))throw invalidProof();
        long step=totp.verify(vault.decrypt(current.encryptedTotp()),code,current.lastTotpStep(),Instant.now()).orElseThrow(TeamAccountService::invalidProof);
        return new Proof(current,step);
    }
    @Transactional public void password(Authentication auth,String password,String code,String nextPassword) {
        principal(auth);OwnerService.validatePassword(nextPassword);
        var proof=proof(auth,password,code);var member=proof.credentials().member();
        changed(accounts.changePassword(member.id(),member.workspaceId(),member.credentialsVersion(),passwords.encode(nextPassword),proof.step()));
        accounts.invalidateInvitations(member.id());accounts.auditMember(member.id(),"TEAM_PASSWORD_CHANGED");
    }
    @Transactional public void sessions(Authentication auth,String password,String code) {
        var proof=proof(auth,password,code);var member=proof.credentials().member();
        changed(accounts.revokeSessions(member.id(),member.workspaceId(),member.credentialsVersion(),proof.step()));
        accounts.auditMember(member.id(),"TEAM_SESSIONS_REVOKED");
    }
    @Transactional public Setup beginAuthenticator(Authentication auth,String password,String code) {
        var proof=proof(auth,password,code);var member=proof.credentials().member();
        accounts.acceptAuthenticator(member.id(),proof.step(),member.credentialsVersion());
        String secret=totp.createSecret();accounts.auditMember(member.id(),"TEAM_AUTHENTICATOR_REPLACEMENT_STARTED");
        return new Setup(secret,vault.encrypt(secret));
    }
    @Transactional public void confirmAuthenticator(Authentication auth,String encryptedSecret,String code,long expires) {
        var principal=principal(auth);locked(principal);
        if(expires<=Instant.now().getEpochSecond())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Authenticator setup has expired. Cancel it and start again.");
        long step=totp.verify(vault.decrypt(encryptedSecret),code,-1,Instant.now()).orElseThrow(()->new ResponseStatusException(HttpStatus.BAD_REQUEST,"Enter a fresh code from the new authenticator."));
        changed(accounts.replaceAuthenticator(principal.id(),principal.workspaceId(),principal.credentialsVersion(),encryptedSecret,step));
        accounts.invalidateInvitations(principal.id());accounts.auditMember(principal.id(),"TEAM_AUTHENTICATOR_REPLACED");
    }
    private static void changed(int count) { if(count!=1)throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Your account changed. Sign in again before changing security."); }
    private static ResponseStatusException invalidProof() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Your current password or fresh authenticator code was not accepted. Wait for a new code before trying again."); }
}
