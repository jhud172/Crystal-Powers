package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExternalTransportTests {
    private final HttpClient http = mock(HttpClient.class);
    private final EmailTransport.Message message = new EmailTransport.Message("owner@example.invalid", "visitor@example.invalid", "Project enquiry", "<p>Synthetic message</p>", List.of());

    @SuppressWarnings("unchecked")
    private void response(int status, byte[] body) throws Exception {
        HttpResponse<java.io.InputStream> response = mock(HttpResponse.class);
        when(response.statusCode()).thenReturn(status);
        when(response.body()).thenAnswer(call -> new ByteArrayInputStream(body));
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenReturn(response);
    }
    private EmailTransport email() { return new EmailTransport(null, new ObjectMapper(), "resend", "synthetic-key", "studio@example.invalid", http); }

    @Test
    void emailRequiresProviderAcknowledgementAndNeverExposesFailureBody() throws Exception {
        response(200, "{\"id\":\"synthetic-message\"}".getBytes());
        email().send(message);
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(request.getValue().uri().toString()).isEqualTo("https://api.resend.com/emails");
        assertThat(request.getValue().headers().firstValue("Idempotency-Key")).isPresent();
        for (int status : new int[]{401, 429, 500, 302}) {
            response(status, "private provider diagnostic synthetic-key".getBytes());
            assertThatThrownBy(() -> email().send(message)).isInstanceOf(EmailTransport.DeliveryException.class).hasMessageNotContaining("synthetic-key");
        }
        response(200, "{}".getBytes());
        assertThatThrownBy(() -> email().send(message)).isInstanceOf(EmailTransport.DeliveryException.class);
    }

    @Test
    void emailTimeoutAndDisabledProviderCannotReportSuccess() throws Exception {
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class))).thenThrow(new IOException("synthetic network outage"));
        assertThatThrownBy(() -> email().send(message)).isInstanceOf(EmailTransport.DeliveryException.class);
        assertThatThrownBy(() -> new EmailTransport(null, new ObjectMapper(), "disabled", "", "studio@example.invalid", http).send(message)).isInstanceOf(EmailTransport.DeliveryException.class);
        reset(http);
        var unsafe = new EmailTransport.Message(message.to(), message.replyTo(), "Header\r\nBcc: stranger@example.invalid", message.html(), List.of());
        assertThatThrownBy(() -> email().send(unsafe)).isInstanceOf(EmailTransport.DeliveryException.class);
        verifyNoInteractions(http);
    }

    @Test
    void privateStorageUsesAuthenticatedEndpointAndRejectsOversizedOrFailedResponses() throws Exception {
        var storage = new MediaStorage("supabase", "build/test-media", "https://synthetic.supabase.co", "synthetic-key", "project-media", http);
        String key = "11111111-1111-1111-1111-111111111111.jpg";
        response(200, new byte[]{1, 2, 3});
        assertThat(storage.read(key)).containsExactly(1, 2, 3);
        var request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(http).send(request.capture(), any(HttpResponse.BodyHandler.class));
        assertThat(request.getValue().uri().getPath()).isEqualTo("/storage/v1/object/authenticated/project-media/" + key);
        response(200, new byte[5_000_001]);
        assertThatThrownBy(() -> storage.read(key)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        response(503, "private diagnostic".getBytes());
        assertThatThrownBy(() -> storage.read(key)).hasMessageNotContaining("private diagnostic");
        assertThatThrownBy(() -> storage.read("../../secret")).isInstanceOf(IllegalArgumentException.class);
    }
}
