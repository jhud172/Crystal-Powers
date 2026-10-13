package com.crystalpower.website.service;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.util.UUID;

/** File/scanner IO runs outside database transactions; final writes recheck live access. */
@Service
public class TeamAttachmentService {
    private final TeamAttachmentStore store;
    private final UploadContentValidator validator;
    private final UploadScanner scanner;
    public TeamAttachmentService(TeamAttachmentStore store,UploadContentValidator validator,UploadScanner scanner){this.store=store;this.validator=validator;this.scanner=scanner;}
    public Object upload(Authentication auth,UUID channel,long message,UUID key,MultipartFile file){
        store.authoriseUpload(auth,channel,message);
        if(key==null || file==null || file.isEmpty() || file.getSize()>15L*1024*1024 || !validator.filename(file))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose a supported image or video under 15 MB with a matching safe filename.");
        try(var stream=file.getInputStream()){
            byte[] bytes=stream.readNBytes(15*1024*1024+1);
            if(bytes.length!=file.getSize() || bytes.length>15*1024*1024 || !validator.valid(file.getContentType(),bytes.length,java.util.Arrays.copyOf(bytes,Math.min(bytes.length,256*1024))))throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The file does not match its format or exceeds the supported image dimensions. Export it again before uploading.");
            String hash=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(bytes));
            String fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest((file.getOriginalFilename()+"\n"+file.getContentType()+"\n"+hash).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
            return store.upload(auth,channel,message,key,fingerprint,file.getOriginalFilename(),file.getContentType(),bytes);
        }catch(java.io.IOException failure){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"The upload could not be read. Export it again before uploading.");}catch(java.security.NoSuchAlgorithmException failure){throw new IllegalStateException(failure);}
    }
    public Object scan(Authentication auth,UUID channel,long message,UUID id,int version){var lease=store.begin(auth,channel,message,id,version);String state="ERROR";try{if(lease.content()!=null && lease.size()==lease.content().length && validator.filename(lease.filename(),lease.type()) && validator.valid(lease.type(),lease.size(),java.util.Arrays.copyOf(lease.content(),Math.min(lease.content().length,256*1024))))state=scanner.scan(lease.content());}catch(java.io.IOException | IllegalArgumentException failure){/* Invalid media stays quarantined. */}return store.finish(auth,lease,state);}
}
