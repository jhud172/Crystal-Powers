package com.crystalpower.website.service;

import java.net.URI;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class DocksWindowsRelease {
    public record Release(String version, URI asset, String sha256) {}

    private final Environment config;

    public DocksWindowsRelease(Environment config) { this.config = config; }

    public Optional<Release> current() {
        String version = config.getProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", "");
        if (!version.matches("(0|[1-9][0-9]{0,4})\\.(0|[1-9][0-9]{0,4})\\.(0|[1-9][0-9]{0,4})\\.0"))
            return Optional.empty();
        String[] parts = version.split("\\.");
        for (String part : parts) if (Integer.parseInt(part) > 65535) return Optional.empty();
        if (Integer.parseInt(parts[0]) == 0 && Integer.parseInt(parts[1]) == 0) return Optional.empty();
        String sha256 = config.getProperty("DOCKS_RELEASE_WINDOWS_X64_SHA256", "");
        if (!sha256.matches("[a-fA-F0-9]{64}")) return Optional.empty();
        String filename = "Crystal-Docks-" + version + "-win-x64-signed.msix";
        try {
            URI asset = URI.create(config.getProperty("DOCKS_RELEASE_WINDOWS_X64_URL", ""));
            if (!"https".equals(asset.getScheme()) || asset.getHost() == null || asset.getPort() != -1
                    || asset.getRawUserInfo() != null || asset.getRawQuery() != null || asset.getRawFragment() != null)
                return Optional.empty();
            String path = asset.getRawPath();
            var supabase = URI.create(config.getProperty("app.media.supabase-url", ""));
            String githubAsset = "/releases/download/v" + version + "/" + filename;
            boolean approvedGitHub = "github.com".equalsIgnoreCase(asset.getHost())
                    && (path.equals("/jhud172/crystal-docks-downloads" + githubAsset)
                    || path.equals("/jhud172/crystal-docks" + githubAsset));
            boolean approvedStorage = asset.getHost().equalsIgnoreCase(supabase.getHost())
                    && path.equals("/storage/v1/object/public/docks-downloads/" + filename);
            return approvedGitHub || approvedStorage ? Optional.of(new Release(version, asset, sha256.toLowerCase(Locale.ROOT))) : Optional.empty();
        } catch (IllegalArgumentException invalidUri) {
            return Optional.empty();
        }
    }
}
