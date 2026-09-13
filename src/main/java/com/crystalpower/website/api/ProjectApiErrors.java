package com.crystalpower.website.api;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice(assignableTypes = {OwnerAuthController.class, OwnerAccountController.class, OwnerRecoveryController.class, AdminProjectController.class, PublicProjectController.class, ProjectMediaController.class})
public class ProjectApiErrors {
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ResponseEntity<?> malformed() { return ResponseEntity.badRequest().body(Map.of("success", false, "message", "The request could not be read. Check the form and try again.")); }
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<?> oversized() { return ResponseEntity.status(413).body(Map.of("success", false, "message", "The upload is too large. Choose an image under 12 MB.")); }
    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    public ResponseEntity<?> unavailable() { return ResponseEntity.status(503).body(Map.of("success", false, "message", "The project store is temporarily unavailable. Your unsaved edits are still in this tab.")); }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException exception) {
        return ResponseEntity.status(exception.getStatusCode()).body(Map.of("success", false, "message", exception.getReason() == null ? "The request could not be completed." : exception.getReason()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error -> fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Check the highlighted fields and try again.", "fieldErrors", fields));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> conflict() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("success", false, "message", "The record changed or already exists. Reload and try again."));
    }
}
