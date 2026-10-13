package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamRoleProfileRepository;
import com.crystalpower.website.security.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class TeamRoleProfileService {
    public record Overview(List<TeamRoleProfileRepository.Profile> profiles,List<TeamRoleProfileRepository.Assignment> assignments,Map<TeamRole,Set<TeamPermission>> bases,Set<TeamPermission> managementGrants,Set<UUID> manageableMembers,Set<UUID> editableProfiles) {}
    private final TeamAccessService access;
    private final TeamIdentityRepository accounts;
    private final TeamRoleProfileRepository profiles;
    private final TeamMemberAuthority authority;
    public TeamRoleProfileService(TeamAccessService access,TeamIdentityRepository accounts,TeamRoleProfileRepository profiles,TeamMemberAuthority authority) { this.access=access;this.accounts=accounts;this.profiles=profiles;this.authority=authority; }
    private TeamAccessService.Actor admin(Authentication auth) { var actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_ROLES);accounts.lockWorkspace(actor.workspaceId());actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_ROLES);return actor; }
    @Transactional public Overview overview(Authentication auth) { var actor=admin(auth);Map<TeamRole,Set<TeamPermission>> bases=new EnumMap<>(TeamRole.class);for(var role:TeamRole.values())bases.put(role,role.permissions());var definitions=profiles.profiles(actor.workspaceId());var self=actor.memberId()==null ? Optional.<UUID>empty() : profiles.assigned(actor.memberId());return new Overview(definitions,profiles.assignments(actor.workspaceId()),bases,actor.permissions(),authority.manageableMembers(actor,accounts.members(actor.workspaceId())),definitions.stream().filter(profile->actor.permissions().containsAll(profile.permissions()) && self.filter(profile.id()::equals).isEmpty()).map(TeamRoleProfileRepository.Profile::id).collect(java.util.stream.Collectors.toSet())); }
    @Transactional public Object create(Authentication auth,String name,TeamRole base,Set<TeamPermission> permissions) { var actor=admin(auth);validate(base,permissions);grant(actor,permissions);if(profiles.profiles(actor.workspaceId()).size()>=100)throw bad("This workspace already has 100 retained role profiles.");unique(actor.workspaceId(),null,name.strip());var profile=profiles.create(actor.workspaceId(),name.strip(),base,permissions);audit(actor,"TEAM_ROLE_CREATED",profile.id());return profile; }
    @Transactional public Object update(Authentication auth,UUID id,int version,String name,Set<TeamPermission> permissions,boolean archived) {
        var actor=admin(auth);var profile=profiles.profile(actor.workspaceId(),id).orElseThrow(TeamRoleProfileService::missing);grant(actor,profile.permissions());validate(profile.baseRole(),permissions);grant(actor,permissions);unique(actor.workspaceId(),id,name.strip());
        // Another admin or the protected owner must change a profile used by this session.
        if(actor.memberId()!=null && profiles.assigned(actor.memberId()).filter(id::equals).isPresent())throw bad("Ask another admin to change your own role profile.");
        if(profiles.update(actor.workspaceId(),id,version,name.strip(),permissions,archived)!=1)throw conflict();profiles.revokeAssigned(actor.workspaceId(),id);audit(actor,"TEAM_ROLE_CHANGED",id);return profiles.profile(actor.workspaceId(),id).orElseThrow();
    }
    @Transactional public Object assign(Authentication auth,UUID memberId,int version,UUID profileId) {
        var actor=admin(auth);actor.require(TeamPermission.MANAGE_MEMBERS);if(memberId.equals(actor.memberId()))throw bad("Ask another admin to change your own access.");
        var member=accounts.member(actor.workspaceId(),memberId).orElseThrow(TeamRoleProfileService::missing);authority.requireManage(actor,member);
        if(profileId==null)grant(actor,member.role().permissions());
        if(profileId!=null){var profile=profiles.profile(actor.workspaceId(),profileId).orElseThrow(TeamRoleProfileService::missing);grant(actor,profile.permissions());if(profile.archived() || profile.baseRole()!=member.role())throw bad("Choose an active profile for the member's base role.");}
        if(profiles.assign(actor.workspaceId(),memberId,version,profileId)!=1)throw conflict();audit(actor,"TEAM_ROLE_ASSIGNED",memberId);return accounts.member(actor.workspaceId(),memberId).orElseThrow();
    }
    private static void grant(TeamAccessService.Actor actor,Set<TeamPermission> values) { if(!actor.permissions().containsAll(values))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"You cannot grant permissions beyond your own access."); }
    private void unique(UUID workspace,UUID id,String name) { if(profiles.profiles(workspace).stream().anyMatch(p->!p.id().equals(id) && p.name().equalsIgnoreCase(name)))throw new ResponseStatusException(HttpStatus.CONFLICT,"A role profile already uses this name."); }
    private static void validate(TeamRole base,Set<TeamPermission> values) { if(!base.permissions().containsAll(values) || !values.contains(TeamPermission.READ_CHANNELS))throw bad("Permissions must include channel reading and stay within the base role.");if((values.contains(TeamPermission.REPLY_SUPPORT)||values.contains(TeamPermission.UPDATE_TRACKING))&&!values.contains(TeamPermission.READ_SUPPORT))throw bad("Support actions also require support reading.");if(values.contains(TeamPermission.EDIT_UPLOADS)&&!values.contains(TeamPermission.REVIEW_UPLOADS))throw bad("Upload editing also requires upload review.");if((values.contains(TeamPermission.MANAGE_BILLING)||values.contains(TeamPermission.MANAGE_CLIENTS))&&!values.contains(TeamPermission.READ_SUPPORT))throw bad("Client and billing management also require support reading.");if(values.contains(TeamPermission.MANAGE_ROLES)&&!values.contains(TeamPermission.MANAGE_MEMBERS))throw bad("Role management also requires member management.");if(values.contains(TeamPermission.PUBLISH_PROJECTS)&&!values.contains(TeamPermission.EDIT_PROJECTS))throw bad("Publishing also requires project editing."); }
    private void audit(TeamAccessService.Actor actor,String event,UUID id) { accounts.auditActor(actor.workspaceId(),actor.ownerId(),actor.memberId(),event,id); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"The role profile or member is unavailable."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Access changed. Reload before trying again."); }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST,message); }
}
