package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamIdentityRepository.Member;
import com.crystalpower.website.security.TeamPermission;
import com.crystalpower.website.security.TeamRole;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class TeamMemberService {
    private final TeamAccessService access;
    private final TeamIdentityRepository teams;
    private final OwnerRepository owners;
    private final TeamMemberAuthority authority;
    private final SecureRandom random = new SecureRandom();
    public TeamMemberService(TeamAccessService access, TeamIdentityRepository teams, OwnerRepository owners,TeamMemberAuthority authority) { this.access = access; this.teams = teams; this.owners = owners;this.authority=authority; }
    private TeamAccessService.Actor admin(Authentication authentication) { var actor = access.resolve(authentication); actor.require(TeamPermission.MANAGE_MEMBERS); teams.lockWorkspace(actor.workspaceId()); actor = access.resolveLocked(authentication); actor.require(TeamPermission.MANAGE_MEMBERS); return actor; }
    public record MemberAccess(Member member,boolean manageable) {}
    public record Management(String actorScope,List<MemberAccess> members,List<TeamRole> creatableRoles) {}
    @Transactional public Management management(Authentication auth){var actor=admin(auth);var members=teams.members(actor.workspaceId());var manageable=authority.manageableMembers(actor,members);return new Management(actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId(),members.stream().map(member->new MemberAccess(member,manageable.contains(member.id()))).toList(),Arrays.stream(TeamRole.values()).filter(role->actor.permissions().containsAll(role.permissions())).toList());}
    @Transactional public List<Member> members(Authentication authentication) { var actor = admin(authentication); return teams.members(actor.workspaceId()); }
    @Transactional public TeamIdentityService.Created create(Authentication authentication, String email, String name, TeamRole role) {
        var actor = admin(authentication);
        if (!actor.permissions().containsAll(role.permissions())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot grant permissions beyond your own access.");
        String address = email.strip().toLowerCase(Locale.ROOT);
        var root = owners.byId(teams.workspaceOwner(actor.workspaceId())).orElseThrow();
        if (root.email().equalsIgnoreCase(address)) throw new ResponseStatusException(HttpStatus.CONFLICT, "The protected owner account already uses this address.");
        Member member = teams.create(actor.workspaceId(), address, name.strip(), role); return invitation(actor, member);
    }
    @Transactional public TeamIdentityService.Created reissue(Authentication authentication, UUID id, int expectedVersion) {
        var actor = admin(authentication); var member = teams.member(actor.workspaceId(), id).orElseThrow(TeamMemberService::missing); authority.requireManage(actor,member);
        if (!member.state().equals("INVITED") || member.credentialsVersion() != expectedVersion || teams.resetCredentials(actor.workspaceId(), id, expectedVersion) != 1) throw conflict(); return invitation(actor, teams.member(actor.workspaceId(), id).orElseThrow());
    }
    @Transactional public Member change(Authentication authentication, UUID id, int version, TeamRole role, String state) {
        var actor = admin(authentication); var member = teams.member(actor.workspaceId(), id).orElseThrow(TeamMemberService::missing); authority.requireManage(actor,member);
        if (id.equals(actor.memberId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ask another admin to change your own access.");
        if (role != member.role() && !actor.permissions().containsAll(role.permissions())) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot grant permissions beyond your own access.");
        if (!List.of("ACTIVE", "SUSPENDED").contains(state) || member.state().equals("INVITED")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Activate or cancel the invitation before changing access.");
        // A cancelled invitation cannot be restored as a passwordless active account.
        var credentials = teams.credentials(id, false).orElseThrow();
        if (state.equals("ACTIVE") && credentials.passwordHash() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This invitation was cancelled. Create a new invitation with another address or ask the owner to recover the account.");
        if (teams.change(actor.workspaceId(), id, version, role, state) != 1) throw conflict();
        teams.auditActor(actor.workspaceId(), actor.ownerId(), actor.memberId(), "TEAM_MEMBER_ACCESS_CHANGED", id); return teams.member(actor.workspaceId(), id).orElseThrow();
    }
    @Transactional public void cancel(Authentication authentication, UUID id, int version) {
        var actor = admin(authentication); var member=teams.member(actor.workspaceId(),id).orElseThrow(TeamMemberService::missing);authority.requireManage(actor,member); if (teams.cancelInvitation(actor.workspaceId(), id, version) != 1) throw conflict(); teams.auditActor(actor.workspaceId(), actor.ownerId(), actor.memberId(), "TEAM_INVITATION_CANCELLED", id);
    }
    @Transactional public TeamIdentityService.Created reset(Authentication authentication, UUID id, int version) {
        var actor = admin(authentication);
        if (id.equals(actor.memberId())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ask another admin to recover your account.");
        var member=teams.member(actor.workspaceId(), id).orElseThrow(TeamMemberService::missing);authority.requireManage(actor,member);
        if (teams.resetCredentials(actor.workspaceId(), id, version) != 1) throw conflict();
        teams.auditActor(actor.workspaceId(), actor.ownerId(), actor.memberId(), "TEAM_CREDENTIALS_RESET", id);
        return invitation(actor, teams.member(actor.workspaceId(), id).orElseThrow());
    }
    private TeamIdentityService.Created invitation(TeamAccessService.Actor actor, Member member) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes); String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expires = Instant.now().plus(72, ChronoUnit.HOURS);
        try { String digest = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); teams.invite(member.id(), actor.ownerId(), actor.memberId(), digest, expires); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable", impossible); }
        teams.auditActor(actor.workspaceId(), actor.ownerId(), actor.memberId(), "TEAM_MEMBER_INVITED", member.id()); return new TeamIdentityService.Created(member, "/team/activate#token=" + token, expires);
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Team member not found."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "The member changed. Reload before trying again."); }
}
