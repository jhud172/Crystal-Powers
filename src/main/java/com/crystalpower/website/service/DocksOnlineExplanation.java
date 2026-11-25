package com.crystalpower.website.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocksOnlineExplanation {
    private static final String MODEL = "gpt-6-luna";
    private static final int OUTPUT_LIMIT = 240;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Environment config;
    private final ObjectMapper json;
    private final DocksEntitlements entitlements;
    private final DocksAiAllowance allowance;

    private record Settings(String key, int accountLimit, long monthlyPence, long requestPence) {}

    public DocksOnlineExplanation(Environment config, ObjectMapper json, DocksEntitlements entitlements, DocksAiAllowance allowance) {
        this.config = config;
        this.json = json;
        this.entitlements = entitlements;
        this.allowance = allowance;
    }

    public boolean available() { return settings().isPresent(); }

    public String explain(UUID account, UUID installation, Integer cpu, Integer memory) {
        if (!reading(cpu) || !reading(memory) || (cpu == null && memory == null))
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Run a check with a processor or memory reading.");
        var settings = settings().orElseThrow(DocksOnlineExplanation::unavailable);
        boolean premium = entitlements.status(account, installation).map(DocksEntitlements.Status::canRepair).orElse(false);
        if (!premium) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "An enrolled device with Premium is required.");
        if (!allowance.reserve(account, settings.accountLimit(), settings.monthlyPence(), settings.requestPence()))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "The monthly online explanation allowance is unavailable or used up.");
        return requestExplanation(settings.key(), cpu, memory).orElseThrow(DocksOnlineExplanation::unavailable);
    }

    Optional<String> requestExplanation(String apiKey, Integer cpu, Integer memory) {
        try {
            String body = json.writeValueAsString(payload(cpu, memory));
            var request = HttpRequest.newBuilder(URI.create("https://api.openai.com/v1/responses"))
                    .timeout(Duration.ofSeconds(18)).header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
            var result = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (result.statusCode() != 200 || result.body().length() > 65536) return Optional.empty();
            var answer = json.readTree(result.body());
            if (!"completed".equals(answer.path("status").asText())) return Optional.empty();
            for (var output : answer.path("output"))
                for (var item : output.path("content"))
                    if ("output_text".equals(item.path("type").asText())) {
                        String text = item.path("text").asText().strip();
                        return text.isEmpty() || text.length() > 2400 ? Optional.empty() : Optional.of(text);
                    }
            return Optional.empty();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (IOException | IllegalArgumentException failure) {
            return Optional.empty();
        }
    }

    static Map<String, Object> payload(Integer cpu, Integer memory) {
        return Map.of("model", MODEL, "store", false, "max_output_tokens", OUTPUT_LIMIT,
                "service_tier", "default", "reasoning", Map.of("effort", "none"),
                "instructions", "Explain these processor and memory readings in plain British English, in at most 120 words. "
                    + "They are a short Windows sample. Explain uncertainty and never infer a cause or a fault. "
                    + "Use no commands, links or instructions for changing settings.",
                "input", "Processor use: " + percent(cpu) + "\nMemory use: " + percent(memory));
    }

    private Optional<Settings> settings() {
        String key = config.getProperty("DOCKS_AI_OPENAI_KEY", "");
        int limit = config.getProperty("DOCKS_AI_ACCOUNT_MONTHLY_LIMIT", Integer.class, 0);
        long budget = config.getProperty("DOCKS_AI_MONTHLY_BUDGET_PENCE", Long.class, 0L);
        long reserve = config.getProperty("DOCKS_AI_REQUEST_RESERVE_PENCE", Long.class, 0L);
        if (config.getProperty("DOCKS_AI_ENABLED", Boolean.class, false)
                && config.getProperty("DOCKS_AI_PRICING_VERIFIED", Boolean.class, false)
                && !key.isBlank() && limit > 0 && reserve > 0 && budget >= reserve)
            return Optional.of(new Settings(key, limit, budget, reserve));
        return Optional.empty();
    }

    private static boolean reading(Integer value) { return value == null || (value >= 0 && value <= 100); }
    private static String percent(Integer value) { return value == null ? "unavailable" : value + "%"; }
    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Online explanations are currently unavailable.");
    }
}
