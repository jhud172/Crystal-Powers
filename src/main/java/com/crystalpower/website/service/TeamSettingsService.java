package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamSettingsRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TeamSettingsService {
    public record View(TeamSettingsRepository.Branding branding,TeamSettingsRepository.Preferences preferences,String displayName,boolean editableName,java.util.List<TeamSettingsRepository.ChannelPreference> channelPreferences) {}
    private final TeamAccessService access;
    private final TeamIdentityRepository accounts;
    private final TeamSettingsRepository settings;
    private final com.crystalpower.website.repository.TeamChannelRepository channels;
    private final TeamGroupService groups;
    public TeamSettingsService(TeamAccessService access,TeamIdentityRepository accounts,TeamSettingsRepository settings,com.crystalpower.website.repository.TeamChannelRepository channels,TeamGroupService groups) { this.access=access;this.accounts=accounts;this.settings=settings;this.channels=channels;this.groups=groups; }
    public View view(TeamAccessService.Actor actor) {
        var visibleGroups=groups.visibleIds(actor);
        var visible=channels.channels(actor.workspaceId()).stream().filter(channel->actor.audience(channel.audience()) && (channel.groupId()==null || visibleGroups.contains(channel.groupId()))).map(com.crystalpower.website.repository.TeamChannelRepository.Channel::id).collect(java.util.stream.Collectors.toSet());
        return new View(settings.branding(actor.workspaceId()),settings.preferences(actor.workspaceId(),key(actor)),actor.name(),actor.memberId()!=null,settings.channels(actor.workspaceId(),key(actor)).stream().filter(value->visible.contains(value.channelId())).toList());
    }
    @Transactional public View view(Authentication auth) { var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);return view(actor); }
    private TeamAccessService.Actor writer(Authentication auth) { var actor=access.resolve(auth);accounts.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.READ_CHANNELS);return actor; }
    @Transactional public View branding(Authentication auth,int version,String name,String tagline) { var actor=writer(auth);actor.require(TeamPermission.MANAGE_SETTINGS);if(settings.branding(actor.workspaceId(),version,name.strip(),tagline.strip())!=1)throw conflict();audit(actor,"TEAM_WORKSPACE_SETTINGS_CHANGED");return view(actor); }
    @Transactional public View preferences(Authentication auth,int version,String name,boolean compact,boolean unread,boolean mentions) {
        var actor=writer(auth);if(actor.memberId()==null && !name.equals(actor.name()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The protected owner's name is managed separately.");
        if(settings.preferences(actor.workspaceId(),key(actor),actor.ownerId(),actor.memberId(),new TeamSettingsRepository.Preferences(compact,unread,mentions,version))!=1)throw conflict();
        if(actor.memberId()!=null)settings.displayName(actor.workspaceId(),actor.memberId(),name.strip());audit(actor,"TEAM_PERSONAL_SETTINGS_CHANGED");return view(access.resolve(auth));
    }
    private void audit(TeamAccessService.Actor actor,String event) { accounts.auditActor(actor.workspaceId(),actor.ownerId(),actor.memberId(),event,actor.memberId()==null ? actor.ownerId() : actor.memberId()); }
    private void channelAccess(TeamAccessService.Actor actor,java.util.UUID id,boolean lock) {
        actor.require(TeamPermission.READ_CHANNELS);var channel=channels.channel(actor.workspaceId(),id,lock).orElseThrow(TeamSettingsService::missing);
        if(channel.archived() || !actor.audience(channel.audience()) || !groups.allows(actor,channel.groupId()))throw missing();
    }
    @Transactional public TeamSettingsRepository.ChannelPreference channel(Authentication auth,java.util.UUID id) { var actor=access.resolve(auth);channelAccess(actor,id,false);return settings.channel(actor.workspaceId(),key(actor),id); }
    @Transactional public TeamSettingsRepository.ChannelPreference channel(Authentication auth,java.util.UUID id,int version,boolean unread,boolean mentions,boolean favourite) {
        var actor=writer(auth);channelAccess(actor,id,true);
        if(settings.channel(actor.workspaceId(),key(actor),actor.ownerId(),actor.memberId(),new TeamSettingsRepository.ChannelPreference(id,unread,mentions,favourite,version))!=1)throw conflict();
        accounts.auditActor(actor.workspaceId(),actor.ownerId(),actor.memberId(),"TEAM_CHANNEL_PREFERENCES_CHANGED",id);return settings.channel(actor.workspaceId(),key(actor),id);
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This channel is unavailable."); }
    private static String key(TeamAccessService.Actor actor) { return actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId(); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"Settings changed in another session. Reload before saving again."); }
}
