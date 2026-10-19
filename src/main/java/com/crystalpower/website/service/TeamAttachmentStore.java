package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class TeamAttachmentStore {
    public record Page(UUID channelId,long messageId,List<TeamAttachmentRepository.File> files,boolean scannerConfigured) {}
    public record Download(TeamAttachmentRepository.File file,byte[] content) {}
    public record Lease(UUID workspace,UUID channel,long message,UUID file,UUID token,int version,String filename,String type,long size,byte[] content) {}
    private final TeamAccessService access;
    private final TeamIdentityRepository teams;
    private final TeamChannelRepository channels;
    private final TeamAttachmentRepository files;
    private final TeamGroupService groups;
    private final AttemptLimiter limiter;
    private final UploadScanner scanner;
    private final UploadContentValidator validator;
    private final long maxBytes;
    public TeamAttachmentStore(TeamAccessService access,TeamIdentityRepository teams,TeamChannelRepository channels,TeamAttachmentRepository files,TeamGroupService groups,AttemptLimiter limiter,UploadScanner scanner,UploadContentValidator validator,@Value("${app.team-upload.max-workspace-bytes:536870912}") long maxBytes){this.access=access;this.teams=teams;this.channels=channels;this.files=files;this.groups=groups;this.limiter=limiter;this.scanner=scanner;this.validator=validator;this.maxBytes=maxBytes;}
    private TeamAccessService.Actor actor(Authentication auth,UUID channel,long message){
        return actor(auth,channel,message,false);
    }
    private TeamAccessService.Actor actor(Authentication auth,UUID channel,long message,boolean cleanup){
        var actor=access.resolve(auth);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.READ_CHANNELS);if(cleanup)actor.require(TeamPermission.REVIEW_UPLOADS);
        var current=channels.channel(actor.workspaceId(),channel,true).orElseThrow(TeamAttachmentStore::missing);
        if((current.archived() && !cleanup) || !actor.audience(current.audience()) || !(cleanup ? groups.allowsCleanup(actor,current.groupId()) : groups.allows(actor,current.groupId())) || (!cleanup && channels.message(channel,message,false).isEmpty()))throw missing();
        if(cleanup && files.list(channel,message).isEmpty())throw missing();
        return actor;
    }
    private boolean own(TeamAccessService.Actor actor,TeamAttachmentRepository.File file){return actor.memberId()==null ? Objects.equals(actor.ownerId(),file.authorOwnerId()) : Objects.equals(actor.memberId(),file.authorTeamId());}
    private void uploader(TeamAccessService.Actor actor,UUID channel,long message){actor.require(TeamPermission.UPLOAD_FILES);actor.require(TeamPermission.SEND_MESSAGES);var target=channels.message(channel,message,false).orElseThrow(TeamAttachmentStore::missing);boolean own=actor.memberId()==null ? Objects.equals(actor.ownerId(),target.authorOwnerId()) : Objects.equals(actor.memberId(),target.authorTeamId());if(!own)throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Attach files to your own messages.");}
    @Transactional public void authoriseUpload(Authentication auth,UUID channel,long message){var actor=actor(auth,channel,message);uploader(actor,channel,message);limiter.check("team-upload:"+(actor.memberId()==null ? actor.ownerId() : actor.memberId()),20,60);}
    @Transactional public Page list(Authentication auth,UUID channel,long message){var actor=actor(auth,channel,message);boolean review=actor.permissions().contains(TeamPermission.REVIEW_UPLOADS);return new Page(channel,message,files.list(channel,message).stream().filter(f->review || own(actor,f) || (f.removedAt()==null && f.scanState().equals("CLEAN") && f.reviewState().equals("APPROVED"))).toList(),review && scanner.configured());}
    @Transactional public TeamAttachmentRepository.File upload(Authentication auth,UUID channel,long message,UUID key,String fingerprint,String name,String type,byte[] bytes){
        var actor=actor(auth,channel,message);uploader(actor,channel,message);
        var existing=files.submission(key);
        if(existing.isPresent()){var file=files.file(channel,message,existing.get().id()).orElseThrow(TeamAttachmentStore::conflict);if(!own(actor,file) || !existing.get().fingerprint().equals(fingerprint))throw conflict();return file;}
        var records=files.list(channel,message);var active=records.stream().filter(f->f.removedAt()==null).toList();long used=active.stream().mapToLong(TeamAttachmentRepository.File::sizeBytes).sum();
        if(records.size()>=50 || active.size()>=5 || bytes.length>15L*1024*1024-used)throw new ResponseStatusException(HttpStatus.CONFLICT,"This message has reached its file allowance: five active files, 15 MB total and 50 lifetime attachment records.");
        if(maxBytes<1 || bytes.length>maxBytes-files.workspaceBytes(actor.workspaceId()))throw new ResponseStatusException(HttpStatus.CONFLICT,"This workspace has reached its private conversation-file storage allowance. Ask an admin to review retained files.");
        UUID id=files.create(channel,message,actor.ownerId(),actor.memberId(),key,fingerprint,name,type,bytes);channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_SAVED",id);return files.file(channel,message,id).orElseThrow();
    }
    @Transactional public Download download(Authentication auth,UUID channel,long message,UUID id){var actor=actor(auth,channel,message);var file=live(channel,message,id);if(!file.scanState().equals("CLEAN") || (!actor.permissions().contains(TeamPermission.REVIEW_UPLOADS) && !file.reviewState().equals("APPROVED")))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"This file must pass scanning and moderation before download.");return new Download(file,files.content(id));}
    @Transactional public TeamAttachmentRepository.File review(Authentication auth,UUID channel,long message,UUID id,int version,String state,String note){var actor=actor(auth,channel,message);actor.require(TeamPermission.REVIEW_UPLOADS);var file=live(channel,message,id);if(!Set.of("APPROVED","REJECTED").contains(state) || note==null || note.length()>1000)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose approve or reject and a note of at most 1,000 characters.");if(file.scanState().equals("SCANNING") || (state.equals("APPROVED") && !file.scanState().equals("CLEAN")))throw new ResponseStatusException(HttpStatus.CONFLICT,"A clean completed scan is required before approval. A running scan must finish first.");if(!files.review(id,version,state,note.strip()))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_"+state,id);return files.file(channel,message,id).orElseThrow();}
    @Transactional public TeamAttachmentRepository.File remove(Authentication auth,UUID channel,long message,UUID id,int version){var actor=actor(auth,channel,message);var file=live(channel,message,id);if(!own(actor,file))actor.require(TeamPermission.EDIT_UPLOADS);else actor.require(TeamPermission.UPLOAD_FILES);if(!files.remove(id,version))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_REMOVED",id);return files.file(channel,message,id).orElseThrow();}
    @Transactional public Lease begin(Authentication auth,UUID channel,long message,UUID id,int version){var actor=actor(auth,channel,message);actor.require(TeamPermission.REVIEW_UPLOADS);if(!scanner.configured())throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"The private upload scanner is not configured. This file remains quarantined.");limiter.check("team-upload-scan:"+(actor.memberId()==null ? actor.ownerId() : actor.memberId()),10,60);var file=live(channel,message,id);UUID token=UUID.randomUUID();if(!files.scanBegin(id,version,token,OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(5)))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_SCAN_STARTED",id);return new Lease(actor.workspaceId(),channel,message,id,token,version+1,file.filename(),file.contentType(),file.sizeBytes(),files.content(id));}
    @Transactional public TeamAttachmentRepository.File finish(Authentication auth,Lease lease,String state){var actor=actor(auth,lease.channel(),lease.message());actor.require(TeamPermission.REVIEW_UPLOADS);if(!actor.workspaceId().equals(lease.workspace()))throw missing();if(!Set.of("CLEAN","INFECTED","ERROR").contains(state))throw new IllegalArgumentException("Invalid scanner result");if(!files.scanFinish(lease.file(),lease.version(),lease.token(),state))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_SCAN_"+state,lease.file());return files.file(lease.channel(),lease.message(),lease.file()).orElseThrow();}
    public record Queue(List<TeamAttachmentRepository.QueueFile> files,UUID nextCursor) {}
    @Transactional public Queue queue(Authentication auth,String state,boolean inactive,UUID after){
        if(!Set.of("PENDING","APPROVED","REJECTED","REMOVED").contains(state))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a supported attachment queue.");
        var actor=access.resolve(auth);teams.lockWorkspace(actor.workspaceId());actor=access.resolveLocked(auth);actor.require(TeamPermission.READ_CHANNELS);actor.require(TeamPermission.REVIEW_UPLOADS);
        var candidates=new java.util.ArrayList<TeamChannelRepository.Channel>(channels.channels(actor.workspaceId()));candidates.addAll(channels.archivedChannels(actor.workspaceId()));
        var current=actor;var visible=candidates.stream().filter(c->current.audience(c.audience()) && (inactive ? groups.allowsCleanup(current,c.groupId()) : groups.allows(current,c.groupId()))).map(TeamChannelRepository.Channel::id).toList();
        var anchor=after==null ? null : files.queueAnchor(visible,state,inactive,after).orElseThrow(()->new ResponseStatusException(HttpStatus.CONFLICT,"This queue cursor changed or is no longer available. Return to the first page."));
        var results=files.queue(visible,state,inactive,anchor);var page=results.stream().limit(50).toList();return new Queue(page,results.size()>50 ? page.get(page.size()-1).attachment().id() : null);
    }
    @Transactional public Page cleanupList(Authentication auth,UUID channel,long message){actor(auth,channel,message,true);return new Page(channel,message,files.list(channel,message),scanner.configured());}
    @Transactional public TeamAttachmentRepository.File cleanupRemove(Authentication auth,UUID channel,long message,UUID id,int version){var actor=actor(auth,channel,message,true);actor.require(TeamPermission.EDIT_UPLOADS);live(channel,message,id);if(!files.remove(id,version))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_CLEANUP_REMOVED",id);return files.file(channel,message,id).orElseThrow();}
    @Transactional public TeamAttachmentRepository.File rename(Authentication auth,UUID channel,long message,UUID id,int version,String name){var actor=actor(auth,channel,message);actor.require(TeamPermission.EDIT_UPLOADS);var file=live(channel,message,id);if(!validator.filename(name,file.contentType()))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Use a safe filename with the existing file format's matching extension.");if(!files.rename(id,version,name))throw conflict();channels.audit(actor.workspaceId(),actor.ownerId(),actor.memberId(),"CHANNEL_UPLOAD_RENAMED",id);return files.file(channel,message,id).orElseThrow();}
    private TeamAttachmentRepository.File live(UUID channel,long message,UUID id){var file=files.file(channel,message,id).orElseThrow(TeamAttachmentStore::missing);if(file.removedAt()!=null)throw missing();return file;}
    private static ResponseStatusException missing(){return new ResponseStatusException(HttpStatus.NOT_FOUND,"This channel message or attachment is unavailable.");}
    private static ResponseStatusException conflict(){return new ResponseStatusException(HttpStatus.CONFLICT,"This attachment changed or has a scan in progress. Reload its status before trying again; interrupted scans can be retried after five minutes.");}
}
