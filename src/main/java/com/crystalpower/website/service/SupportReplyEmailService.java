package com.crystalpower.website.service;

import com.crystalpower.website.repository.SupportRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.HtmlUtils;
import java.util.List;
import java.util.UUID;

@Service
public class SupportReplyEmailService {
    private final SupportRequestService requests;
    private final SupportRepository repository;
    private final EmailTransport mail;
    private final String replyTo;
    public SupportReplyEmailService(SupportRequestService requests, SupportRepository repository, EmailTransport mail, @Value("${app.mail.reply-to:}") String replyTo) { this.requests = requests; this.repository = repository; this.mail = mail; this.replyTo = replyTo; }
    public SupportRepository.Message send(Authentication authentication, UUID requestId, UUID messageId) {
        var delivery = requests.claimDelivery(authentication, requestId, messageId);
        if (!delivery.claimed()) return delivery.message();
        try {
            var request = delivery.request();
            String subject = "Crystal Powers | Update on " + request.subject().replaceAll("[\\r\\n]", " ");
            String text = "Hello " + request.clientName() + ",\n\n" + delivery.message().body() + "\n\nCrystal Powers\nRequest reference: " + request.id();
            String html = "<div style=\"font-family:system-ui,sans-serif;line-height:1.7;max-width:640px\">" + HtmlUtils.htmlEscape(text).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") + "</div>";
            mail.send(new EmailTransport.Message(request.clientEmail(), replyTo.isBlank() ? null : replyTo, subject, html, List.of()), "support-reply-" + messageId);
            repository.delivery(requestId, messageId, "SENT");
            return repository.message(requestId, messageId).orElseThrow();
        } catch (EmailTransport.DeliveryException failure) {
            repository.delivery(requestId, messageId, "FAILED");
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The client message is saved, but its email could not be sent. Reload its status and retry when delivery is available.");
        }
    }
}
