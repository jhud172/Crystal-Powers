package com.crystalpower.website.service;

import com.crystalpower.website.dto.ContactForm;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class InquiryEmailServiceTests {
    @ParameterizedTest
    @CsvSource({"support,support", "website,sales", "app,sales", "system,sales", "general,hello"})
    void routesEachEnquiryToItsConfiguredTeamAndPreservesReplyAndRetryIdentity(String intent, String team) {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid",
                " support@example.invalid ", "sales@example.invalid", "hello@example.invalid");
        var form = new ContactForm();
        form.setIntent(intent); form.setFirstName("Synthetic");
        form.setEmail(" visitor@example.invalid "); form.setMessage("Routing verification");
        service.sendInquiry(form, null, "Contact page", "stable-enquiry-key");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture(), eq("stable-enquiry-key"));
        assertThat(captured.getValue().to()).isEqualTo(team + "@example.invalid");
        assertThat(captured.getValue().replyTo()).isEqualTo("visitor@example.invalid");
        verifyNoMoreInteractions(transport);
    }

    @ParameterizedTest
    @CsvSource({"support", "website", "app", "system", "general", "unknown"})
    void unsetDepartmentsKeepTheExistingInbox(String intent) {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid", "", "  ", "");
        var form = new ContactForm();
        form.setIntent(intent); form.setFirstName("Synthetic");
        form.setEmail("visitor@example.invalid"); form.setMessage("Fallback verification");
        service.sendInquiry(form, null, "Contact page");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture());
        assertThat(captured.getValue().to()).isEqualTo("owner@example.invalid");
    }

    @Test
    void supportMessageIncludesEscapedIssueDetailsWithoutWebsitePackageQuestions() {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid");
        var form = new ContactForm();
        form.setIntent("support");
        form.setFirstName("Synthetic");
        form.setEmail("visitor@example.invalid");
        form.setWebsiteAddress("https://example.invalid");
        form.setExpectedResult("Expected <result>");
        form.setReproductionSteps("Open page\nPress button & observe");
        form.setMessage("Synthetic issue");
        service.sendInquiry(form, null, "Contact page");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture());
        assertThat(captured.getValue().subject()).contains("existing-client support");
        assertThat(captured.getValue().html()).contains("Support details", "https://example.invalid",
                "Expected &lt;result&gt;", "Open page<br>Press button &amp; observe")
                .doesNotContain("Project scope", "Unspecified package");
    }
    @Test
    void enquiryMatchesWebsiteLabelsAndKeepsEscapedContentAttachmentsAndReplyAddress() throws Exception {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid");
        var form = new ContactForm();
        form.setFirstName("Website delivery test");
        form.setEmail(" visitor@example.invalid ");
        form.setPreferredContactPoint("Email");
        form.setPackageSelection("Custom Quote");
        form.setMaintenanceSelection("Basic Maintenance");
        form.setMessage("Synthetic preview only.\r\n<script>alert('unsafe')</script>\nSecond paragraph & details.");
        var upload = new MockMultipartFile("referenceFiles", "reference & sketch.png", "image/png", new byte[]{1, 2, 3});
        service.sendInquiry(form, new MockMultipartFile[]{upload}, "Contact page");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture());
        var message = captured.getValue();
        assertThat(message.to()).isEqualTo("owner@example.invalid");
        assertThat(message.replyTo()).isEqualTo("visitor@example.invalid");
        assertThat(message.subject()).contains("Tailored project scope").doesNotContain("Custom Quote");
        assertThat(message.html()).contains("New website enquiry", "Essential coverage", "mailto:visitor@example.invalid",
                "color:#7dd3fc", "<br>&lt;script&gt;", "reference &amp; sketch.png")
                .doesNotContain("<script>", "&amp;amp;", "display:grid", "structured enquiry");
        assertThat(message.attachments()).hasSize(1);
        assertThat(message.attachments().get(0).content()).containsExactly(1, 2, 3);
        var preview = Path.of("build/reports/email-preview.html");
        Files.createDirectories(preview.getParent());
        Files.writeString(preview, message.html());
    }

    @Test
    void projectInterestIsIncludedAsEscapedContextWithoutChangingTheSubject() {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid");
        var form = new ContactForm();
        form.setIntent("general"); form.setFirstName("Synthetic"); form.setEmail("visitor@example.invalid");
        form.setMessage("A different project inspired by the example.");
        form.setProjectInterest("Clare <script>unsafe()</script> & context");
        service.sendInquiry(form, null, "Contact page");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture());
        assertThat(captured.getValue().html()).contains("Project interest", "Clare &lt;script&gt;unsafe()&lt;/script&gt; &amp; context").doesNotContain("<script>");
        assertThat(captured.getValue().subject()).doesNotContain("unsafe", "Clare");
    }

    @Test
    void unknownSelectionsRemainReadableAndCannotInjectSubjectHeadersOrHtml() {
        var transport = mock(EmailTransport.class);
        var service = new InquiryEmailService(transport, "owner@example.invalid");
        var form = new ContactForm();
        form.setFirstName("Synthetic\r\nBcc: test@example.invalid");
        form.setEmail("visitor@example.invalid");
        form.setPackageSelection("Future <package>");
        form.setMaintenanceSelection("Future & support");
        form.setMessage("Hello");
        service.sendInquiry(form, null, "Services page");
        var captured = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(transport).send(captured.capture());
        assertThat(captured.getValue().subject()).doesNotContain("\r", "\n");
        assertThat(captured.getValue().html()).contains("Future &lt;package&gt;", "Future &amp; support", "No files attached");
    }
}
