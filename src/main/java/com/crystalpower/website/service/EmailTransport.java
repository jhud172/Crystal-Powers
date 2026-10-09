package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.internet.InternetAddress;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Server-only HTTPS transport, with explicit SMTP compatibility for existing installations. */
@Component
public class EmailTransport {
    public record Attachment(String filename, String contentType, byte[] content) {}
    public record Message(String to, String replyTo, String subject, String html, List<Attachment> attachments) {}
    public static class DeliveryException extends RuntimeException { public DeliveryException() { super("Email could not be delivered right now. Please try again later."); } }
    private final JavaMailSender smtp;
    private final ObjectMapper json;
    private final String provider, key, from;
    private final HttpClient http;
    @org.springframework.beans.factory.annotation.Autowired
    public EmailTransport(ObjectProvider<JavaMailSender> smtp, ObjectMapper json, @Value("${app.mail.provider:resend}") String provider,
            @Value("${app.mail.resend-key:}") String key, @Value("${app.mail.from:}") String from) {
        this(smtp.getIfAvailable(), json, provider, key, from, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build());
    }
    EmailTransport(JavaMailSender smtp, ObjectMapper json, String provider, String key, String from, HttpClient http) {
        this.smtp = smtp; this.json = json; this.provider = provider; this.key = key; this.from = from; this.http = http;
    }
    public void send(Message message) {
        try {
            var sender = new InternetAddress(from, true); sender.validate();
            if (sender.getPersonal() == null) sender.setPersonal("Crystal Powers", "UTF-8");
            new InternetAddress(message.to(), true).validate();
            if (message.replyTo() != null) new InternetAddress(message.replyTo(), true).validate();
            if (message.subject().contains("\r") || message.subject().contains("\n")) throw new DeliveryException();
            if ("resend".equals(provider)) {
                if (key.isBlank()) throw new DeliveryException();
                Map<String, Object> body = new LinkedHashMap<>();
                body.put("from", sender.toString()); body.put("to", List.of(message.to())); body.put("subject", message.subject()); body.put("html", message.html());
                if (message.replyTo() != null) body.put("reply_to", message.replyTo());
                if (!message.attachments().isEmpty()) body.put("attachments", message.attachments().stream().map(attachment -> Map.of("filename", safeFilename(attachment.filename()), "content_type", attachment.contentType(), "content", Base64.getEncoder().encodeToString(attachment.content()))).toList());
                var request = HttpRequest.newBuilder(URI.create("https://api.resend.com/emails")).timeout(Duration.ofSeconds(15))
                        .header("Authorization", "Bearer " + key).header("Content-Type", "application/json")
                        .header("Idempotency-Key", UUID.randomUUID().toString()).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
                var response = http.send(request, HttpResponse.BodyHandlers.ofInputStream());
                try (var stream = response.body()) {
                    if (response.statusCode() < 200 || response.statusCode() >= 300) throw new DeliveryException();
                    var result = json.readTree(stream.readNBytes(8192));
                    if (result == null || !result.hasNonNull("id")) throw new DeliveryException();
                }
            } else if ("smtp".equals(provider) && smtp != null) {
                var mime = smtp.createMimeMessage(); var helper = new MimeMessageHelper(mime, true, "UTF-8");
                helper.setFrom(sender); helper.setTo(message.to()); if (message.replyTo() != null) helper.setReplyTo(message.replyTo());
                helper.setSubject(message.subject()); helper.setText(message.html(), true);
                for (Attachment attachment : message.attachments()) helper.addAttachment(safeFilename(attachment.filename()), new ByteArrayResource(attachment.content()), attachment.contentType());
                smtp.send(mime);
            } else throw new DeliveryException();
        } catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw new DeliveryException(); }
        catch (Exception exception) { throw new DeliveryException(); }
    }
    private String safeFilename(String name) { return name == null ? "reference-upload" : name.replaceAll("[\\\\/\\r\\n\\x00-\\x1f]", "_"); }
}
