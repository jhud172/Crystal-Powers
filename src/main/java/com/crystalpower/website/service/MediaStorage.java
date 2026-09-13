package com.crystalpower.website.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;

/** Private objects are always served through the application's publication checks. */
@Component
public class MediaStorage {
    private final boolean local;
    private final Path directory;
    private final String endpoint;
    private final String secret;
    private final HttpClient http;
    @org.springframework.beans.factory.annotation.Autowired
    public MediaStorage(@Value("${app.media.provider}") String provider, @Value("${app.media.directory}") String directory,
            @Value("${app.media.supabase-url:}") String url, @Value("${app.media.supabase-key:}") String secret,
            @Value("${app.media.bucket:project-media}") String bucket) {
        this(provider, directory, url, secret, bucket, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).followRedirects(HttpClient.Redirect.NEVER).build());
    }
    MediaStorage(String provider, String directory, String url, String secret, String bucket, HttpClient http) {
        this.http = http;
        this.local = "local".equals(provider); this.directory = Path.of(directory).toAbsolutePath().normalize(); this.secret = secret;
        if (!local && (!"supabase".equals(provider) || !url.matches("https://[a-z0-9-]+\\.supabase\\.co") || secret.isBlank() || !bucket.matches("[a-z0-9-]+"))) {
            throw new IllegalStateException("Configure private Supabase media storage, or use the local profile for development.");
        }
        this.endpoint = url + "/storage/v1/object/" + bucket + "/";
    }
    public void put(String key, byte[] bytes) {
        Path destination = path(key);
        try {
            if (local) {
                Files.createDirectories(directory);
                Path temporary = Files.createTempFile(directory, "upload-", ".tmp");
                try { Files.write(temporary, bytes); Files.move(temporary, destination, StandardCopyOption.ATOMIC_MOVE); }
                finally { Files.deleteIfExists(temporary); }
            } else {
                var response = http.send(request(key).header("Content-Type", "image/jpeg").POST(HttpRequest.BodyPublishers.ofByteArray(bytes)).build(), HttpResponse.BodyHandlers.discarding());
                if (response.statusCode() < 200 || response.statusCode() >= 300) throw unavailable();
            }
        } catch (IOException exception) { throw unavailable(); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw unavailable(); }
    }
    public byte[] read(String key) {
        Path source = path(key);
        try {
            if (local) {
                if (!Files.isRegularFile(source)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found.");
                if (Files.size(source) > 5_000_000) throw unavailable();
                return Files.readAllBytes(source);
            }
            var response = http.send(request(key).uri(URI.create(endpoint.replace("/storage/v1/object/", "/storage/v1/object/authenticated/") + key)).GET().build(), HttpResponse.BodyHandlers.ofInputStream());
            try (var stream = response.body()) {
                if (response.statusCode() == 404) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Image not found.");
                if (response.statusCode() != 200) throw unavailable();
                byte[] data = stream.readNBytes(5_000_001);
                if (data.length > 5_000_000) throw unavailable();
                return data;
            }
        } catch (IOException exception) { throw unavailable(); }
        catch (InterruptedException exception) { Thread.currentThread().interrupt(); throw unavailable(); }
    }
    private HttpRequest.Builder request(String key) { return HttpRequest.newBuilder(URI.create(endpoint + key)).timeout(Duration.ofSeconds(20)).header("Authorization", "Bearer " + secret).header("apikey", secret); }
    private Path path(String key) {
        if (!key.matches("[a-f0-9-]{36}\\.jpg")) throw new IllegalArgumentException("Invalid media storage key");
        Path target = directory.resolve(key).normalize();
        if (!target.startsWith(directory)) throw new IllegalArgumentException("Invalid media storage path");
        return target;
    }
    private ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Image storage is temporarily unavailable. Please try again."); }
}
