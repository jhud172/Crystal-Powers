package com.crystalpower.website.service;

import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.ClientRepository;
import com.crystalpower.website.security.TeamPermission;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class SupportRequestService {
    public record Summary(UUID id, String clientName, String clientEmail, String intent, String subject, String state, int progress, String nextStep, UUID assignedMemberId, String notificationState, int version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {}
    public record Assignee(UUID id, String displayName, String role) {}
    public record Detail(Summary request, JsonNode brief, List<SupportRepository.Message> messages, List<SupportRepository.Event> events, List<SupportRepository.Attachment> attachments, boolean emailAvailable, String contactPreference, List<ClientRepository.Message> clientReplies) {}
    public record Overview(Summary request,JsonNode brief,List<SupportRepository.Attachment> attachments,boolean emailAvailable,String contactPreference,String actorScope,java.util.Set<TeamPermission> permissions) {}
    public record Page<T>(List<T> items,UUID nextCursor) {}
    public record Delivery(SupportRepository.Request request, SupportRepository.Message message, boolean claimed) {}
    private final TeamAccessService access;
    private final SupportRepository repository;
    private final TeamIdentityRepository teams;
    private final ObjectMapper json;
    private final EmailTransport mail;
    private final ClientRepository clients;
    private final TeamRoleResolver roles;
    public SupportRequestService(TeamAccessService access, SupportRepository repository, TeamIdentityRepository teams, ObjectMapper json, EmailTransport mail, ClientRepository clients, TeamRoleResolver roles) { this.roles=roles; this.access = access; this.repository = repository; this.teams = teams; this.json = json; this.mail = mail; this.clients = clients; }
    private TeamAccessService.Actor reader(Authentication authentication) { var actor = access.resolve(authentication); actor.require(TeamPermission.READ_SUPPORT); repository.claimUnassigned(actor.workspaceId()); return actor; }
    @Transactional
    public List<Summary> list(Authentication authentication, String state, UUID before) {
        var actor = reader(authentication); var cursor = before == null ? null : request(actor, before, false);
        return repository.list(actor.workspaceId(), state, cursor).stream().map(this::summary).toList();
    }
    @Transactional
    public List<Assignee> assignees(Authentication authentication) { var actor = reader(authentication); var members=teams.members(actor.workspaceId());var permissions=roles.permissions(actor.workspaceId(),members);return members.stream().filter(member -> member.state().equals("ACTIVE") && permissions.get(member.id()).contains(TeamPermission.READ_SUPPORT)).map(member -> new Assignee(member.id(), member.displayName(), member.role().name())).toList(); }
    @Transactional public Page<Summary> requestPage(Authentication auth,String state,UUID before) { var actor=reader(auth);var cursor=before==null ? null : request(actor,before,false);return page(repository.requestPage(actor.workspaceId(),state,cursor).stream().map(this::summary).toList(),Summary::id); }
    @Transactional
    public Detail detail(Authentication authentication, UUID id) {
        var actor = reader(authentication); var request = request(actor, id, false);
        String preference=contactPreference(actor.workspaceId(),id);
        try { return new Detail(summary(request), json.readTree(request.payload()), repository.messages(id), repository.events(id), repository.attachments(id), mail.configured() && !preference.equals("PORTAL_ONLY"), preference, clients.replies(id)); }
        catch (java.io.IOException invalid) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The saved brief could not be opened. Please contact the owner."); }
    }
    @Transactional public Overview overview(Authentication auth,UUID id) {
        var actor=reader(auth);var request=request(actor,id,false);
        String preference=contactPreference(actor.workspaceId(),id);
        try{return new Overview(summary(request),json.readTree(request.payload()),repository.attachments(id),mail.configured() && !preference.equals("PORTAL_ONLY"),preference,actor.memberId()==null ? "OWNER:"+actor.ownerId() : "TEAM:"+actor.memberId(),actor.permissions());}
        catch(java.io.IOException invalid){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The saved brief could not be opened. Please contact the owner.");}
    }
    @Transactional public Object updates(Authentication auth,UUID id,String kind,UUID before) {
        var actor=reader(auth);request(actor,id,false);
        return switch(kind){
            case "MESSAGES" -> page(repository.messagePage(id,before==null ? null : repository.message(id,before).orElseThrow(SupportRequestService::missing)),SupportRepository.Message::id);
            case "REPLIES" -> page(clients.replyPage(id,before==null ? null : clients.replyCursor(id,before).orElseThrow(SupportRequestService::missing)),ClientRepository.Message::id);
            case "EVENTS" -> page(repository.eventPage(id,before==null ? null : repository.event(id,before).orElseThrow(SupportRequestService::missing)),SupportRepository.Event::id);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a valid request update collection.");
        };
    }
    private static <T> Page<T> page(List<T> rows,java.util.function.Function<T,UUID> key) { boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;return new Page<>(page,more ? key.apply(page.get(page.size()-1)) : null); }
    @Transactional
    public Summary update(Authentication authentication, UUID id, int expectedVersion, String state, int progress, String nextStep, UUID assigned) {
        var actor = reader(authentication); actor.require(TeamPermission.UPDATE_TRACKING); var current = request(actor, id, true);
        if (assigned != null) {
            var member = teams.member(actor.workspaceId(), assigned).filter(value -> value.state().equals("ACTIVE") && roles.permissions(value).contains(TeamPermission.READ_SUPPORT)).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an active team member who can handle enquiries."));
        }
        int value = state.equals("COMPLETED") ? 100 : progress;
        if (repository.update(actor.workspaceId(), id, expectedVersion, state, value, nextStep.strip(), assigned) != 1) throw conflict();
        if (!Objects.equals(assigned, current.assignedMemberId())) repository.event(id, actor.ownerId(), actor.memberId(), "ASSIGNMENT_CHANGED", "Request ownership was updated.", false);
        repository.event(id, actor.ownerId(), actor.memberId(), "PROGRESS_UPDATED", "Status: " + state.replace('_', ' ') + ". Progress: " + value + "%. Next step: " + nextStep.strip(), true);
        return summary(request(actor, id, false));
    }
    @Transactional
    public SupportRepository.Message addMessage(Authentication authentication, UUID id, UUID key, String kind, String body) {
        var actor = reader(authentication); actor.require(TeamPermission.REPLY_SUPPORT); request(actor, id, true);
        var existing = repository.messageSubmission(key);
        if (existing.isPresent()) {
            var message = existing.get();
            if (!message.requestId().equals(id) || !message.kind().equals(kind) || !message.body().equals(body.strip()) || !Objects.equals(message.authorOwnerId(), actor.ownerId()) || !Objects.equals(message.authorTeamId(), actor.memberId())) throw conflict();
            return message;
        }
        var message = repository.addMessage(id, key, actor.ownerId(), actor.memberId(), kind, body.strip());
        repository.event(id, actor.ownerId(), actor.memberId(), kind.equals("CLIENT") ? "CLIENT_MESSAGE_SAVED" : "INTERNAL_NOTE_SAVED", kind.equals("CLIENT") ? "A message for the client was saved." : "An internal note was saved.", false);
        return message;
    }
    @Transactional
    public Delivery claimDelivery(Authentication authentication, UUID id, UUID messageId) {
        var actor = reader(authentication); actor.require(TeamPermission.REPLY_SUPPORT); var request = request(actor, id, true);
        var message = repository.message(id, messageId).orElseThrow(SupportRequestService::missing);
        if (!message.kind().equals("CLIENT")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Internal notes cannot be emailed to a client.");
        if (message.deliveryState().equals("SENT")) return new Delivery(request, message, false);
        var linked=clients.linked(actor.workspaceId(),id);
        if(linked.isPresent()) {
            var account=clients.account(linked.get().id(),true).orElseThrow(SupportRequestService::missing);
            if(clients.preferences(account.id()).contactPreference().equals("PORTAL_ONLY")) throw new ResponseStatusException(HttpStatus.CONFLICT,"This client has chosen portal-only support updates. Share the message in their client portal instead.");
        }
        if (!mail.configured()) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Company email is not configured. The client message is saved in the hub.");
        if (!repository.claimDelivery(id, messageId, OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15))) throw new ResponseStatusException(HttpStatus.CONFLICT, "This message is already being sent. Reload its status before trying again.");
        repository.event(id, actor.ownerId(), actor.memberId(), "CLIENT_EMAIL_STARTED", "A client email was submitted for delivery.", false);
        return new Delivery(request, message, true);
    }
    @Transactional
    public SupportRepository.FileContent download(Authentication authentication, UUID attachment) {
        var actor = access.resolve(authentication);
        boolean moderator = actor.permissions().contains(TeamPermission.REVIEW_UPLOADS);
        if (!moderator) actor.require(TeamPermission.READ_SUPPORT);
        var file = repository.file(actor.workspaceId(), attachment).orElseThrow(SupportRequestService::missing);
        if (!file.attachment().scanState().equals("CLEAN")) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This file is quarantined until a clean scan is recorded.");
        if (!moderator && !file.attachment().reviewState().equals("APPROVED")) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This file is awaiting moderation or was rejected.");
        return file;
    }
    @Transactional
    public void shareToPortal(Authentication authentication,UUID request,UUID message) {
        var actor=reader(authentication); actor.require(TeamPermission.REPLY_SUPPORT); request(actor,request,true);
        var existing=repository.message(request,message).orElseThrow(SupportRequestService::missing);
        if(!existing.kind().equals("CLIENT")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Internal notes cannot be shared to a client.");
        if(existing.portalVisible()) return;
        if(!clients.share(request,message)) throw missing();
        repository.event(request,actor.ownerId(),actor.memberId(),"CLIENT_PORTAL_MESSAGE_SHARED","A client message was shared to the private portal.",false);
    }
    private String contactPreference(UUID workspace,UUID request) { return clients.linked(workspace,request).map(account -> clients.preferences(account.id()).contactPreference()).orElse("UNLINKED"); }
    private SupportRepository.Request request(TeamAccessService.Actor actor, UUID id, boolean lock) { return repository.request(actor.workspaceId(), id, lock).orElseThrow(SupportRequestService::missing); }
    private Summary summary(SupportRepository.Request r) { return new Summary(r.id(), r.clientName(), r.clientEmail(), r.intent(), r.subject(), r.state(), r.progress(), r.nextStep(), r.assignedMemberId(), r.notificationState(), r.version(), r.createdAt(), r.updatedAt()); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "This request, message or file is unavailable."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT, "This request changed. Reload before trying again; your unsaved text remains in this tab."); }
}
