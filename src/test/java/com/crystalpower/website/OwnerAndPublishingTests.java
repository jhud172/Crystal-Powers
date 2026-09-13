package com.crystalpower.website;

import com.crystalpower.website.dto.ProjectContent;
import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.security.SecretVault;
import com.crystalpower.website.service.OwnerService;
import com.crystalpower.website.service.ProjectService;
import com.crystalpower.website.service.ProjectMediaService;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.owner.setup-token=synthetic-test-only-setup-token-0000000000")
@AutoConfigureMockMvc
class OwnerAndPublishingTests {
    private static final String TOKEN = "synthetic-test-only-setup-token-0000000000";
    private static final String EMAIL = "owner@example.invalid";
    private static final String PASSWORD = "Synthetic-test-password-2026";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate database;
    @Autowired OwnerService owners;
    @Autowired OwnerRepository ownerRepository;
    @Autowired ProjectService projects;
    @Autowired SecretVault vault;
    @Autowired ProjectMediaService media;

    @BeforeEach
    void clearSyntheticDatabase() {
        for (String table : List.of("admin_audit", "project_media", "project_revision", "project", "password_reset", "recovery_code", "admin_account")) {
            database.update("DELETE FROM " + table);
        }
    }

    @Test
    void passwordAloneCannotReadDraftsAndTotpAndRecoveryCodesCannotBeReplayed() throws Exception {
        MvcResult setup = mvc.perform(post("/api/admin/auth/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", TOKEN, "email", EMAIL, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        MockHttpSession session = (MockHttpSession) setup.getRequest().getSession(false);
        mvc.perform(get("/api/admin/projects").session(session)).andExpect(status().isUnauthorized());
        String secret = json.readTree(mvc.perform(get("/api/admin/auth/enrolment").session(session)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("secret").asText();
        assertThat(ownerRepository.byEmail(EMAIL).orElseThrow().encryptedTotp()).doesNotContain(secret);
        String code = code(secret);
        JsonNode verified = json.readTree(mvc.perform(post("/api/admin/auth/verify").session(session).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code", code))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(verified.get("recoveryCodes").size()).isEqualTo(10);
        mvc.perform(get("/api/admin/projects").session(session)).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get("/api/admin/auth/enrolment").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/auth/logout").session(session).with(csrf())).andExpect(status().isOk());

        MockHttpSession next = login();
        mvc.perform(post("/api/admin/auth/verify").session(next).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", code)))).andExpect(status().isUnauthorized());
        String recovery = verified.get("recoveryCodes").get(0).asText();
        mvc.perform(post("/api/admin/auth/verify").session(next).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", recovery)))).andExpect(status().isOk());
        mvc.perform(post("/api/admin/auth/logout").session(next).with(csrf())).andExpect(status().isOk());
        MockHttpSession again = login();
        mvc.perform(post("/api/admin/auth/verify").session(again).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", recovery)))).andExpect(status().isUnauthorized());
    }

    @Test
    void actualCsrfTokensRotateAcrossAuthenticationAndOwnerSetupCloses() throws Exception {
        MvcResult initial = mvc.perform(get("/api/admin/auth/csrf")).andExpect(status().isOk()).andReturn();
        String firstToken = json.readTree(initial.getResponse().getContentAsString()).get("token").asText();
        MockHttpSession before = (MockHttpSession) initial.getRequest().getSession(false);
        String setupBody = json.writeValueAsString(Map.of("token", TOKEN, "email", EMAIL, "password", PASSWORD));
        mvc.perform(post("/api/admin/auth/setup").session(before).contentType(MediaType.APPLICATION_JSON).content(setupBody)).andExpect(status().isForbidden());
        MvcResult result = mvc.perform(post("/api/admin/auth/setup").session(before).header("X-CSRF-TOKEN", firstToken)
                .contentType(MediaType.APPLICATION_JSON).content(setupBody)).andExpect(status().isOk()).andReturn();
        MockHttpSession after = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(after.getId()).isNotEqualTo(before.getId());
        assertThat(owners.setupAvailable()).isFalse();
        String current = json.readTree(mvc.perform(get("/api/admin/auth/csrf").session(after)).andReturn().getResponse().getContentAsString()).get("token").asText();
        assertThat(current).isNotEqualTo(firstToken);
        mvc.perform(post("/api/admin/auth/verify").session(after).header("X-CSRF-TOKEN", firstToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"000000\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/auth/setup").session(after).header("X-CSRF-TOKEN", current)
                .contentType(MediaType.APPLICATION_JSON).content(setupBody)).andExpect(status().isForbidden());
    }

    @Test
    void draftsStayPrivateAndPublishingIsVersionChecked() throws Exception {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("real-project", projectContent("First published title", null), owner.id());
        assertThat(projects.published()).isEmpty();
        mvc.perform(get("/api/projects/real-project")).andExpect(status().isNotFound());
        assertThatThrownBy(() -> projects.publish(first.id(), 1, owner.id())).isInstanceOf(ResponseStatusException.class);
        UUID media = UUID.randomUUID();
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/png', 100, 100, 100)", media, first.id(), "synthetic.png");
        var ready = projects.save(first.id(), 1, projectContent("First published title", media), owner.id());
        projects.publish(first.id(), ready.version(), owner.id());
        assertThat(projects.publicMedia(media)).isTrue();
        var changed = projects.save(first.id(), ready.version(), projectContent("Private unfinished revision", media), owner.id());
        assertThat(projects.published("real-project").content().title()).isEqualTo("First published title");
        mvc.perform(get("/api/projects")).andExpect(status().isOk()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Private unfinished revision"))));
        assertThatThrownBy(() -> projects.save(first.id(), ready.version(), projectContent("Stale overwrite", media), owner.id())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> projects.publish(first.id(), ready.version(), owner.id())).isInstanceOf(ResponseStatusException.class);
        projects.publish(first.id(), changed.version(), owner.id());
        assertThat(projects.published("real-project").content().title()).isEqualTo("Private unfinished revision");
        projects.unpublish(first.id(), owner.id());
        assertThat(projects.published()).isEmpty();
        assertThat(projects.publicMedia(media)).isFalse();
    }

    @Test
    void uploadedImagesAreSanitisedAndOnlyPublishedReferencesCanBeReadAnonymously() throws Exception {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var draft = projects.create("private-upload", projectContent("Private image", null), owner.id());
        var source = new java.awt.image.BufferedImage(100, 80, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(source, "png", bytes);
        var upload = new MockMultipartFile("file", "../../unsafe-name.svg", "application/octet-stream", bytes.toByteArray());
        var image = media.upload(draft.id(), upload, owner.id());
        assertThat(image.key()).isEqualTo(image.id() + ".jpg");
        assertThat(image.contentType()).isEqualTo("image/jpeg");
        assertThat(media.read(image.id())).startsWith((byte) 0xff, (byte) 0xd8);
        mvc.perform(get("/api/media/" + image.id())).andExpect(status().isNotFound());
        mvc.perform(get("/api/admin/media/" + image.id())).andExpect(status().isUnauthorized());
        mvc.perform(multipart("/api/admin/projects/" + draft.id() + "/media").file(upload).with(csrf())).andExpect(status().isUnauthorized());
        var saved = projects.save(draft.id(), draft.version(), projectContent("Published image", image.id()), owner.id());
        projects.publish(draft.id(), saved.version(), owner.id());
        mvc.perform(get("/api/media/" + image.id())).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        projects.presentation(draft.id(), false, 0, true, owner.id());
        mvc.perform(get("/api/media/" + image.id())).andExpect(status().isNotFound());
        var script = new MockMultipartFile("file", "looks-like-image.png", "image/png", "<svg onload='alert(1)'/>".getBytes());
        assertThatThrownBy(() -> media.upload(draft.id(), script, owner.id())).isInstanceOf(ResponseStatusException.class);
        java.nio.file.Files.deleteIfExists(java.nio.file.Path.of("build/test-media").resolve(image.key()));
    }

    @Test
    void crossProjectMediaAndUnsafeLinksAreRejected() {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("first", projectContent("First", null), owner.id());
        var other = projects.create("other", projectContent("Other", null), owner.id());
        UUID media = UUID.randomUUID();
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/png', 100, 100, 100)", media, first.id(), "synthetic.png");
        assertThatThrownBy(() -> projects.save(other.id(), 1, projectContent("Other", media), owner.id())).isInstanceOf(ResponseStatusException.class);
        ProjectContent safe = projectContent("Unsafe link", null);
        var unsafe = new ProjectContent(safe.title(), safe.category(), safe.summary(), "", "", "", "javascript:alert(1)", List.of(), safe.displayDevice(), null, "", List.of());
        assertThatThrownBy(() -> projects.create("unsafe", unsafe, owner.id())).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void restoringHistoryCreatesANewPrivateRevisionAndRejectsStaleEdits() {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("history", projectContent("Original", null), owner.id());
        projects.save(first.id(), 1, projectContent("Second", null), owner.id());
        var restored = projects.restoreRevision(first.id(), 1, 2, owner.id());
        assertThat(restored.version()).isEqualTo(3);
        assertThat(restored.content().title()).isEqualTo("Original");
        assertThat(projects.revisions(first.id())).extracting("version").containsExactly(3, 2, 1);
        assertThat(projects.published()).isEmpty();
        assertThatThrownBy(() -> projects.restoreRevision(first.id(), 2, 2, owner.id())).isInstanceOf(ResponseStatusException.class);
        assertThat(projects.draft(first.id()).version()).isEqualTo(3);
    }

    @Test
    void hostedTablesHaveNoAnonymousDatabaseAccess() {
        String product = database.execute((org.springframework.jdbc.core.ConnectionCallback<String>) connection -> connection.getMetaData().getDatabaseProductName());
        if (!"PostgreSQL".equals(product)) return;
        for (String table : List.of("admin_account", "recovery_code", "password_reset", "project", "project_revision", "project_media", "admin_audit")) {
            assertThat(database.queryForObject("SELECT relrowsecurity FROM pg_class WHERE oid = ?::regclass", Boolean.class, "public." + table)).isTrue();
            assertThat(database.queryForObject("SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = ?", Integer.class, table)).isZero();
        }
    }

    @Test
    void shareMetadataEscapesPublishedContentAndNeverIncludesDrafts() throws Exception {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var project = projects.create("share-check", projectContent("Private secret title", null), owner.id());
        mvc.perform(get("/portfolio/share-check")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("noindex, nofollow")))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Private secret title"))));
        mvc.perform(get("/sitemap.xml")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("share-check"))));
        UUID image = UUID.randomUUID();
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/jpeg', 100, 100, 100)", image, project.id(), image + ".jpg");
        var saved = projects.save(project.id(), 1, projectContent("<script>unexpected()</script> & title", image), owner.id());
        projects.publish(project.id(), saved.version(), owner.id());
        mvc.perform(get("/portfolio/share-check")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("&lt;script&gt;unexpected()&lt;/script&gt; &amp; title")))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("<script>unexpected()"))));
        mvc.perform(get("/sitemap.xml")).andExpect(content().string(org.hamcrest.Matchers.containsString("/portfolio/share-check")));
        mvc.perform(get("/admin")).andExpect(header().string("X-Robots-Tag", "noindex, nofollow"));
    }

    private MockHttpSession login() throws Exception {
        return (MockHttpSession) mvc.perform(post("/api/admin/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", EMAIL, "password", PASSWORD)))).andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }
    private String code(String secret) throws Exception {
        var generator = new TimeBasedOneTimePasswordGenerator();
        return generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm()), Instant.now());
    }
    private ProjectContent projectContent(String title, UUID cover) {
        return new ProjectContent(title, ProjectContent.Category.WEBSITE, "A real project summary", "Overview", "Approach", "Outcome", "https://example.com", List.of("React"), ProjectContent.Device.laptop, cover, "Project homepage", List.of());
    }
}


