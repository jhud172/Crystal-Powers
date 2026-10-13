package com.crystalpower.website.service;

import com.crystalpower.website.dto.ContactForm;
import com.crystalpower.website.repository.SupportRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/** Commits receipt independently of external email delivery. */
@Service
public class SupportIntakeStore {
    public record PreparedFile(String filename, String contentType, byte[] content) {}
    private final SupportRepository repository;
    public SupportIntakeStore(SupportRepository repository) { this.repository = repository; }
    @Transactional
    public SupportRepository.Request save(UUID key, String fingerprint, ContactForm form, String payload, List<PreparedFile> files, String source) {
        var existing = repository.submission(key);
        if (existing.isPresent()) {
            if (!existing.get().fingerprint().equals(fingerprint)) throw new ResponseStatusException(HttpStatus.CONFLICT, "This submission reference is already in use. Change the enquiry or start a fresh submission.");
            return existing.get();
        }
        String name = (form.getFirstName().strip() + " " + (form.getLastName() == null ? "" : form.getLastName().strip())).strip();
        String subject = form.getProjectInterest() == null || form.getProjectInterest().isBlank() ? form.getIntent() + " enquiry" : form.getProjectInterest().strip();
        var request = repository.create(key, fingerprint, repository.publicWorkspace().orElse(null), name, form.getEmail().strip().toLowerCase(Locale.ROOT), form.getIntent(), subject, source, payload);
        for (var file : files) repository.attach(request.id(), file.filename(), file.contentType(), file.content());
        repository.event(request.id(), null, null, "REQUEST_RECEIVED", "Your request was received by Crystal Powers.", true);
        return request;
    }
}
