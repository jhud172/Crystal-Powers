package com.crystalpower.website;

import com.crystalpower.website.service.InquiryEmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
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
        String[] routes = {"/", "/about", "/services", "/portfolio", "/support", "/contact"};
        for (String route : routes) {
            mockMvc.perform(get(route))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void legacyRoutesRedirect() throws Exception {
        mockMvc.perform(get("/home.html"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/"));
    }

    @Test
    void removedProductsRoutesReturnNotFound() throws Exception {
        mockMvc.perform(get("/products"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/products.html"))
                .andExpect(status().isNotFound());
    }

    @Test
    void contactFormSubmissionRedirectsWhenValid() throws Exception {
        mockMvc.perform(post("/contact")
                        .param("firstName", "Test")
                        .param("lastName", "User")
                        .param("email", "test@example.com")
                        .param("preferredContactPoint", "Email")
                        .param("packageSelection", "Standard")
                        .param("maintenanceSelection", "Standard Maintenance")
                        .param("message", "I need a website refresh."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/contact"));
    }
}
