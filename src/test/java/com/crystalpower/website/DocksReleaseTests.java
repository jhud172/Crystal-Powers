package com.crystalpower.website;

import static org.junit.jupiter.api.Assertions.*;

import com.crystalpower.website.api.DocksReleaseController;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class DocksReleaseTests {
    @Test
    void publishesOnlyTheConfiguredVersionAndApprovedSignedAssetPaths() {
        var config = new MockEnvironment();
        var release = new DocksReleaseController(config);
        String version = "1.2.3.0";
        String path = "/storage/v1/object/public/docks-downloads/Crystal-Docks-1.2.3.0-win-x64-signed.msix";
        assertTrue(release.current().getBody().isEmpty());
        assertEquals(404, release.download(version).getStatusCode().value());
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", version);
        config.setProperty("app.media.supabase-url", "https://fixture.supabase.co");
        for (String bad : new String[] {"http://fixture.supabase.co" + path, "https://other.invalid" + path,
                "https://fixture.supabase.co" + path + "?skip=1", "https://fixture.supabase.co" + path.replace("signed", "unsigned")}) {
            config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", bad);
            assertTrue(release.current().getBody().isEmpty());
            assertEquals(404, release.download(version).getStatusCode().value());
        }
        String storage = "https://fixture.supabase.co" + path;
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", storage);
        assertEquals(version, release.current().getBody().get("version"));
        assertEquals("no-store", release.current().getHeaders().getCacheControl());
        assertEquals(302, release.download(version).getStatusCode().value());
        assertEquals(storage, release.download(version).getHeaders().getLocation().toString());
        assertEquals(404, release.download("1.2.4.0").getStatusCode().value());
        String github = "https://github.com/jhud172/crystal-docks/releases/download/v1.2.3.0/Crystal-Docks-1.2.3.0-win-x64-signed.msix";
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_URL", github);
        assertEquals(github, release.download(version).getHeaders().getLocation().toString());
        config.setProperty("DOCKS_RELEASE_WINDOWS_X64_VERSION", "65536.0.0.0");
        assertTrue(release.current().getBody().isEmpty());
    }
}
