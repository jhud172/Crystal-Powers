package com.crystalproduction.website;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CrystalProductionApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextLoads() {
    }

    @Test
    void primaryRoutesReturnOk() throws Exception {
        String[] routes = {"/", "/about", "/services", "/products", "/portfolio", "/support", "/contact"};
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

        mockMvc.perform(get("/products.html"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/products"));
    }

    @Test
    void contactFormSubmissionRedirectsWhenValid() throws Exception {
        mockMvc.perform(post("/contact")
                        .param("name", "Test User")
                        .param("email", "test@example.com")
                        .param("message", "I need a website refresh."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/contact"));
    }
}
