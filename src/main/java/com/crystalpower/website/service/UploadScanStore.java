package com.crystalpower.website.service;

import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.TeamPermission;
import com.crystalpower.website.security.AttemptLimiter;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class UploadScanStore {
    public record Lease(UUID workspace,UUID file,UUID request,UUID token,int version,String filename,String type,long size,byte[] content) {}
    private final TeamAccessService access;
    private final SupportRepository files;
    private final JdbcTemplate db;
    private final AttemptLimiter limiter;
    private final TeamIdentityRepository teams;
    public UploadScanStore(TeamAccessService access,SupportRepository files,JdbcTemplate db,AttemptLimiter limiter,TeamIdentityRepository teams) { this.access=access;this.files=files;this.db=db;this.limiter=limiter;this.teams=teams; }
    private TeamAccessService.Actor writer(Authentication auth){var actor=access.resolve(auth);actor.require(TeamPermission.REVIEW_UPLOADS);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.REVIEW_UPLOADS);return actor;}
    @Transactional public Lease begin(Authentication auth,UUID id,int version) {
        var actor=writer(auth);limiter.check("upload-scan:"+(actor.memberId()==null ? actor.ownerId() : actor.memberId()),10,60);
        var file=files.moderationFile(actor.workspaceId(),id).orElseThrow(UploadScanStore::missing);UUID token=UUID.randomUUID();
        int changed=db.update("UPDATE support_attachment SET scan_state='SCANNING',scan_token=?,scan_started_at=CURRENT_TIMESTAMP,scanned_at=NULL,review_state='PENDING',version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND (scan_state IN ('UNSCANNED','ERROR') OR (scan_state='SCANNING' AND scan_started_at<?)) AND EXISTS(SELECT 1 FROM support_request r WHERE r.id=support_attachment.request_id AND r.workspace_id=?)",token,id,version,OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5),actor.workspaceId());
        if(changed!=1)throw conflict();var content=files.file(actor.workspaceId(),id).orElseThrow(UploadScanStore::missing);
        files.event(file.requestId(),actor.ownerId(),actor.memberId(),"UPLOAD_SCAN_STARTED","A private upload was quarantined for scanning.",false);
        return new Lease(actor.workspaceId(),id,file.requestId(),token,version+1,file.attachment().filename(),file.attachment().contentType(),file.attachment().sizeBytes(),content.content());
    }
    @Transactional public SupportRepository.ModerationFile finish(Authentication auth,Lease lease,String state) {
        var actor=writer(auth);if(!actor.workspaceId().equals(lease.workspace()))throw missing();
        if(!java.util.Set.of("CLEAN","INFECTED","ERROR").contains(state))throw new IllegalArgumentException("Invalid scanner state");
        int changed=db.update("UPDATE support_attachment SET scan_state=?,scanned_at=CURRENT_TIMESTAMP,scan_token=NULL,scan_started_at=NULL,review_state=?,version=version+1 WHERE id=? AND version=? AND removed_at IS NULL AND scan_token=? AND scan_state='SCANNING' AND scan_started_at>=? AND EXISTS(SELECT 1 FROM support_request r WHERE r.id=support_attachment.request_id AND r.workspace_id=?)",state,state.equals("INFECTED") ? "REJECTED" : "PENDING",lease.file(),lease.version(),lease.token(),OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5),lease.workspace());
        if(changed!=1)throw conflict();files.event(lease.request(),actor.ownerId(),actor.memberId(),"UPLOAD_SCAN_"+state,"Private upload scan result: "+state.toLowerCase()+". Human review is still required before release.",false);
        return files.moderationFile(lease.workspace(),lease.file()).orElseThrow(UploadScanStore::missing);
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This upload is unavailable."); }
    private static ResponseStatusException conflict() { return new ResponseStatusException(HttpStatus.CONFLICT,"The upload changed, is already clean/blocked, or has a scan in progress. Reload; an interrupted scan can be retried after five minutes."); }
}
