package com.crystalpower.website;

import com.crystalpower.website.service.InquiryEmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

/** Real servlet parsing; MockMvc multipart builders bypass this size boundary. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "server.address=127.0.0.1",
        "spring.servlet.multipart.max-file-size=1KB",
        "spring.servlet.multipart.max-request-size=8KB"
})
class MultipartUploadBoundaryTests {
    @LocalServerPort int port;
    @Autowired ObjectMapper json;
    @MockitoBean InquiryEmailService mail;

    @Test
    void parserSizeFailureReturnsReadable413BeforeControllerSelection() throws Exception {
        String boundary = "CrystalMultipartBoundary";
        String body = "--" + boundary + "\r\nContent-Disposition: form-data; name=\"referenceFiles\"; filename=\"synthetic.png\"\r\n"
                + "Content-Type: image/png\r\n\r\n" + "A".repeat(2048) + "\r\n--" + boundary + "--\r\n";
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/services"))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.headers().firstValue("Content-Type").orElse("")).contains("application/json");
        var error = json.readTree(response.body());
        assertThat(error.path("success").asBoolean(true)).isFalse();
        assertThat(error.path("message").asText()).contains("upload", "allowance");
        verifyNoInteractions(mail);
    }
}
