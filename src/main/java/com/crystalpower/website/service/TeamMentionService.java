package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class TeamMentionService {
    public record Recipient(String key,String name) {}
    public record Page(List<TeamMentionRepository.Mention> mentions,Long nextCursor) {}
    private final TeamAccessService access;
    private final TeamRoleResolver roles;
    private final TeamIdentityRepository accounts;
    private final TeamChannelRepository channels;
    private final TeamGroupService groups;
    private final TeamMentionRepository mentions;
    public TeamMentionService(TeamAccessService access,TeamIdentityRepository accounts,TeamChannelRepository channels,TeamGroupService groups,TeamMentionRepository mentions,TeamRoleResolver roles){this.roles=roles;this.access=access;this.accounts=accounts;this.channels=channels;this.groups=groups;this.mentions=mentions;}
    private TeamChannelRepository.Channel channel(TeamAccessService.Actor actor,UUID id){actor.require(TeamPermission.READ_CHANNELS);var channel=channels.channel(actor.workspaceId(),id,false).orElseThrow(TeamMentionService::missing);if(channel.archived() || !actor.audience(channel.audience()) || !groups.allows(actor,channel.groupId()))throw missing();return channel;}
    @Transactional public List<Recipient> recipients(Authentication auth,UUID id){var actor=access.resolve(auth);return recipients(actor,channel(actor,id));}
    private List<Recipient> recipients(TeamAccessService.Actor actor,TeamChannelRepository.Channel channel){
        var result=new java.util.ArrayList<Recipient>();UUID owner=accounts.workspaceOwner(actor.workspaceId());result.add(new Recipient("OWNER:"+owner,"James"));
        var members=accounts.members(actor.workspaceId());var permissions=roles.permissions(actor.workspaceId(),members);
        for(var member:members){if(!member.state().equals("ACTIVE"))continue;var recipient=new TeamAccessService.Actor(actor.workspaceId(),null,member.id(),member.displayName(),permissions.get(member.id()));if(recipient.permissions().contains(TeamPermission.READ_CHANNELS) && recipient.audience(channel.audience()) && groups.allows(recipient,channel.groupId()))result.add(new Recipient("TEAM:"+member.id(),member.displayName()));}
        return result.stream().filter(r->!r.key().equals(key(actor))).sorted(java.util.Comparator.comparing(Recipient::name).thenComparing(Recipient::key)).toList();
    }
    public List<String> validate(TeamAccessService.Actor actor,UUID id,List<String> keys){if(keys.isEmpty())return List.of();var channel=channel(actor,id);Set<String> allowed=recipients(actor,channel).stream().map(Recipient::key).collect(java.util.stream.Collectors.toSet());if(keys.size()>10 || keys.stream().anyMatch(k->k==null || !allowed.contains(k)) || keys.stream().distinct().count()!=keys.size())throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose up to ten distinct recipients who can access this channel.");return keys.stream().sorted().toList();}
    public void add(long message,UUID channel,List<String> keys){for(String key:keys)mentions.add(message,channel,key);}
    @Transactional public Page inbox(Authentication auth,Long before){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);var visible=groups.visibleIds(actor);var allowed=channels.channels(actor.workspaceId()).stream().filter(c->actor.audience(c.audience()) && (c.groupId()==null || visible.contains(c.groupId()))).map(TeamChannelRepository.Channel::id).collect(java.util.stream.Collectors.toSet());var rows=mentions.inbox(key(actor),allowed,before);boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;return new Page(page,more ? page.get(page.size()-1).id() : null);}
    @Transactional public void acknowledge(Authentication auth,UUID id,long message){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);accounts.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);channel(actor,id);if(channels.message(id,message,false).isEmpty() || mentions.acknowledge(key(actor),id,message)!=1)throw missing();}
    private static String key(TeamAccessService.Actor actor){return actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId();}
    private static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"This mention or channel is unavailable.");}
}
