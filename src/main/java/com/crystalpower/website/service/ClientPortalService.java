package com.crystalpower.website.service;

import com.crystalpower.website.repository.ClientRepository;
import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.security.ClientPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class ClientPortalService {
    public record Detail(ClientRepository.Project project,List<ClientRepository.Message> messages,List<SupportRepository.Event> history,List<SupportRepository.Attachment> files) {}
    public record Overview(ClientRepository.Project project,List<SupportRepository.Attachment> files,UUID clientId,UUID workspaceId) {}
    public record Page<T>(List<T> items,String nextCursor) {}
    public record ProjectPage(List<ClientRepository.Project> projects,String nextCursor,long total,UUID clientId,UUID workspaceId) {}
    private final ClientAccessService access;
    private final ClientRepository clients;
    private final SupportRepository support;
    public ClientPortalService(ClientAccessService access,ClientRepository clients,SupportRepository support) { this.access=access; this.clients=clients; this.support=support; }
    private ClientPrincipal actor(Authentication auth) { return access.resolve(auth); }
    private ClientRepository.Project project(ClientPrincipal principal,UUID request) {
        // Staff recovery locks request then account. Match that order to avoid a lock cycle.
        var project=clients.project(principal.id(),principal.workspaceId(),request).orElseThrow(ClientPortalService::missing);
        var current=clients.account(principal.id(),true).orElseThrow(ClientPortalService::missing);
        if(!current.state().equals("ACTIVE") || current.version()!=principal.credentialsVersion() || !current.workspaceId().equals(principal.workspaceId())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Please sign in again.");
        return project;
    }
    @Transactional public List<ClientRepository.Project> list(Authentication auth) { var actor=actor(auth); return clients.projects(actor.id(),actor.workspaceId()); }
    @Transactional(readOnly=true) public ProjectPage projects(Authentication auth,String before) {
        var actor=actor(auth);var cursor=before==null ? null : clients.projectAnchor(actor.id(),actor.workspaceId(),parse(before)).orElseThrow(ClientPortalService::missing);
        var rows=clients.projectPage(actor.id(),actor.workspaceId(),cursor);boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;
        return new ProjectPage(page,more ? page.get(page.size()-1).id().toString() : null,clients.projectTotal(actor.id(),actor.workspaceId()),actor.id(),actor.workspaceId());
    }
    @Transactional public Detail detail(Authentication auth,UUID request) { var actor=actor(auth); return new Detail(project(actor,request),clients.messages(request),clients.history(request),support.attachments(request).stream().filter(a -> a.removedAt()==null && a.reviewState().equals("APPROVED") && a.scanState().equals("CLEAN")).map(a -> new SupportRepository.Attachment(a.id(),a.filename(),a.contentType(),a.sizeBytes(),a.reviewState(),"",a.version(),a.scanState(),a.scannedAt(),a.removedAt())).toList()); }
    @Transactional public Overview overview(Authentication auth,UUID request) { var actor=actor(auth);return new Overview(project(actor,request),support.attachments(request).stream().filter(a->a.removedAt()==null && a.reviewState().equals("APPROVED") && a.scanState().equals("CLEAN")).map(a->new SupportRepository.Attachment(a.id(),a.filename(),a.contentType(),a.sizeBytes(),a.reviewState(),"",a.version(),a.scanState(),a.scannedAt(),a.removedAt())).toList(),actor.id(),actor.workspaceId()); }
    @Transactional public Page<ClientRepository.Message> conversation(Authentication auth,UUID request,String before) {
        var actor=actor(auth);project(actor,request);ClientRepository.Message cursor=null;
        if(before!=null){if(before.length()>50)throw badCursor();int colon=before.indexOf(':');if(colon<0 || !java.util.Set.of("TEAM","CLIENT").contains(before.substring(0,colon)))throw badCursor();UUID id=parse(before.substring(colon+1));cursor=clients.messageCursor(request,id,before.substring(0,colon)).orElseThrow(ClientPortalService::missing);}
        var rows=clients.messagePage(request,cursor);boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;var last=page.isEmpty() ? null : page.get(page.size()-1);return new Page<>(page,more ? last.direction()+":"+last.id() : null);
    }
    @Transactional public Page<SupportRepository.Event> history(Authentication auth,UUID request,String before) {
        var actor=actor(auth);project(actor,request);var cursor=before==null ? null : clients.eventCursor(request,parse(before)).orElseThrow(ClientPortalService::missing);var rows=clients.historyPage(request,cursor);boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;return new Page<>(page,more ? page.get(page.size()-1).id().toString() : null);
    }
    private static UUID parse(String value) { if(value.length()!=36)throw badCursor();try{UUID id=UUID.fromString(value);if(!id.toString().equalsIgnoreCase(value))throw badCursor();return id;}catch(IllegalArgumentException invalid){throw badCursor();} }
    private static ResponseStatusException badCursor() { return new ResponseStatusException(HttpStatus.BAD_REQUEST,"This update cursor is invalid. Return to the latest page."); }
    @Transactional public UUID reply(Authentication auth,UUID request,UUID key,String body) {
        var actor=actor(auth); project(actor,request);
        String clean=body.strip();
        if(clean.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Write a message before sending it.");
        var existing=clients.replySubmission(key);
        if(existing.isPresent()) {
            var original=existing.get();
            if(!original.requestId().equals(request) || !original.accountId().equals(actor.id()) || !original.body().equals(clean)) throw replyConflict();
            return original.id();
        }
        try { return clients.reply(request,actor.id(),key,clean); }
        catch(org.springframework.dao.DuplicateKeyException concurrentSubmission) { throw replyConflict(); }
    }
    private static ResponseStatusException replyConflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"This submission key was already used for a different reply. Your message has not been sent again."); }
    @Transactional public SupportRepository.FileContent file(Authentication auth,UUID id) { var actor=actor(auth); UUID request=clients.fileRequest(actor.id(),actor.workspaceId(),id).orElseThrow(ClientPortalService::missing); project(actor,request); var file=support.file(actor.workspaceId(),id).orElseThrow(ClientPortalService::missing); if(!file.attachment().reviewState().equals("APPROVED") || !file.attachment().scanState().equals("CLEAN")) throw missing(); return file; }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This client project, update or file is unavailable."); }
}
