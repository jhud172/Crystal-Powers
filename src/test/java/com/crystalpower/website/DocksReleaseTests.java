package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;

import com.crystalpower.website.api.DocksReleaseController;
import com.crystalpower.website.service.DocksWindowsRelease;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DocksReleaseTests {
    @Test
    void publishesOnlyTheConfiguredVersionAndApprovedSignedAssetPaths() {
        var config = new MockEnvironment();
        var release = new DocksReleaseController(new DocksWindowsRelease(config));
        String version = "1.2.3.0";
        String path = "/storage/v1/object/public/docks-downloads/Crystal-Docks-1.2.3.0-win-x64-signed.msix";
        assertTrue(release.current().getBody().isEmpty());
        assertEquals(404, release.download(version).getStatusCode().value());
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", version);
        config.setProperty("app.media.supabase-url", "https://fixture.supabase.co");
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_SHA256", "ab".repeat(32));
        for (String bad : new String[] {"http://fixture.supabase.co" + path, "https://other.invalid" + path,
                "https://fixture.supabase.co" + path + "?skip=1", "https://fixture.supabase.co" + path.replace("signed", "unsigned")}) {
            config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", bad);
            assertTrue(release.current().getBody().isEmpty());
            assertEquals(404, release.download(version).getStatusCode().value());
        }
        String storage = "https://fixture.supabase.co" + path;
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", storage);
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_SHA256", "");
        assertTrue(release.current().getBody().isEmpty());
        assertEquals(404, release.download(version).getStatusCode().value());
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_SHA256", "not-a-digest");
        assertTrue(release.current().getBody().isEmpty());
        assertEquals(404, release.download(version).getStatusCode().value());
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_SHA256", "AB".repeat(32));
        assertEquals(version, release.current().getBody().get("version"));
        assertEquals("ab".repeat(32), release.current().getBody().get("sha256"));
        assertEquals("no-store", release.current().getHeaders().getCacheControl());
        assertEquals(302, release.download(version).getStatusCode().value());
        assertEquals(storage, release.download(version).getHeaders().getLocation().toString());
        assertEquals(404, release.download("1.2.4.0").getStatusCode().value());
        String githubAsset = "/releases/download/v1.2.3.0/Crystal-Docks-1.2.3.0-win-x64-signed.msix";
        for (String repo : new String[] {"crystal-docks-downloads", "crystal-docks"}) {
            String github = "https://github.com/jhud172/" + repo + githubAsset;
            config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", github);
            assertEquals(302, release.download(version).getStatusCode().value());
            assertEquals(github, release.download(version).getHeaders().getLocation().toString());
        }
        String downloads = "https://github.com/jhud172/crystal-docks-downloads";
        for (String bad : new String[] {downloads + "-other" + githubAsset,
                downloads + githubAsset.replace("/v1.2.3.0/", "/v1.2.4.0/"),
                downloads + githubAsset.replace("-signed.msix", "-unsigned-preview.msix"),
                downloads + githubAsset + "?download=1", downloads + githubAsset + "#asset"}) {
            config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", bad);
            assertTrue(release.current().getBody().isEmpty());
            assertEquals(404, release.download(version).getStatusCode().value());
        }
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", downloads + githubAsset);
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", "65536.0.0.0");
        assertTrue(release.current().getBody().isEmpty());
    }
}
