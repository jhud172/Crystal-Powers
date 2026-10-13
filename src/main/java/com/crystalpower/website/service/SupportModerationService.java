package com.crystalpower.website.service;

import com.crystalpower.website.repository.SupportRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class SupportModerationService {
    public record Page(List<SupportRepository.ModerationFile> files,UUID nextCursor,java.util.Map<String,Long> totals) {}
    private final TeamAccessService access;
    private final SupportRepository repository;
    public SupportModerationService(TeamAccessService access, SupportRepository repository) { this.access = access; this.repository = repository; }
    @Transactional public List<SupportRepository.ModerationFile> list(Authentication authentication, String state) { var actor = access.resolve(authentication); actor.require(TeamPermission.REVIEW_UPLOADS); return repository.moderationFiles(actor.workspaceId(), state); }
    @Transactional(readOnly=true) public Page page(Authentication authentication,String state,UUID after) {
        var actor=access.resolve(authentication);actor.require(TeamPermission.REVIEW_UPLOADS);
        var cursor=after==null ? null : repository.moderationFile(actor.workspaceId(),after).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"The upload page is unavailable."));
        var rows=repository.moderationPage(actor.workspaceId(),state,cursor);boolean more=rows.size()>50;var page=more ? rows.subList(0,50) : rows;
        return new Page(page,more ? page.get(page.size()-1).attachment().id() : null,repository.moderationTotals(actor.workspaceId()));
    }
    @Transactional public Object remove(Authentication authentication,UUID id,int version,String reason) {
        var actor=access.resolve(authentication);actor.require(TeamPermission.REVIEW_UPLOADS);actor.require(TeamPermission.EDIT_UPLOADS);
        var file=repository.moderationFile(actor.workspaceId(),id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"This upload is unavailable."));
        if(repository.remove(actor.workspaceId(),id,version)!=1)throw new ResponseStatusException(HttpStatus.CONFLICT,"This upload changed or was already removed. Reload before continuing.");
        repository.event(file.requestId(),actor.ownerId(),actor.memberId(),"UPLOAD_CONTENT_REMOVED","Stored content removed for "+file.attachment().filename()+". Reason: "+reason.strip(),false);
        return repository.moderationFile(actor.workspaceId(),id).orElseThrow();
    }
    @Transactional public SupportRepository.ModerationFile review(Authentication authentication, UUID id, int version, String state, String note) {
        var actor = access.resolve(authentication); actor.require(TeamPermission.REVIEW_UPLOADS);
        var file = repository.moderationFile(actor.workspaceId(), id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "This upload is unavailable."));
        if (state.equals("APPROVED") && !file.attachment().scanState().equals("CLEAN")) throw new ResponseStatusException(HttpStatus.CONFLICT, "A clean scan is required before approval. Quarantined files cannot be released manually.");
        if (repository.review(actor.workspaceId(), id, version, state, note.strip()) != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "This upload was reviewed elsewhere. Reload before deciding again.");
        repository.event(file.requestId(), actor.ownerId(), actor.memberId(), "UPLOAD_" + state, "File " + file.attachment().filename() + ": " + state.toLowerCase() + ". " + note.strip(), false);
        return repository.moderationFile(actor.workspaceId(), id).orElseThrow();
    }
}
