package com.crystalpower.website.service;

import com.crystalpower.website.dto.ProjectView;
import com.crystalpower.website.dto.ProjectContent;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.ProjectRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Explicit project access never promotes a team principal into the owner account. */
@Service
public class TeamProjectService {
    public record Scope(UUID workspaceId,Instant updatedAt) {}
    private final ProjectRepository projects;
    private final TeamAccessService access;
    private final ProjectService editing;
    private final TeamIdentityRepository identities;
    private final com.fasterxml.jackson.databind.ObjectMapper json;
    public TeamProjectService(ProjectRepository projects,TeamAccessService access,ProjectService editing,TeamIdentityRepository identities,com.fasterxml.jackson.databind.ObjectMapper json) { this.projects=projects;this.access=access;this.editing=editing;this.identities=identities;this.json=json; }
    private TeamAccessService.Actor reader(Authentication auth) { var actor=access.resolve(auth);actor.require(TeamPermission.EDIT_PROJECTS);return actor; }
    @Transactional
    public List<ProjectView> list(Authentication auth) { return projects.workspaceDrafts(reader(auth).workspaceId()); }
    public record Overview(String actorScope,List<ProjectView> projects) {}
    @Transactional
    public Overview overview(Authentication auth) { var actor=reader(auth);return new Overview(actor.memberId()!=null ? "TEAM:"+actor.memberId() : "OWNER:"+actor.ownerId(),projects.workspaceDrafts(actor.workspaceId())); }
    public record Page(String actorScope,List<ProjectView> projects,String nextCursor,long total) {}
    @Transactional
    public Page page(Authentication auth,String before) {
        var actor=reader(auth);ProjectRepository.ProjectAnchor cursor=null;
        if(before!=null){UUID id;try{id=UUID.fromString(before);if(!id.toString().equals(before))throw new IllegalArgumentException();}catch(IllegalArgumentException failure){throw missing();}cursor=projects.workspaceAnchor(actor.workspaceId(),id).orElseThrow(TeamProjectService::missing);}
        var rows=projects.workspacePage(actor.workspaceId(),cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;
        return new Page(actor.memberId()!=null ? "TEAM:"+actor.memberId() : "OWNER:"+actor.ownerId(),items,more ? items.get(items.size()-1).id().toString() : null,projects.workspaceTotal(actor.workspaceId()));
    }
    @Transactional
    public ProjectService.RevisionPage revisionPage(Authentication auth,UUID id,Integer before) { draft(auth,id);return editing.revisionPage(id,before); }
    @Transactional
    public ProjectView draft(Authentication auth,UUID id) { return projects.workspaceDraft(reader(auth).workspaceId(),id).orElseThrow(TeamProjectService::missing); }
    public record Detail(String actorScope,ProjectView project) {}
    @Transactional
    public Detail detail(Authentication auth,UUID id) { var actor=reader(auth);return new Detail(actor.memberId()!=null ? "TEAM:"+actor.memberId() : "OWNER:"+actor.ownerId(),projects.workspaceDraft(actor.workspaceId(),id).orElseThrow(TeamProjectService::missing)); }
    @Transactional
    public List<ProjectRepository.Revision> revisions(Authentication auth,UUID id) { draft(auth,id);return projects.revisions(id); }
    private TeamAccessService.Actor writer(Authentication auth,UUID id,boolean publishing) {
        var actor=reader(auth);identities.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.EDIT_PROJECTS);if(publishing)actor.require(TeamPermission.PUBLISH_PROJECTS);
        var scope=projects.lockTeamScope(id).orElseThrow(TeamProjectService::missing);if(!actor.workspaceId().equals(scope.workspaceId()))throw missing();return actor;
    }
    @Transactional
    public ProjectRepository.Editor mediaEditor(Authentication auth,UUID id) { return editor(writer(auth,id,false)); }
    private ProjectRepository.Editor editor(TeamAccessService.Actor actor) { return new ProjectRepository.Editor(actor.ownerId(),actor.memberId(),actor.workspaceId()); }
    private void recheck(Authentication auth,UUID id,boolean publishing) { var actor=reader(auth);if(publishing)actor.require(TeamPermission.PUBLISH_PROJECTS);projects.workspaceDraft(actor.workspaceId(),id).orElseThrow(TeamProjectService::missing); }
    @Transactional
    public ProjectView create(Authentication auth,UUID submissionKey,String slug,ProjectContent content) {
        var actor=reader(auth);identities.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.EDIT_PROJECTS);
        if(submissionKey==null)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"A project submission reference is required.");
        String fingerprint=fingerprint(slug,content);var existing=projects.creation(submissionKey);
        if(existing.isPresent()){
            var saved=existing.get();if(!actor.workspaceId().equals(saved.workspaceId()) || !java.util.Objects.equals(actor.ownerId(),saved.ownerId()) || !java.util.Objects.equals(actor.memberId(),saved.memberId()) || !fingerprint.equals(saved.fingerprint()))throw new ResponseStatusException(HttpStatus.CONFLICT,"This project submission is unavailable or was used for different input.");
            recheck(auth,saved.id(),false);return draft(auth,saved.id());
        }
        var created=editing.createAs(slug,content,editor(actor));projects.teamScope(created.id(),actor.workspaceId());projects.creation(created.id(),submissionKey,editor(actor),fingerprint);recheck(auth,created.id(),false);return draft(auth,created.id());
    }
    private record CreationInput(String slug,ProjectContent content) {}
    private String fingerprint(String slug,ProjectContent content) { try{return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(new CreationInput(slug,content))));}catch(java.security.NoSuchAlgorithmException | com.fasterxml.jackson.core.JsonProcessingException failure){throw new IllegalStateException("Project submission could not be recorded",failure);} }

    @Transactional
    public ProjectView save(Authentication auth,UUID id,int expectedVersion,ProjectContent content) { var actor=writer(auth,id,false);var saved=editing.saveAs(id,expectedVersion,content,editor(actor));recheck(auth,id,false);return saved; }
    @Transactional
    public ProjectView restore(Authentication auth,UUID id,int version,int expectedVersion) { var actor=writer(auth,id,false);var saved=editing.restoreRevisionAs(id,version,expectedVersion,editor(actor));recheck(auth,id,false);return saved; }
    @Transactional
    public ProjectView publish(Authentication auth,UUID id,int expectedVersion) { var actor=writer(auth,id,true);var saved=editing.publishAs(id,expectedVersion,editor(actor));recheck(auth,id,true);return saved; }
    @Transactional
    public ProjectView unpublish(Authentication auth,UUID id,Instant expectedUpdatedAt) { var actor=writer(auth,id,true);snapshot(id,expectedUpdatedAt);var saved=editing.unpublishAs(id,editor(actor));recheck(auth,id,true);return saved; }
    @Transactional
    public ProjectView presentation(Authentication auth,UUID id,boolean featured,int sortOrder,boolean archived,Instant expectedUpdatedAt) {
        var actor=writer(auth,id,false);snapshot(id,expectedUpdatedAt);boolean published=projects.workspaceDraft(actor.workspaceId(),id).orElseThrow(TeamProjectService::missing).publishedVersion()!=null;
        if(published)actor.require(TeamPermission.PUBLISH_PROJECTS);
        var saved=editing.presentationAs(id,featured,sortOrder,archived,editor(actor),expectedUpdatedAt);recheck(auth,id,published);return saved;
    }
    private void snapshot(UUID id,Instant expectedUpdatedAt) { if(expectedUpdatedAt==null || !projects.lockTeamScope(id).orElseThrow(TeamProjectService::missing).updatedAt().equals(expectedUpdatedAt))throw new ResponseStatusException(HttpStatus.CONFLICT,"This project changed. Reload before changing publication."); }
    @Transactional
    public Scope scope(Authentication auth,UUID id) {
        var actor=access.resolve(auth);if(actor.ownerId()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the protected owner can inspect project workspace access.");
        var current=projects.lockTeamScope(id).orElseThrow(TeamProjectService::missing);
        if(current.workspaceId()!=null && !current.workspaceId().equals(actor.workspaceId()))throw missing();
        return new Scope(current.workspaceId(),current.updatedAt());
    }
    @Transactional
    public Scope assign(Authentication auth,UUID id,boolean enabled,Instant expectedUpdatedAt) {
        var actor=access.resolve(auth);if(actor.ownerId()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the protected owner can change project workspace access.");
        identities.lockWorkspace(actor.workspaceId());
        actor=access.resolveLocked(auth);
        if(actor.ownerId()==null)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Only the protected owner can change project workspace access.");
        var current=projects.lockTeamScope(id).orElseThrow(TeamProjectService::missing);
        if(current.workspaceId()!=null && !current.workspaceId().equals(actor.workspaceId()))throw missing();
        if(expectedUpdatedAt==null || !current.updatedAt().equals(expectedUpdatedAt))throw new ResponseStatusException(HttpStatus.CONFLICT,"This project changed. Reload before changing team access.");
        UUID workspace=enabled ? actor.workspaceId() : null;
        if(!java.util.Objects.equals(current.workspaceId(),workspace)){
            projects.teamScope(id,workspace);
            projects.audit(actor.ownerId(),enabled ? "PROJECT_TEAM_ACCESS_GRANTED" : "PROJECT_TEAM_ACCESS_REVOKED",id);
        }
        var saved=projects.lockTeamScope(id).orElseThrow(TeamProjectService::missing);return new Scope(saved.workspaceId(),saved.updatedAt());
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This team project is unavailable."); }
}
