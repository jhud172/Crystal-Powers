package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamChannelRepository;
import com.crystalpower.website.repository.TeamChannelRepository.Channel;
import com.crystalpower.website.repository.TeamChannelRepository.Message;
import com.crystalpower.website.security.TeamPermission;
import com.crystalpower.website.security.AttemptLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class TeamChannelService {
    public record Workspace(String displayName, UUID ownerId, UUID memberId, List<TeamPermission> permissions, List<Channel> channels,TeamSettingsService.View settings) {}
    public record Conversation(long version,boolean unchanged,List<Message> messages,boolean hasEarlier,boolean hasLater) {}
    private final TeamAccessService access;
    private final TeamChannelRepository repository;
    private final AttemptLimiter limiter;
    private final TeamGroupService groups;
    private final com.crystalpower.website.repository.TeamReadRepository reads;
    private final TeamMentionService mentions;
    private final TeamSettingsService settings;
    public TeamChannelService(TeamAccessService access, TeamChannelRepository repository, AttemptLimiter limiter,TeamGroupService groups,com.crystalpower.website.repository.TeamReadRepository reads,TeamMentionService mentions,TeamSettingsService settings) { this.access = access; this.repository = repository; this.limiter = limiter;this.groups=groups;this.reads=reads;this.mentions=mentions;this.settings=settings; }
    @Transactional
    public Workspace workspace(Authentication authentication) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.READ_CHANNELS);
        repository.initialise(actor.workspaceId());
        var visibleGroups=groups.visibleIds(actor);
        return new Workspace(actor.name(), actor.ownerId(), actor.memberId(), actor.permissions().stream().sorted().toList(), repository.channels(actor.workspaceId()).stream().filter(channel -> actor.audience(channel.audience()) && (channel.groupId()==null || visibleGroups.contains(channel.groupId()))).toList(),settings.view(actor));
    }
    @Transactional
    public Channel create(Authentication authentication, String name, String description, String category, String audience,UUID groupId) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.MANAGE_CHANNELS);
        repository.initialise(actor.workspaceId());
        if (!actor.audience(audience)) throw missing();
        groups.requireAssignable(actor,groupId);
        if(repository.channels(actor.workspaceId()).size()+repository.archivedChannels(actor.workspaceId()).size()>=500)throw new ResponseStatusException(HttpStatus.CONFLICT,"This workspace has reached its channel limit.");
        var channel = repository.create(actor.workspaceId(), name.strip(), description.strip(), category.strip(), audience,groupId);
        repository.audit(actor.workspaceId(), actor.ownerId(), actor.memberId(), "CHANNEL_CREATED", channel.id()); return channel;
    }
    @Transactional
    public Channel change(Authentication authentication, UUID id, int version, String name, String description, String category, String audience, boolean archived,UUID groupId,boolean clearGroup) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.MANAGE_CHANNELS);
        var current = repository.channel(actor.workspaceId(), id, true).orElseThrow(TeamChannelService::missing);
        if (!actor.audience(current.audience()) || !actor.audience(audience)) throw missing();
        if(groupId!=null && clearGroup)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a group or remove its restriction, not both.");
        UUID selected=groupId!=null ? groupId : clearGroup ? null : current.groupId();
        if(!Objects.equals(selected,current.groupId()))actor.require(TeamPermission.MANAGE_GROUPS);
        groups.requireAssignable(actor,selected);
        if (repository.update(actor.workspaceId(), id, version, name.strip(), description.strip(), category.strip(), audience, archived,selected) != 1) throw conflict();
        repository.audit(actor.workspaceId(), actor.ownerId(), actor.memberId(), "CHANNEL_CHANGED", id); return repository.channel(actor.workspaceId(), id, false).orElseThrow();
    }
    @Transactional
    public List<Channel> archived(Authentication authentication) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.MANAGE_CHANNELS);
        var visibleGroups=groups.visibleIds(actor);
        return repository.archivedChannels(actor.workspaceId()).stream().filter(channel -> actor.audience(channel.audience()) && (channel.groupId()==null || visibleGroups.contains(channel.groupId()))).toList();
    }
    @Transactional
    public List<Message> messages(Authentication authentication, UUID id, Long before) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.READ_CHANNELS); channel(actor, id, false); return repository.latest(id, before);
    }
    @Transactional public Conversation conversation(Authentication auth,UUID id,Long knownVersion,Long floor,Long before){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);channel(actor,id,true);if(before!=null && !reads.markerExists(id,before))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This history cursor is unavailable for the channel.");long version=repository.conversationVersion(id);if(knownVersion!=null && knownVersion==version)return new Conversation(version,true,List.of(),false,false);var messages=before==null ? repository.window(id,floor) : repository.latest(id,before);return new Conversation(version,false,messages,!messages.isEmpty() && repository.hasEarlier(id,messages.get(0).id()),!messages.isEmpty() && repository.hasLater(id,messages.get(messages.size()-1).id()));}
    @Transactional
    public Message post(Authentication authentication,UUID id,String body){return post(authentication,id,body,null,null,List.of());}
    @Transactional
    public Message post(Authentication authentication, UUID id, String body,UUID submissionKey,Long replyToId,List<String> mentionKeys) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.SEND_MESSAGES); channel(actor, id, true);
        if (body.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write a message before sending.");
        String clean=body.strip();UUID key=submissionKey==null ? UUID.randomUUID() : submissionKey;
        if(mentionKeys!=null && (mentionKeys.size()>10 || mentionKeys.stream().anyMatch(java.util.Objects::isNull)))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Check the selected mention recipients.");
        List<String> selected=mentionKeys==null ? List.of() : mentionKeys.stream().sorted().toList();
        String fingerprint=fingerprint(id,actor,clean,replyToId,selected);
        var existing=repository.submission(key);
        if(existing.isPresent()) {
            if(!existing.get().channelId().equals(id) || !fingerprint.equals(existing.get().fingerprint()))throw new ResponseStatusException(HttpStatus.CONFLICT,"This submission key was already used for a different message.");
            return repository.message(id,existing.get().id(),false).orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"The original message was posted and subsequently removed. It has not been sent again."));
        }
        if(replyToId!=null && repository.message(id,replyToId,false).isEmpty())throw new ResponseStatusException(HttpStatus.NOT_FOUND,"The message you were replying to is no longer available. Remove the reply selection or choose another message.");
        limiter.check("team-message:" + (actor.memberId() == null ? actor.ownerId() : actor.memberId()), 30, 60);
        selected=mentions.validate(actor,id,selected);
        var message=repository.post(id, actor.ownerId(), actor.memberId(), clean,key,fingerprint,replyToId);
        mentions.add(message.id(),id,selected);return message;
    }
    @Transactional
    public void edit(Authentication authentication, UUID channelId, long id, int version, String body, boolean deleted) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.SEND_MESSAGES); channel(actor, channelId, true);
        var message = repository.message(channelId, id, false).orElseThrow(TeamChannelService::missing);
        boolean own = actor.memberId() != null ? Objects.equals(actor.memberId(), message.authorTeamId()) : Objects.equals(actor.ownerId(), message.authorOwnerId());
        if (!own && !actor.permissions().contains(TeamPermission.MANAGE_MESSAGES)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only change your own messages.");
        if (!deleted && body.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Write a message before saving.");
        if (repository.edit(channelId, id, version, deleted ? "" : body.strip(), deleted) != 1) throw conflict();
        repository.audit(actor.workspaceId(), actor.ownerId(), actor.memberId(), deleted ? "MESSAGE_REMOVED" : "MESSAGE_EDITED", channelId);
    }
    private Channel channel(TeamAccessService.Actor actor, UUID id, boolean lock) {
        actor.require(TeamPermission.READ_CHANNELS);
        var channel = repository.channel(actor.workspaceId(), id, lock).orElseThrow(TeamChannelService::missing);
        if (channel.archived() || !actor.audience(channel.audience()) || !groups.allows(actor,channel.groupId())) throw missing(); return channel;
    }
    @Transactional public List<Message> pins(Authentication auth,UUID id){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);channel(actor,id,false);return repository.pins(id);}
    @Transactional(readOnly=true) public List<com.crystalpower.website.repository.TeamReadRepository.Unread> unread(Authentication auth){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);var visibleGroups=groups.visibleIds(actor);var channels=repository.channels(actor.workspaceId()).stream().filter(c->actor.audience(c.audience()) && (c.groupId()==null || visibleGroups.contains(c.groupId()))).map(Channel::id).collect(java.util.stream.Collectors.toSet());return reads.summary(actor.workspaceId(),readerKey(actor),actor.ownerId(),actor.memberId()).stream().filter(r->channels.contains(r.channelId())).toList();}
    @Transactional public void markRead(Authentication auth,UUID channelId,long through){var actor=access.resolve(auth);actor.require(TeamPermission.READ_CHANNELS);channel(actor,channelId,true);if(through<0 || !reads.markerExists(channelId,through))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a message from this channel to mark as read.");reads.mark(channelId,readerKey(actor),actor.ownerId(),actor.memberId(),through);}
    private static String readerKey(TeamAccessService.Actor actor){return actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId();}
    @Transactional public Message pin(Authentication auth,UUID channelId,long id,int version,boolean pinned){
        var actor=access.resolve(auth);actor.require(TeamPermission.MANAGE_MESSAGES);channel(actor,channelId,true);
        var message=repository.message(channelId,id,false).orElseThrow(TeamChannelService::missing);
        if(message.version()!=version)throw conflict();
        if(message.pinned()==pinned)return message;
        if(pinned && repository.pins(channelId).size()>=50)throw new ResponseStatusException(HttpStatus.CONFLICT,"This channel has 50 pinned messages. Unpin an older item before adding another.");
        if(repository.pin(channelId,id,version,pinned)!=1)throw conflict();
        repository.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),pinned ? "MESSAGE_PINNED" : "MESSAGE_UNPINNED",channelId);
        return repository.message(channelId,id,false).orElseThrow();
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "This channel or message is unavailable."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "This item changed. Reload before saving again."); }
    private static String fingerprint(UUID channel,TeamAccessService.Actor actor,String body,Long reply,List<String> keys){try{String prefix=channel+"|"+(actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId())+"|"+reply+"|";String value=keys.isEmpty() ? prefix+body : "MENTIONS-V1|"+prefix+String.join(",",keys)+"|"+body;return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}catch(java.security.NoSuchAlgorithmException unavailable){throw new IllegalStateException(unavailable);}}
}
