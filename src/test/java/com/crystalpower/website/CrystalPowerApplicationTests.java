package com.crystalpower.website;

import com.crystalpower.website.service.InquiryEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;

@SpringBootTest
@AutoConfigureMockMvc
class CrystalPowerApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired private com.crystalpower.website.repository.SupportRepository support;
    @Autowired private com.fasterxml.jackson.databind.ObjectMapper json;

    @MockBean
    private InquiryEmailService inquiryEmailService;

    @Test
    void contextLoads() {
    }

    @Test
    void publicPageAllowsEmbeddedModelTexturesWithoutRemoteConnectionsOrInlineScripts() throws Exception {
        mockMvc.perform(get("/"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", allOf(
                        containsString("connect-src 'self' blob:;"),
                        containsString("script-src 'self';"),
                        containsString("object-src 'none';"),
                        containsString("frame-ancestors 'none';"))));
    }

    @Test
    void primaryRoutesReturnOk() throws Exception {
        String[] routes = {
                "/",
                "/about",
                "/services",
                "/portfolio",
                "/support",
                "/contact"
        };

        for (String route : routes) {
            mockMvc.perform(get(route))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void accessibilityHasPublicMetadataCanonicalAliasesAndSitemapWithoutAnUnreadyPrivacyPage() throws Exception {
        for (String path : new String[]{"/accessibility", "/accessibility/"}) {
            mockMvc.perform(get(path)).andExpect(status().isOk())
                    .andExpect(header().doesNotExist("X-Robots-Tag"))
                    .andExpect(content().string(allOf(containsString("<title>Accessibility | Crystal Powers</title>"),
                            containsString("name=\"robots\" content=\"index, follow\""),
                            containsString("/accessibility\" />"),
                            containsString("keyboard controls and a way to report access problems."))));
        }
        mockMvc.perform(get("/sitemap.xml")).andExpect(status().isOk())
                .andExpect(content().string(allOf(containsString("/accessibility</loc>"),
                        not(containsString("/privacy</loc>")), not(containsString("/birthday/")))));
        mockMvc.perform(get("/privacy")).andExpect(status().isNotFound())
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"));
    }

    @Test
    void legacyRoutesRedirect() throws Exception {
        String[][] redirects = {
                {"/home.html", "/"},
                {"/about.html", "/about"},
                {"/services.html", "/services"},
                {"/portfolio.html", "/portfolio"},
                {"/support.html", "/support"},
                {"/contact.html", "/contact"}
        };

        for (String[] redirect : redirects) {
            mockMvc.perform(get(redirect[0]))
                    .andExpect(status().is3xxRedirection())
                    .andExpect(redirectedUrl(redirect[1]));
        }
    }

    @Test
    void removedProductsHtmlRouteReturnsNotFound() throws Exception {
        mockMvc.perform(get("/products.html"))
                .andExpect(status().isNotFound());
    }

    @Test
    void extensionlessMissingRoutesKeepTheSpaBodyWith404AndNoindex() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"));

        mockMvc.perform(get("/definitely-not-real"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/home"))
                .andExpect(status().isOk());
    }

    @Test
    void contactApiSubmissionReturnsJsonWhenValid() throws Exception {
        mockMvc.perform(post("/api/contact")
                        .param("firstName", "Test")
                        .param("lastName", "User")
                        .param("email", "test@example.com")
                        .param("preferredContactPoint", "Email")
                        .param("packageSelection", "Standard")
                        .param("maintenanceSelection", "Standard Maintenance")
                        .param("message", "I need a website refresh."))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void contactApiSubmissionReturnsValidationErrorsWhenInvalid() throws Exception {
        mockMvc.perform(post("/api/contact"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.fieldErrors.firstName").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.message").exists());
    }

    @Test
    void missingCaseIs404WithoutPrivateMetadataWhileKnownAliasesRemainUsable() throws Exception {
        mockMvc.perform(get("/portfolio/missing-case"))
                .andExpect(status().isNotFound())
                .andExpect(header().string("Content-Type", containsString("text/html")))
                .andExpect(header().string("X-Robots-Tag", "noindex, nofollow"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().string(containsString("Page not found | Crystal Powers")));
        for (String route : new String[]{"/about/", "/admin", "/admin/recovery", "/admin/reset/", "/birthday/mission-vi"}) {
            mockMvc.perform(get(route)).andExpect(status().isOk());
        }
    }

    @Test
    void nonWebsiteEnquiriesDoNotRequireNewBuildSelectionsOnEitherEndpoint() throws Exception {
        for (String endpoint : new String[]{"/api/contact", "/api/services"}) {
            for (String intent : new String[]{"general", "app", "system", "support"}) {
                mockMvc.perform(post(endpoint)
                                .param("intent", intent).param("firstName", "Synthetic")
                                .param("email", intent + endpoint.replace('/', '-') + "@example.invalid")
                                .param("preferredContactPoint", "Email")
                                .param("websiteAddress", "support".equals(intent) ? "https://example.invalid" : "")
                                .param("message", "Synthetic contract verification only."))
                        .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
            }
        }
    }

    @Test
    void intentAndConditionalRequirementsReturnFieldLinkedErrors() throws Exception {
        mockMvc.perform(post("/api/contact").param("intent", "website"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.packageSelection").exists())
                .andExpect(jsonPath("$.fieldErrors.maintenanceSelection").exists());
        mockMvc.perform(post("/api/contact").param("intent", "unsupported"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.intent").exists());
        mockMvc.perform(post("/api/contact").param("preferredContactPoint", "unknown")
                        .param("selectedAdditions", "Other"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.preferredContactPoint").exists())
                .andExpect(jsonPath("$.fieldErrors.otherAdditions").exists());
        mockMvc.perform(post("/api/contact").param("intent", "support").param("preferredContactPoint", "WhatsApp"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.websiteAddress").exists())
                .andExpect(jsonPath("$.fieldErrors.phoneNumber").exists());
        mockMvc.perform(post("/api/contact").param("intent", "support").param("websiteAddress", "javascript:alert(1)"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.websiteAddress").exists());
    }

    @Test
    void websiteMayExplicitlyDeferScopeAndAftercareDiscussion() throws Exception {
        mockMvc.perform(post("/api/contact").param("intent", "website")
                        .param("firstName", "Synthetic").param("email", "defer@example.invalid")
                        .param("preferredContactPoint", "Email").param("packageSelection", "Discuss scope")
                        .param("maintenanceSelection", "Discuss aftercare").param("message", "Please discuss the options."))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void projectReferenceIsBoundedOnBothEnquiryEndpoints() throws Exception {
        for (String endpoint : new String[]{"/api/contact", "/api/services"}) {
            mockMvc.perform(post(endpoint).param("intent", "general")
                            .param("firstName", "Synthetic").param("email", "reference@example.invalid")
                            .param("preferredContactPoint", "Email").param("message", "Please discuss a similar project.")
                            .param("projectInterest", "x".repeat(161)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.fieldErrors.projectInterest").exists());
        }
    }

    @Test
    void servicesApiSubmissionAcceptsValidImageUpload() throws Exception {
        var encoded=new java.io.ByteArrayOutputStream();
        org.assertj.core.api.Assertions.assertThat(javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",encoded)).isTrue();
        MockMultipartFile image = new MockMultipartFile(
                "referenceFiles",
                "reference.png",
                "image/png",
                encoded.toByteArray()
        );

        var result=mockMvc.perform(multipart("/api/services")
                        .file(image)
                        .param("firstName", "Test")
                        .param("lastName", "User")
                        .param("email", "test@example.com")
                        .param("preferredContactPoint", "Email")
                        .param("packageSelection", "Standard")
                        .param("maintenanceSelection", "Standard Maintenance")
                        .param("message", "I need a website refresh."))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true)).andExpect(jsonPath("$.requestId").exists()).andReturn();
        var requestId=java.util.UUID.fromString(json.readTree(result.getResponse().getContentAsString()).get("requestId").asText());
        var stored=support.attachments(requestId);org.assertj.core.api.Assertions.assertThat(stored).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(stored.get(0).reviewState()).isEqualTo("PENDING");
        org.assertj.core.api.Assertions.assertThat(stored.get(0).scanState()).isEqualTo("UNSCANNED");
        org.mockito.Mockito.verify(inquiryEmailService).sendInquiry(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.eq("Services page"),org.mockito.ArgumentMatchers.startsWith("enquiry-"));
    }

    @Test
    void servicesApiSubmissionRejectsInvalidUploadType() throws Exception {
        MockMultipartFile textFile = new MockMultipartFile(
                "referenceFiles",
                "notes.txt",
                "text/plain",
                "not allowed".getBytes()
        );

        mockMvc.perform(multipart("/api/services")
                        .file(textFile)
                        .param("firstName", "Test")
                        .param("lastName", "User")
                        .param("email", "test@example.com")
                        .param("preferredContactPoint", "Email")
                        .param("packageSelection", "Standard")
                        .param("maintenanceSelection", "Standard Maintenance")
                        .param("message", "I need a website refresh."))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.fieldErrors.referenceFiles").value("Use JPEG, PNG, GIF or WebP images, or MP4, WebM or MOV videos. Export other formats before uploading."));
    }
    @Test
    void declaredImageWithPlainTextBytesIsRejectedBeforeNotification() throws Exception {
        var file=new MockMultipartFile("referenceFiles","reference.png","image/png","fake image".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        mockMvc.perform(multipart("/api/services").file(file).param("firstName","Synthetic").param("email","reference@example.invalid").param("preferredContactPoint","Email").param("packageSelection","Standard").param("maintenanceSelection","Standard Maintenance").param("message","Synthetic upload validation request."))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.referenceFiles",containsString("stated format")));
        org.mockito.Mockito.verifyNoInteractions(inquiryEmailService);
    }

}
