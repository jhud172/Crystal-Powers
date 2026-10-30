package com.crystalpower.website.api;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

/** Multipart parsing can fail before a controller-scoped handler is available. */
@RestControllerAdvice
public class MultipartUploadErrors {
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> oversized() {
        return ResponseEntity.status(413).body(Map.of(
                "success", false,
                "message", "The upload exceeds the configured file or request allowance. Choose smaller files and try again."));
    }
}
