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
    private final EmailTransport mail;
    private final String replyTo;
    public SupportReplyEmailService(SupportRequestService requests, EmailTransport mail, @Value("${app.mail.support-reply-to:${app.mail.reply-to:}}") String replyTo) { this.requests = requests; this.mail = mail; this.replyTo = replyTo; }
    public SupportRepository.Message send(Authentication authentication, UUID requestId, UUID messageId) {
        var delivery = requests.claimDelivery(authentication, requestId, messageId);
        if (!delivery.claimed()) return delivery.message();
        try {
            var request = delivery.request();
            String subject = "Crystal Powers | Update on " + request.subject().replaceAll("[\\r\\n]", " ");
            String text = "Hello " + request.clientName() + ",\n\n" + delivery.message().body() + "\n\nCrystal Powers\nRequest reference: " + request.id();
            String html = "<div style=\"font-family:system-ui,sans-serif;line-height:1.7;max-width:640px\">" + HtmlUtils.htmlEscape(text).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>") + "</div>";
            mail.send(new EmailTransport.Message(request.clientEmail(), replyTo.isBlank() ? null : replyTo, subject, html, List.of()), "support-reply-" + messageId);
        } catch (EmailTransport.DeliveryException failure) {
            requests.finishDelivery(delivery, false);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "The client message is saved, but its email outcome could not be confirmed. Check the recipient and provider delivery status before retrying; another email may be sent.");
        }
        requests.finishDelivery(delivery, true);
        return requests.deliveryMessage(authentication, requestId, messageId);
    }
}
