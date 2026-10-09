package com.crystalpower.website.service;

import com.crystalpower.website.dto.ContactForm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.HtmlUtils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class InquiryEmailService {

    private final EmailTransport transport;
    private final String recipientAddress;

    public InquiryEmailService(EmailTransport transport, @Value("${app.mail.to}") String recipientAddress) {
        this.transport = transport;
        this.recipientAddress = recipientAddress;
    }

    public void sendInquiry(ContactForm form, MultipartFile[] referenceFiles, String sourceLabel) {
        try {
            List<EmailTransport.Attachment> attachments = new ArrayList<>();
            for (MultipartFile file : getPopulatedFiles(referenceFiles)) {
                attachments.add(new EmailTransport.Attachment(file.getOriginalFilename(), file.getContentType(), file.getBytes()));
            }
            transport.send(new EmailTransport.Message(recipientAddress, form.getEmail().trim(),
                    buildSubject(form, sourceLabel).replaceAll("[\\r\\n]", " "), buildHtmlBody(form, sourceLabel, referenceFiles), attachments));
        } catch (EmailTransport.DeliveryException | IOException exception) {
            throw new InquiryEmailException("Your enquiry could not be delivered right now. Please try again later.", exception);
        }
    }
    private String buildSubject(ContactForm form, String sourceLabel) {
        String packageSelection = StringUtils.hasText(form.getPackageSelection())
                ? packageLabel(form.getPackageSelection())
                : "Unspecified package";
        String fullName = buildFullName(form);

        if (!StringUtils.hasText(fullName)) {
            fullName = "New enquiry";
        }

        return String.format("Crystal Powers | %s | %s | %s", sourceLabel, packageSelection, fullName);
    }

    private String buildHtmlBody(ContactForm form, String sourceLabel, MultipartFile[] referenceFiles) {
        List<String> additions = getSelectedAdditions(form);
        List<MultipartFile> attachments = getPopulatedFiles(referenceFiles);

        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><body style=\"margin:0;padding:16px;background:#0b1020;color:#e5edf9;font-family:'Segoe UI',Arial,sans-serif;\">");
        html.append("<div style=\"max-width:760px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#10172d,#0b1020);box-shadow:0 32px 80px rgba(2,6,23,0.45);\">");
        html.append("<div style=\"padding:24px;border-bottom:1px solid rgba(255,255,255,0.08);background:radial-gradient(circle at top right, rgba(103,232,249,0.16), transparent 240px),linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));\">");
        html.append("<div style=\"font-size:12px;letter-spacing:0.32em;text-transform:uppercase;color:#67e8f9;font-weight:700;\">Crystal Powers</div>");
        html.append("<h1 style=\"margin:14px 0 0;font-size:32px;line-height:1.08;color:#ffffff;\">New website enquiry</h1>");
        html.append("<p style=\"margin:14px 0 0;font-size:15px;line-height:1.8;color:#c7d2e5;\">");
        html.append(escape(sourceLabel)).append(" enquiry. Reply to this email to contact the sender.");
        html.append("</p></div>");

        html.append("<div style=\"padding:24px;\">");
        html.append(section("Contact details", rows(
                row("Name", buildFullName(form)),
                row("Email", form.getEmail()),
                row("Phone", defaultText(form.getPhoneNumber())),
                row("Preferred contact", form.getPreferredContactPoint())
        )));

        html.append(section("Project scope", rows(
                row("Package", packageLabel(form.getPackageSelection())),
                row("Maintenance", maintenanceLabel(form.getMaintenanceSelection())),
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
        return "<section style=\"border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:18px;margin-bottom:18px;background:#171e33;\">"
                + "<div style=\"font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#7dd3fc;font-weight:700;\">"
                + escape(title)
                + "</div>"
                + body
                + "</section>";
    }

    private String rows(String... rows) {
        StringBuilder html = new StringBuilder("<div style=\"margin-top:18px;\">");
        for (String row : rows) {
            html.append(row);
        }
        html.append("</div>");
        return html.toString();
    }

    private String row(String label, String value) {
        return "<div style=\"margin-bottom:12px;padding:14px 16px;border-radius:16px;background:#0e1427;\">"
                + "<div style=\"font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#8fa6c8;font-weight:700;\">"
                + escape(label)
                + "</div>"
                + "<div style=\"margin-top:6px;font-size:15px;line-height:1.7;color:#ffffff;overflow-wrap:anywhere;word-break:break-word;\">"
                + ("Email".equals(label) ? emailLink(value) : escape(defaultText(value)))
                + "</div>"
                + "</div>";
    }

    private String textSection(String title, String value) {
        return "<section style=\"border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:18px;margin-bottom:18px;background:#171e33;\">"
                + "<div style=\"font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#7dd3fc;font-weight:700;\">"
                + escape(title)
                + "</div>"
                + "<div style=\"margin-top:18px;padding:18px 20px;border-radius:18px;background:#0e1427;font-size:15px;line-height:1.8;color:#ffffff;overflow-wrap:anywhere;word-break:break-word;\">"
                + escape(defaultText(value)).replace("\r\n", "\n").replace("\r", "\n").replace("\n", "<br>")
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
                .reduce((left, right) -> left + ", " + right)
                .orElse("No files attached");
    }

    private String emailLink(String value) {
        String email = escape(value);
        return "<a href=\"mailto:" + email + "\" style=\"color:#7dd3fc;text-decoration:underline;\">" + email + "</a>";
    }

    // Keep the established API values; match the titles shown by the website.
    private String packageLabel(String value) {
        return switch (valueOrEmpty(value)) {
            case "Basic" -> "Starter site foundation";
            case "Starter" -> "Stronger business presence";
            case "Standard" -> "Balanced premium build";
            case "Experienced" -> "Advanced business structure";
            case "Multi Grade" -> "Larger custom scope";
            case "Custom Quote" -> "Tailored project scope";
            default -> defaultText(value);
        };
    }

    private String maintenanceLabel(String value) {
        return switch (valueOrEmpty(value)) {
            case "Basic Maintenance" -> "Essential coverage";
            case "Standard Maintenance" -> "Ongoing updates";
            case "Premium Maintenance" -> "Priority support";
            default -> defaultText(value);
        };
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
