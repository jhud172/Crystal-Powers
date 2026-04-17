package com.crystalproduction.website.service;

import com.crystalproduction.website.dto.ContactForm;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class InquiryEmailService {

    private final JavaMailSender mailSender;
    private final String recipientAddress;
    private final String fromAddress;

    public InquiryEmailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.mail.to}") String recipientAddress,
            @Value("${app.mail.from:}") String fromAddress) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.recipientAddress = recipientAddress;
        this.fromAddress = fromAddress;
    }

    public void sendInquiry(ContactForm form, MultipartFile[] referenceFiles, String sourceLabel) {
        if (mailSender == null) {
            throw new InquiryEmailException("Email sending is not configured yet. Add the SMTP environment variables before sending requests.");
        }

        if (!StringUtils.hasText(fromAddress)) {
            throw new InquiryEmailException("Email sending is not configured yet. Set APP_MAIL_FROM or MAIL_USERNAME.");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    true,
                    StandardCharsets.UTF_8.name()
            );

            helper.setTo(recipientAddress);
            helper.setFrom(fromAddress);

            String replyToAddress = StringUtils.hasText(form.getEmail()) ? form.getEmail().trim() : fromAddress;
            String replyToName = buildFullName(form);
            if (StringUtils.hasText(replyToName)) {
                helper.setReplyTo(replyToAddress, replyToName);
            } else {
                helper.setReplyTo(replyToAddress);
            }

            helper.setSubject(buildSubject(form, sourceLabel));
            helper.setText(buildHtmlBody(form, sourceLabel, referenceFiles), true);

            for (MultipartFile file : getPopulatedFiles(referenceFiles)) {
                String filename = StringUtils.hasText(file.getOriginalFilename())
                        ? file.getOriginalFilename().trim()
                        : "reference-upload";
                helper.addAttachment(filename, new ByteArrayResource(file.getBytes()), file.getContentType());
            }

            mailSender.send(message);
        } catch (MailAuthenticationException exception) {
            throw new InquiryEmailException("The SMTP credentials were rejected. Check the configured mail username and password.", exception);
        } catch (MailException | MessagingException | IOException exception) {
            throw new InquiryEmailException("The request could not be delivered by email right now.", exception);
        }
    }

    private String buildSubject(ContactForm form, String sourceLabel) {
        String packageSelection = StringUtils.hasText(form.getPackageSelection())
                ? form.getPackageSelection().trim()
                : "Unspecified package";
        String fullName = buildFullName(form);

        if (!StringUtils.hasText(fullName)) {
            fullName = "New enquiry";
        }

        return String.format("Crystal Production | %s | %s | %s", sourceLabel, packageSelection, fullName);
    }

    private String buildHtmlBody(ContactForm form, String sourceLabel, MultipartFile[] referenceFiles) {
        List<String> additions = getSelectedAdditions(form);
        List<MultipartFile> attachments = getPopulatedFiles(referenceFiles);

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><body style=\"margin:0;padding:32px;background:#0b1020;color:#e5edf9;font-family:'Segoe UI',Arial,sans-serif;\">");
        html.append("<div style=\"max-width:760px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#10172d,#0b1020);box-shadow:0 32px 80px rgba(2,6,23,0.45);\">");
        html.append("<div style=\"padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right, rgba(103,232,249,0.16), transparent 240px),linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));\">");
        html.append("<div style=\"font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:#67e8f9;font-weight:700;\">Crystal Production</div>");
        html.append("<h1 style=\"margin:14px 0 0;font-size:32px;line-height:1.08;color:#ffffff;\">New website build request</h1>");
        html.append("<p style=\"margin:14px 0 0;font-size:15px;line-height:1.8;color:#c7d2e5;\">");
        html.append(escape(sourceLabel)).append(" submitted a structured enquiry with package, maintenance, additions, and contact details.");
        html.append("</p></div>");

        html.append("<div style=\"padding:32px;display:grid;gap:18px;\">");
        html.append(section("Contact details", rows(
                row("Name", buildFullName(form)),
                row("Email", form.getEmail()),
                row("Phone", defaultText(form.getPhoneNumber())),
                row("Preferred contact", form.getPreferredContactPoint())
        )));

        html.append(section("Project scope", rows(
                row("Package", form.getPackageSelection()),
                row("Maintenance", form.getMaintenanceSelection()),
                row("Additions", additions.isEmpty() ? "No additions selected" : String.join(", ", additions)),
                row("Custom additions", defaultText(form.getOtherAdditions()))
        )));

        html.append(textSection("Message", form.getMessage()));
        html.append(textSection("Extra information", defaultText(form.getExtraInformation())));

        html.append(section("Uploads", rows(
                row("Attached files", attachments.isEmpty() ? "No files attached" : joinAttachmentNames(attachments))
        )));
        html.append("</div></div></body></html>");

        return html.toString();
    }

    private String section(String title, String body) {
        return "<section style=\"border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:22px;background:rgba(255,255,255,0.03);\">"
                + "<div style=\"font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#7dd3fc;font-weight:700;\">"
                + escape(title)
                + "</div>"
                + body
                + "</section>";
    }

    private String rows(String... rows) {
        StringBuilder html = new StringBuilder("<div style=\"display:grid;gap:12px;margin-top:18px;\">");
        for (String row : rows) {
            html.append(row);
        }
        html.append("</div>");
        return html.toString();
    }

    private String row(String label, String value) {
        return "<div style=\"display:grid;gap:6px;padding:14px 16px;border-radius:16px;background:rgba(2,6,23,0.42);\">"
                + "<div style=\"font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8fa6c8;font-weight:700;\">"
                + escape(label)
                + "</div>"
                + "<div style=\"font-size:15px;line-height:1.7;color:#ffffff;\">"
                + escape(defaultText(value))
                + "</div>"
                + "</div>";
    }

    private String textSection(String title, String value) {
        return "<section style=\"border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:22px;background:rgba(255,255,255,0.03);\">"
                + "<div style=\"font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#7dd3fc;font-weight:700;\">"
                + escape(title)
                + "</div>"
                + "<div style=\"margin-top:18px;padding:18px 20px;border-radius:18px;background:rgba(2,6,23,0.42);font-size:15px;line-height:1.8;color:#ffffff;white-space:pre-wrap;\">"
                + escape(defaultText(value))
                + "</div>"
                + "</section>";
    }

    private String buildFullName(ContactForm form) {
        return String.join(" ",
                valueOrEmpty(form.getFirstName()),
                valueOrEmpty(form.getLastName()))
                .trim();
    }

    private List<String> getSelectedAdditions(ContactForm form) {
        List<String> additions = new ArrayList<>();

        if (StringUtils.hasText(form.getSelectedAdditions())) {
            additions.addAll(Arrays.stream(form.getSelectedAdditions().split("\\|"))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .filter(value -> !"Other".equalsIgnoreCase(value))
                    .toList());
        }

        if (StringUtils.hasText(form.getOtherAdditions())) {
            additions.addAll(Arrays.stream(form.getOtherAdditions().split("\\r?\\n"))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .toList());
        }

        return additions;
    }

    private List<MultipartFile> getPopulatedFiles(MultipartFile[] referenceFiles) {
        if (referenceFiles == null || referenceFiles.length == 0) {
            return List.of();
        }

        return Arrays.stream(referenceFiles)
                .filter(file -> file != null && !file.isEmpty())
                .toList();
    }

    private String joinAttachmentNames(List<MultipartFile> files) {
        return files.stream()
                .map(file -> StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename().trim() : "reference-upload")
                .map(this::escape)
                .reduce((left, right) -> left + ", " + right)
                .orElse("No files attached");
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(defaultText(value));
    }

    private String defaultText(String value) {
        return StringUtils.hasText(value) ? value.trim() : "Not provided";
    }

    private String valueOrEmpty(String value) {
        return StringUtils.hasText(value) ? value.trim() : "";
    }

    public static class InquiryEmailException extends RuntimeException {
        public InquiryEmailException(String message) {
            super(message);
        }

        public InquiryEmailException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
