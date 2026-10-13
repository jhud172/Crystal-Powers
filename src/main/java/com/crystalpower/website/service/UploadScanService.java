package com.crystalpower.website.service;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import java.util.UUID;

/** Separate transactions commit the quarantine lease before contacting the scanner. */
@Service
public class UploadScanService {
    private final UploadScanStore store;
    private final UploadScanner scanner;
    private final UploadContentValidator content;
    public UploadScanService(UploadScanStore store,UploadScanner scanner,UploadContentValidator content) { this.store=store;this.scanner=scanner;this.content=content; }
    public Object scan(Authentication auth,UUID id,int version) {
        var lease=store.begin(auth,id,version);String result="ERROR";
        try {
            byte[] prefix=java.util.Arrays.copyOf(lease.content(),Math.min(lease.content().length,256*1024));
            if(lease.size()==lease.content().length && content.filename(lease.filename(),lease.type()) && content.valid(lease.type(),lease.size(),prefix))result=scanner.scan(lease.content());
        } catch(java.io.IOException | IllegalArgumentException failure) { /* Unreadable legacy media stays quarantined. */ }
        return store.finish(auth,lease,result);
    }
}
