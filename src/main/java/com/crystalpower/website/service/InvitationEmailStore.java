package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.repository.InvitationEmailRepository.Kind;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.UUID;

@Service
public class InvitationEmailStore {
    public record Target(Kind kind,UUID resource,UUID account,UUID workspace,String email,String name,Instant expiresAt) {}
    public record Plan(Target target,TeamAccessService.Actor actor,String hash,UUID id,UUID nonce,boolean claimed,String state) {}
    public record Result(String state,String email,Instant expiresAt) {}
    private final TeamAccessService access;
    private final TeamIdentityRepository teams;
    private final ClientRepository clients;
    private final SupportRepository support;
    private final InvitationEmailRepository deliveries;
    private final TeamRoleResolver roles;
    public InvitationEmailStore(TeamAccessService access,TeamIdentityRepository teams,ClientRepository clients,SupportRepository support,InvitationEmailRepository deliveries,TeamRoleResolver roles){this.access=access;this.teams=teams;this.clients=clients;this.support=support;this.deliveries=deliveries;this.roles=roles;}
    private TeamAccessService.Actor actor(Authentication auth,Kind kind){var actor=access.resolve(auth);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(kind==Kind.TEAM ? TeamPermission.MANAGE_MEMBERS : TeamPermission.MANAGE_CLIENTS);return actor;}
    private Target target(TeamAccessService.Actor actor,Kind kind,UUID resource,int version,String hash){
        if(kind==Kind.TEAM){
            var member=teams.credentials(resource,true).orElseThrow(InvitationEmailStore::missing).member();
            if(!member.workspaceId().equals(actor.workspaceId()) || !member.state().equals("INVITED") || member.credentialsVersion()!=version || !actor.permissions().containsAll(roles.managementPermissions(member)) || !roles.usable(member))throw missing();
            var invitation=teams.lockInvitation(hash).orElseThrow(InvitationEmailStore::missing);
            if(!invitation.accountId().equals(member.id()) || !invitation.expiresAt().isAfter(Instant.now()))throw missing();
            return new Target(kind,resource,member.id(),actor.workspaceId(),member.email(),member.displayName(),invitation.expiresAt());
        }
        actor.require(TeamPermission.READ_SUPPORT);support.claimUnassigned(actor.workspaceId());support.request(actor.workspaceId(),resource,true).orElseThrow(InvitationEmailStore::missing);
        var linked=clients.linked(actor.workspaceId(),resource).orElseThrow(InvitationEmailStore::missing);var account=clients.account(linked.id(),true).orElseThrow(InvitationEmailStore::missing);
        var invitation=clients.invitation(hash).orElseThrow(InvitationEmailStore::missing);
        if(!account.workspaceId().equals(actor.workspaceId()) || !account.state().equals("INVITED") || account.version()!=version || !invitation.accountId().equals(account.id()) || !invitation.expiresAt().toInstant().isAfter(Instant.now()))throw missing();
        return new Target(kind,resource,account.id(),actor.workspaceId(),account.email(),account.displayName(),invitation.expiresAt().toInstant());
    }
    @Transactional public Plan prepare(Authentication auth,Kind kind,UUID resource,int version,String token){var actor=actor(auth,kind);String hash=hash(token);var target=target(actor,kind,resource,version,hash);deliveries.expire(kind,hash);var current=deliveries.read(kind,hash);if(!current.state().equals("NOT_SENT"))return new Plan(target,actor,hash,current.id(),null,false,current.state());UUID id=UUID.randomUUID(),nonce=UUID.randomUUID();if(!deliveries.claim(kind,hash,id,nonce))throw new ResponseStatusException(HttpStatus.CONFLICT,"This invitation changed. Reload its delivery status.");teams.auditActor(actor.workspaceId(),actor.ownerId(),actor.memberId(),kind+"_INVITATION_EMAIL_CLAIMED",target.account());return new Plan(target,actor,hash,id,nonce,true,"RUNNING");}
    @Transactional public Result status(Authentication auth,Kind kind,UUID resource,int version,String token){var actor=actor(auth,kind);String hash=hash(token);var target=target(actor,kind,resource,version,hash);deliveries.expire(kind,hash);return new Result(deliveries.read(kind,hash).state(),target.email(),target.expiresAt());}
    @Transactional public void finish(Plan plan,boolean accepted){if(!plan.claimed() || !deliveries.finish(plan.target().kind(),plan.hash(),plan.id(),plan.nonce(),accepted))throw new ResponseStatusException(HttpStatus.CONFLICT,"Invitation email outcome could not be recorded. Check its delivery status before any further action.");teams.auditActor(plan.actor().workspaceId(),plan.actor().ownerId(),plan.actor().memberId(),plan.target().kind()+"_INVITATION_EMAIL_"+(accepted ? "ACCEPTED" : "UNKNOWN"),plan.target().account());}
    private static String hash(String token){if(token==null || !token.matches("[A-Za-z0-9_-]{43}"))throw missing();try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException failure){throw new IllegalStateException(failure);}}
    private static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"This invitation is expired, replaced, unavailable or no longer permitted. Reload the account before issuing another.");}
}
