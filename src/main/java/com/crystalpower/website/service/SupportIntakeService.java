package com.crystalpower.website.service;

import com.crystalpower.website.dto.ContactForm;
import com.crystalpower.website.repository.SupportRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.UUID;

@Service
public class SupportIntakeService {
    public static class ReceiptException extends ResponseStatusException {
        private final UUID requestId;
        public ReceiptException(UUID requestId, String message) { super(HttpStatus.SERVICE_UNAVAILABLE, message); this.requestId = requestId; }
        public UUID requestId() { return requestId; }
    }
    private final SupportIntakeStore store;
    private final SupportRepository repository;
    private final InquiryEmailService notifications;
    private final UploadValidationService uploads;
    private final ObjectMapper json;
    public SupportIntakeService(SupportIntakeStore store, SupportRepository repository, InquiryEmailService notifications, UploadValidationService uploads, ObjectMapper json) { this.store = store; this.repository = repository; this.notifications = notifications; this.uploads = uploads; this.json = json; }
    public UUID receive(ContactForm form, MultipartFile[] files, String source, UUID key) {
        String uploadError = uploads.validateReferenceFiles(files);
        if (uploadError != null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, uploadError);
        final SupportRepository.Request receipt;
        try {
            String payload = json.writeValueAsString(form);
            var digest = DigestUtils.getSha256Digest(); digest.update((source + "\n" + payload).getBytes(StandardCharsets.UTF_8));
            var prepared = new ArrayList<SupportIntakeStore.PreparedFile>();
            for (var file : files == null ? new MultipartFile[0] : files) {
                if (file == null || file.isEmpty()) continue;
                String name = safeFilename(file.getOriginalFilename()), type = file.getContentType() == null ? "application/octet-stream" : file.getContentType();
                if (type.length() > 150 || !type.matches("(image|video)/[A-Za-z0-9.+-]+")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use an image or video with a valid file type.");
                byte[] content = file.getBytes();
                digest.update(("\n" + name + "\n" + type + "\n" + content.length + "\n").getBytes(StandardCharsets.UTF_8)); digest.update(content);
                prepared.add(new SupportIntakeStore.PreparedFile(name, type, content));
            }
            receipt = store.save(key, java.util.HexFormat.of().formatHex(digest.digest()), form, payload, prepared, source);
        } catch (java.io.IOException failure) { throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The enquiry could not be saved. Your details are still in the form; please try again."); }
        if (receipt.notificationState().equals("SENT")) return receipt.id();
        UUID attempt=UUID.randomUUID();
        if (!repository.claimNotification(receipt.id(),attempt,OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15))) throw new ReceiptException(receipt.id(), "Your enquiry is saved. Its email notification is still being processed; please wait before retrying.");
        try { notifications.sendInquiry(form, null, source, "enquiry-" + receipt.id()); }
        catch (InquiryEmailService.InquiryEmailException failure) {
            if(!repository.finishNotification(receipt.id(),attempt,"FAILED",OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15)))throw notificationChanged(receipt.id());
            throw new ReceiptException(receipt.id(), "Your enquiry is saved for the team, but its email notification could not be confirmed. Keep your request reference when checking its progress.");
        }
        if(!repository.finishNotification(receipt.id(),attempt,"SENT",OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(15)))throw notificationChanged(receipt.id());
        return receipt.id();
    }
    private ReceiptException notificationChanged(UUID receipt){return new ReceiptException(receipt,"Your enquiry is saved. Its notification attempt changed or expired; keep this request reference and check its status before retrying.");}
    private String safeFilename(String original) {
        String name = original == null || original.isBlank() ? "reference-upload" : original.replaceAll("[\\\\/\\p{Cntrl}]", "_").strip();
        return name.substring(0, name.offsetByCodePoints(0, Math.min(255, name.codePointCount(0, name.length()))));
    }
}
