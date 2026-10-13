package com.crystalpower.website.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Service
public class UploadValidationService {

    private static final long MAX_TOTAL_UPLOAD_BYTES = 15L * 1024 * 1024;
    private static final int MAX_UPLOAD_COUNT = 5;
    private final UploadContentValidator content;
    public UploadValidationService(UploadContentValidator content) { this.content=content; }

    public String validateReferenceFiles(MultipartFile[] referenceFiles) {
        List<MultipartFile> files = referenceFiles == null
                ? List.of()
                : Arrays.stream(referenceFiles)
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (files.size() > MAX_UPLOAD_COUNT) {
            return "Please keep uploads to five files or fewer.";
        }

        long totalSize = 0;
        for (MultipartFile file : files) {
            long size=file.getSize();
            if(size<0 || size>MAX_TOTAL_UPLOAD_BYTES-totalSize)return "Please keep uploads under 15MB total so the email can be delivered reliably.";
            totalSize+=size;
        }

        for (MultipartFile file : files) {
            String contentType = file.getContentType();

            if (contentType==null || !UploadContentValidator.TYPES.contains(contentType)) return "Use JPEG, PNG, GIF or WebP images, or MP4, WebM or MOV videos. Export other formats before uploading.";
            if(!content.filename(file))return "Use a filename ending in the matching image or video extension, without paths, control characters or colons, and no more than 255 characters.";
            try { if(!content.valid(file))return "An upload does not match its stated format, has an unreadable header or exceeds the image limit of 12,000 pixels per side and 80 megapixels. Export it again before uploading."; }
            catch(java.io.IOException | IllegalArgumentException failure) { return "An upload could not be read. Export the file again before uploading."; }
        }

        return null;
    }
}
