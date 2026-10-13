package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class TeamGroupService {
    public record View(UUID id,String name,String description,boolean archived,int version,List<UUID> members) {}
    public record EligibleMember(UUID id,String displayName,String role) {}
    private final TeamAccessService access;
    private final TeamGroupRepository groups;
    private final TeamIdentityRepository accounts;
    private final TeamChannelRepository channels;
    public TeamGroupService(TeamAccessService access,TeamGroupRepository groups,TeamIdentityRepository accounts,TeamChannelRepository channels){this.access=access;this.groups=groups;this.accounts=accounts;this.channels=channels;}
    @Transactional(readOnly=true) public List<View> list(Authentication auth){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);boolean admin=actor.permissions().contains(TeamPermission.MANAGE_GROUPS);var visible=visibleIds(actor);return groups.list(actor.workspaceId()).stream().filter(g->admin || visible.contains(g.id())).map(g->view(g,false)).toList();}
    @Transactional(readOnly=true) public View detail(Authentication auth,UUID id){var actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_GROUPS);return view(groups.group(actor.workspaceId(),id,false).orElseThrow(TeamGroupService::missing),true);}
    @Transactional(readOnly=true) public List<EligibleMember> eligible(Authentication auth){var actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_GROUPS);return accounts.members(actor.workspaceId()).stream().filter(m->m.state().equals("ACTIVE")).map(m->new EligibleMember(m.id(),m.displayName(),m.role().name())).toList();}
    @Transactional public View save(Authentication auth,UUID id,int version,String name,String description,boolean archived,List<UUID> members){
        var actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_GROUPS);accounts.lockWorkspace(actor.workspaceId());actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_GROUPS);
        String clean=name.strip(),key=clean.toLowerCase(Locale.ROOT);if(clean.isBlank() || clean.length()>80 || key.length()>80 || clean.codePoints().anyMatch(Character::isISOControl) || description.length()>500 || members.size()>500 || members.stream().anyMatch(java.util.Objects::isNull) || members.stream().distinct().count()!=members.size())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Check the group name, description and member selection.");
        java.util.Set<UUID> retained=java.util.Set.of();
        if(id!=null){groups.group(actor.workspaceId(),id,true).orElseThrow(TeamGroupService::missing);retained=new java.util.HashSet<>(groups.members(id));}
        for(UUID member:members){var current=accounts.member(actor.workspaceId(),member).orElseThrow(TeamGroupService::missing);if(!current.state().equals("ACTIVE") && !retained.contains(member))throw new ResponseStatusException(HttpStatus.CONFLICT,"A new selected member is no longer active. Refresh the member selection.");}
        TeamGroupRepository.Group group;
        if(id==null){if(groups.list(actor.workspaceId()).size()>=100)throw new ResponseStatusException(HttpStatus.CONFLICT,"This workspace has reached its group limit.");group=groups.create(actor.workspaceId(),clean,key,description.strip());}
        else{groups.group(actor.workspaceId(),id,true).orElseThrow(TeamGroupService::missing);if(groups.update(actor.workspaceId(),id,version,clean,key,description.strip(),archived)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"This group changed. Reload before saving; your edits remain in this tab.");group=groups.group(actor.workspaceId(),id,false).orElseThrow();}
        groups.replaceMembers(group.id(),members);channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),id==null ? "GROUP_CREATED" : "GROUP_CHANGED",group.id());return view(group,true);
    }
    public boolean allows(TeamAccessService.Actor actor,UUID groupId){if(groupId==null)return true;var group=groups.group(actor.workspaceId(),groupId,false).orElse(null);return group!=null && !group.archived() && (actor.permissions().contains(TeamPermission.MANAGE_GROUPS) || (actor.memberId()!=null && groups.member(groupId,actor.memberId())));}
    public java.util.Set<UUID> visibleIds(TeamAccessService.Actor actor){return groups.visibleIds(actor.workspaceId(),actor.memberId(),actor.permissions().contains(TeamPermission.MANAGE_GROUPS));}
    public void requireAssignable(TeamAccessService.Actor actor,UUID groupId){if(groupId==null)return;actor.require(TeamPermission.MANAGE_GROUPS);if(!allows(actor,groupId))throw missing();}
    private View view(TeamGroupRepository.Group group,boolean admin){return new View(group.id(),group.name(),group.description(),group.archived(),group.version(),admin ? groups.members(group.id()) : List.of());}
    private static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"This group or member is unavailable.");}
}
