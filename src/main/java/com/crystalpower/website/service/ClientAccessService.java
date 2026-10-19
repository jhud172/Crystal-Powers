package com.crystalpower.website.service;

import com.crystalpower.website.repository.ClientRepository;
import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.ClientPrincipal;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class ClientAccessService {
    public record Access(UUID id, String email, String displayName, String state, int version, String invitationToken) {}
    private final ClientRepository clients;
    private final SupportRepository support;
    private final TeamIdentityRepository teams;
    private final TeamAccessService access;
    private final PasswordEncoder passwords;
    private final String dummyHash;
    public ClientAccessService(ClientRepository clients, SupportRepository support, TeamIdentityRepository teams, TeamAccessService access, PasswordEncoder passwords) { this.clients=clients; this.support=support; this.teams=teams; this.access=access; this.passwords=passwords; this.dummyHash=passwords.encode(UUID.randomUUID().toString()); }
    @Transactional
    public Access status(Authentication auth, UUID request) { var actor=staff(auth,request); return clients.linked(actor.workspaceId(),request).map(c -> view(c,null)).orElse(null); }
    private TeamAccessService.Actor staff(Authentication auth, UUID request) {
        var actor=access.resolve(auth);
        actor.require(TeamPermission.READ_SUPPORT); actor.require(TeamPermission.MANAGE_CLIENTS);
        teams.lockWorkspace(actor.workspaceId());
        // A suspension or role change may have committed while this request waited.
        actor=access.resolveLocked(auth);
        actor.require(TeamPermission.READ_SUPPORT); actor.require(TeamPermission.MANAGE_CLIENTS);
        support.claimUnassigned(actor.workspaceId());
        support.request(actor.workspaceId(),request,true).orElseThrow(ClientAccessService::missing);
        return actor;
    }
    @Transactional
    public Access provision(Authentication auth, UUID request) {
        return provision(auth,request,null,null);
    }
    @Transactional
    public Access provision(Authentication auth,UUID request,Boolean expectedLinked,Integer expectedVersion) {
        var actor=staff(auth,request); var enquiry=support.request(actor.workspaceId(),request,true).orElseThrow(ClientAccessService::missing);
        var linked=clients.linked(actor.workspaceId(),request);
        if(expectedLinked!=null){
            if(expectedLinked && expectedVersion==null || !expectedLinked && expectedVersion!=null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Confirm the current client-access state before linking or replacing an invitation.");
            if(expectedLinked!=linked.isPresent() || expectedLinked && linked.orElseThrow().version()!=expectedVersion)throw new ResponseStatusException(HttpStatus.CONFLICT,"Client access changed. Refresh it before linking or replacing an invitation.");
        }
        String email=enquiry.clientEmail().strip().toLowerCase(Locale.ROOT);
        var account=linked.orElseGet(()->clients.email(email).orElseGet(() -> clients.create(actor.workspaceId(),email,enquiry.clientName())));
        account=clients.account(account.id(),true).orElseThrow(ClientAccessService::missing);
        if (!account.workspaceId().equals(actor.workspaceId())) throw missing();
        // Activation also locks the account, so repeat the supplied revision proof after that wait.
        if(Boolean.TRUE.equals(expectedLinked) && account.version()!=expectedVersion)throw new ResponseStatusException(HttpStatus.CONFLICT,"Client access changed. Refresh it before replacing an invitation.");
        if (account.state().equals("SUSPENDED")) throw new ResponseStatusException(HttpStatus.CONFLICT,"This client's access is suspended. Use account recovery explicitly before linking another project.");
        if(linked.isPresent() && account.state().equals("ACTIVE"))return view(account,null);
        clients.bind(account.id(),request);
        String token=null;
        if(account.state().equals("INVITED")){
            // Replacing a single-use link must change the revision shown to every admin.
            clients.reset(account.id());token=invitation(account.id());account=clients.account(account.id(),false).orElseThrow();
        }
        support.event(request,actor.ownerId(),actor.memberId(),"CLIENT_ACCESS_GRANTED","Client portal access was linked to this request. Any invitation must be delivered privately to its stored recipient.",false);
        return view(account,token);
    }
    @Transactional
    public Access reset(Authentication auth, UUID request, int expectedVersion) {
        var actor=staff(auth,request); var linked=clients.linked(actor.workspaceId(),request).orElseThrow(ClientAccessService::missing);
        var account=clients.account(linked.id(),true).orElseThrow(ClientAccessService::missing);
        if (account.version()!=expectedVersion) throw new ResponseStatusException(HttpStatus.CONFLICT,"Client access changed. Reload before recovery.");
        clients.reset(account.id()); String token=invitation(account.id());
        support.event(request,actor.ownerId(),actor.memberId(),"CLIENT_ACCESS_RECOVERY","Client credentials were revoked and a new private activation invitation was issued by an admin.",false);
        return view(clients.account(account.id(),false).orElseThrow(),token);
    }
    @Transactional
    public void suspend(Authentication auth,UUID request,int expectedVersion) {
        var actor=staff(auth,request); var linked=clients.linked(actor.workspaceId(),request).orElseThrow(ClientAccessService::missing); var account=clients.account(linked.id(),true).orElseThrow(ClientAccessService::missing);
        if(account.version()!=expectedVersion) throw new ResponseStatusException(HttpStatus.CONFLICT,"Client access changed. Reload before suspending it.");
        clients.suspend(account.id()); support.event(request,actor.ownerId(),actor.memberId(),"CLIENT_ACCESS_SUSPENDED","Client portal access was suspended, including all linked requests and previous sessions.",false);
    }
    private String invitation(UUID account) { byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes); String token=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); clients.invite(account,hash(token),OffsetDateTime.now(ZoneOffset.UTC).plusHours(72)); return token; }
    @Transactional
    public void activate(String token,String password) {
        validatePassword(password); var invite=clients.invitation(hash(token)).orElseThrow(ClientAccessService::invalidInvite);
        var account=clients.account(invite.accountId(),true).orElseThrow(ClientAccessService::invalidInvite);
        invite=clients.invitation(hash(token)).orElseThrow(ClientAccessService::invalidInvite);
        if(!invite.expiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC)) || !account.state().equals("INVITED")) throw invalidInvite();
        clients.password(account.id(),passwords.encode(password)); clients.consume(hash(token));
    }
    @Transactional(readOnly=true)
    public ClientPrincipal login(String email,String password) {
        var account=clients.email(email.strip().toLowerCase(Locale.ROOT)).orElse(null);
        boolean validLength=password.getBytes(StandardCharsets.UTF_8).length<=72;
        boolean matches=passwords.matches(validLength ? password : "invalid-client-password",account==null || account.passwordHash()==null || !validLength ? dummyHash : account.passwordHash()) && validLength;
        if(account==null || !matches || !account.state().equals("ACTIVE")) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"The email or password was not recognised. Contact the team if you need account recovery.");
        return new ClientPrincipal(account.id(),account.workspaceId(),account.displayName(),account.version());
    }
    public boolean valid(ClientPrincipal principal) { return clients.account(principal.id(),false).map(c -> c.state().equals("ACTIVE") && c.version()==principal.credentialsVersion() && c.workspaceId().equals(principal.workspaceId())).orElse(false); }
    public ClientPrincipal resolve(Authentication auth) { if(auth==null || !(auth.getPrincipal() instanceof ClientPrincipal principal) || !auth.isAuthenticated() || !valid(principal)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in to your client account."); return principal; }
    @Transactional
    public void changePassword(Authentication auth,String oldPassword,String nextPassword) { var principal=resolve(auth); validatePassword(nextPassword); var account=clients.account(principal.id(),true).orElseThrow(ClientAccessService::missing); if(account.version()!=principal.credentialsVersion() || !account.state().equals("ACTIVE") || !passwords.matches(oldPassword,account.passwordHash())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Your current password could not be confirmed."); clients.password(account.id(),passwords.encode(nextPassword)); }
    @Transactional
    public ClientRepository.Preferences preferences(Authentication auth) { return clients.preferences(preferenceAccount(auth).id()); }
    @Transactional
    public ClientRepository.Preferences preferences(Authentication auth,int expectedVersion,String value) {
        if(!java.util.Set.of("PORTAL_ONLY","PORTAL_AND_EMAIL").contains(value)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a supported contact preference.");
        var account=preferenceAccount(auth);
        if(!clients.preferences(account.id(),expectedVersion,value)) throw new ResponseStatusException(HttpStatus.CONFLICT,"Your contact preference changed. Reload it before saving again.");
        return clients.preferences(account.id());
    }
    private ClientRepository.Account preferenceAccount(Authentication auth) {
        var principal=resolve(auth);var account=clients.account(principal.id(),true).orElseThrow(ClientAccessService::missing);
        if(!account.state().equals("ACTIVE") || account.version()!=principal.credentialsVersion() || !account.workspaceId().equals(principal.workspaceId())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in to your client account again.");
        return account;
    }
    private void validatePassword(String value) { if(value==null || value.length()<12 || value.getBytes(StandardCharsets.UTF_8).length>72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a password with at least 12 characters and no more than 72 UTF-8 bytes."); }
    private static String hash(String token) { try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); } catch(java.security.NoSuchAlgorithmException failure) { throw new IllegalStateException(failure); } }
    private Access view(ClientRepository.Account c,String token) { return new Access(c.id(),c.email(),c.displayName(),c.state(),c.version(),token); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This client or request is unavailable."); }
    private static ResponseStatusException invalidInvite() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"This invitation expired or was already used. Ask the team for a new private invitation."); }
}
