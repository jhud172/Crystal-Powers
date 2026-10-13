package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository.Member;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** A delegated manager cannot take over or disable a more privileged team account. */
@Component
public class TeamMemberAuthority {
    private final TeamRoleResolver roles;
    public TeamMemberAuthority(TeamRoleResolver roles){this.roles=roles;}
    public boolean canManage(TeamAccessService.Actor actor,Member member){return actor.permissions().contains(com.crystalpower.website.security.TeamPermission.MANAGE_MEMBERS) && actor.workspaceId().equals(member.workspaceId()) && !member.id().equals(actor.memberId()) && actor.permissions().containsAll(roles.managementPermissions(member));}
    public java.util.Set<java.util.UUID> manageableMembers(TeamAccessService.Actor actor,java.util.List<Member> members){var permissions=roles.managementPermissions(actor.workspaceId(),members);return members.stream().filter(member->actor.permissions().contains(com.crystalpower.website.security.TeamPermission.MANAGE_MEMBERS) && actor.workspaceId().equals(member.workspaceId()) && !member.id().equals(actor.memberId()) && actor.permissions().containsAll(permissions.get(member.id()))).map(Member::id).collect(java.util.stream.Collectors.toUnmodifiableSet());}
    public void requireManage(TeamAccessService.Actor actor,Member member){
        actor.require(com.crystalpower.website.security.TeamPermission.MANAGE_MEMBERS);
        if(!actor.workspaceId().equals(member.workspaceId()))throw new ResponseStatusException(HttpStatus.NOT_FOUND,"This member is unavailable.");
        if(member.id().equals(actor.memberId()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Ask another admin to change or recover your own access.");
        if(!actor.permissions().containsAll(roles.managementPermissions(member)))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This account has greater permissions than your management access. Ask an authorised admin or the owner.");
    }
}
