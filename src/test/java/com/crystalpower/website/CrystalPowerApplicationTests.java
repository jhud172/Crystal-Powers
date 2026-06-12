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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CrystalPowerApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private InquiryEmailService inquiryEmailService;

    @Test
    void contextLoads() {
    }

    @Test
    void primaryRoutesReturnOk() throws Exception {
        String[] routes = {
                "/",
                "/about",
                "/services",
                "/portfolio",
                "/portfolio/editorial-service-landing-flow",
                "/support",
                "/contact"
        };

        for (String route : routes) {
            mockMvc.perform(get(route))
                    .andExpect(status().isOk());
        }
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
    void extensionlessFrontendFallbackRoutesReturnOk() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/definitely-not-real"))
                .andExpect(status().isOk());

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
    void servicesApiSubmissionAcceptsValidImageUpload() throws Exception {
        MockMultipartFile image = new MockMultipartFile(
                "referenceFiles",
                "reference.png",
                "image/png",
                "fake image".getBytes()
        );

        mockMvc.perform(multipart("/api/services")
                        .file(image)
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
                .andExpect(jsonPath("$.fieldErrors.referenceFiles").value("Uploads can only include image or video files."));
    }
}
