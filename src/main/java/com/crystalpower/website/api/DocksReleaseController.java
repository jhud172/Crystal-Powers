package com.crystalpower.website.api;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.env.Environment;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DocksReleaseController {
    private static final String ROOT = "/api/docks/releases/windows-x64";
    private final Environment config;

    public DocksReleaseController(Environment config) { this.config = config; }

    private record Release(String version, URI asset) {}

    @GetMapping(ROOT)
    public ResponseEntity<Map<String, String>> current() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(
                release().map(value -> Map.of("version", value.version())).orElseGet(Map::of));
    }

    @GetMapping(ROOT + "/{version}/download")
    public ResponseEntity<Void> download(@PathVariable("version") String version) {
        return release().filter(value -> value.version().equals(version))
                .map(value -> ResponseEntity.status(HttpStatus.FOUND).cacheControl(CacheControl.noStore())
                        .location(value.asset()).<Void>build())
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).cacheControl(CacheControl.noStore()).build());
    }

    private Optional<Release> release() {
        String version = config.getProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", "");
        if (!version.matches("(0|[1-9][0-9]{0,4})\\.(0|[1-9][0-9]{0,4})\\.(0|[1-9][0-9]{0,4})\\.0"))
            return Optional.empty();
        String[] parts = version.split("\\.");
        for (String part : parts) if (Integer.parseInt(part) > 65535) return Optional.empty();
        if (Integer.parseInt(parts[0]) == 0 && Integer.parseInt(parts[1]) == 0) return Optional.empty();
        String filename = "Crystal-Docks-" + version + "-win-x64-signed.msix";
        try {
            URI asset = URI.create(config.getProperty("DOCKS_RELEASE_WINDOWS_X64_URL", ""));
            if (!"https".equals(asset.getScheme()) || asset.getHost() == null || asset.getPort() != -1
                    || asset.getRawUserInfo() != null || asset.getRawQuery() != null || asset.getRawFragment() != null)
                return Optional.empty();
            String path = asset.getRawPath();
            var supabase = URI.create(config.getProperty("app.media.supabase-url", ""));
            boolean approvedGitHub = "github.com".equalsIgnoreCase(asset.getHost())
                    && path.equals("/jhud172/crystal-docks/releases/download/v" + version + "/" + filename);
            boolean approvedStorage = asset.getHost().equalsIgnoreCase(supabase.getHost())
                    && path.equals("/storage/v1/object/public/docks-downloads/" + filename);
            return approvedGitHub || approvedStorage ? Optional.of(new Release(version, asset)) : Optional.empty();
        } catch (IllegalArgumentException invalidUri) {
            return Optional.empty();
        }
    }
}
