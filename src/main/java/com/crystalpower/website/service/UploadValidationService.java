package com.crystalpower.website.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

@Service
public class UploadValidationService {

    private static final long MAX_TOTAL_UPLOAD_BYTES = 15L * 1024 * 1024;
    private static final int MAX_UPLOAD_COUNT = 5;

    public String validateReferenceFiles(MultipartFile[] referenceFiles) {
        List<MultipartFile> files = referenceFiles == null
                ? List.of()
                : Arrays.stream(referenceFiles)
                .filter(file -> file != null && !file.isEmpty())
                .toList();

        if (files.size() > MAX_UPLOAD_COUNT) {
            return "Please keep uploads to five files or fewer.";
        }

        long totalSize = files.stream()
                .mapToLong(MultipartFile::getSize)
                .sum();

        if (totalSize > MAX_TOTAL_UPLOAD_BYTES) {
            return "Please keep uploads under 15MB total so the email can be delivered reliably.";
        }

        for (MultipartFile file : files) {
            String contentType = file.getContentType();

            if (StringUtils.hasText(contentType)
                    && !contentType.startsWith("image/")
                    && !contentType.startsWith("video/")) {
                return "Uploads can only include image or video files.";
            }
        }

        return null;
    }
}
