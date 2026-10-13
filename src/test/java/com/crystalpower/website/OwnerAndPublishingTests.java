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
    @Autowired jakarta.validation.Validator validator;

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
        mvc.perform(get("/portfolio/share-check")).andExpect(status().isNotFound())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("noindex, nofollow")))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Private secret title"))));
        mvc.perform(get("/sitemap.xml")).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("share-check"))));
        UUID image = UUID.randomUUID();
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/jpeg', 100, 100, 100)", image, project.id(), image + ".jpg");
        var saved = projects.save(project.id(), 1, projectContent("<script>unexpected()</script> & title", image), owner.id());
        projects.publish(project.id(), saved.version(), owner.id());
        mvc.perform(get("/portfolio/share-check")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("&lt;script&gt;unexpected()&lt;/script&gt; &amp; title")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("property=\"og:image\" content=\"http://localhost:8080/api/media/" + image)))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"twitter:image\" content=\"http://localhost:8080/api/media/" + image)))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("<script>unexpected()"))));
        mvc.perform(get("/sitemap.xml")).andExpect(content().string(org.hamcrest.Matchers.containsString("/portfolio/share-check")));
        mvc.perform(get("/admin")).andExpect(header().string("X-Robots-Tag", "noindex, nofollow"));
    }

    @Test
    void historicalStoredContentWithoutScreenSlotsRemainsReadable() throws Exception {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var draft = projects.create("legacy-screen-content", projectContent("Legacy project", null), owner.id());
        var oldPayload = (com.fasterxml.jackson.databind.node.ObjectNode) json.valueToTree(draft.content());
        oldPayload.remove("screens");
        database.update("UPDATE project_revision SET payload = ? WHERE project_id = ?", json.writeValueAsString(oldPayload), draft.id());
        assertThat(projects.draft(draft.id()).content().screens()).isNull();
        assertThat(projects.draft(draft.id()).content().title()).isEqualTo("Legacy project");
        assertThat(projects.revisions(draft.id())).hasSize(1);
    }

    @Test
    void deviceScreensRejectForeignMediaAndIncompleteDescriptions() {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("screen-owner", projectContent("Screen owner", null), owner.id());
        var other = projects.create("screen-other", projectContent("Other", null), owner.id());
        UUID own = UUID.randomUUID(), foreign = UUID.randomUUID();
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/jpeg', 100, 100, 100)", own, first.id(), own + ".jpg");
        database.update("INSERT INTO project_media (id, project_id, storage_key, content_type, bytes, width, height) VALUES (?, ?, ?, 'image/jpeg', 100, 100, 100)", foreign, other.id(), foreign + ".jpg");
        for (boolean desktop : List.of(true, false)) {
            var foreignScreen = new ProjectContent.GalleryImage(foreign, "Foreign screen");
            var slots = new ProjectContent.Screens(desktop ? foreignScreen : null, desktop ? null : foreignScreen);
            assertThatThrownBy(() -> projects.save(first.id(), 1, withScreens(projectContent("Screen owner", own), slots), owner.id()))
                    .isInstanceOf(ResponseStatusException.class).hasMessageContaining("Images must belong");
        }
        var blank = projects.save(first.id(), 1, withScreens(projectContent("Screen owner", own),
                new ProjectContent.Screens(null, new ProjectContent.GalleryImage(own, ""))), owner.id());
        assertThatThrownBy(() -> projects.publish(first.id(), blank.version(), owner.id()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("description to each selected device screenshot");
        var invalid = withScreens(projectContent("Screen owner", own), new ProjectContent.Screens(
                new ProjectContent.GalleryImage(own, null), new ProjectContent.GalleryImage(null, "Mobile")));
        assertThat(validator.validate(invalid)).extracting(value -> value.getPropertyPath().toString())
                .contains("screens.desktop.alt", "screens.mobile.mediaId");
    }

    @Test
    void onlyThePublishedRevisionExposesItsDeviceScreens() throws Exception {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var draft = projects.create("responsive-screens", projectContent("Responsive screens", null), owner.id());
        var source = new java.awt.image.BufferedImage(100, 80, java.awt.image.BufferedImage.TYPE_INT_RGB);
        var bytes = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(source, "png", bytes);
        var upload = new MockMultipartFile("file", "screen.png", "image/png", bytes.toByteArray());
        var cover = media.upload(draft.id(), upload, owner.id());
        var desktop = media.upload(draft.id(), upload, owner.id());
        var mobile = media.upload(draft.id(), upload, owner.id());
        var replacement = media.upload(draft.id(), upload, owner.id());
        try {
            var saved = projects.save(draft.id(), 1, withScreens(projectContent("Responsive screens", cover.id()),
                    new ProjectContent.Screens(new ProjectContent.GalleryImage(desktop.id(), "Desktop layout"), new ProjectContent.GalleryImage(mobile.id(), "Mobile layout"))), owner.id());
            mvc.perform(get("/api/media/" + desktop.id())).andExpect(status().isNotFound());
            mvc.perform(get("/api/media/" + mobile.id())).andExpect(status().isNotFound());
            projects.publish(draft.id(), saved.version(), owner.id());
            mvc.perform(get("/api/media/" + desktop.id())).andExpect(status().isOk());
            mvc.perform(get("/api/media/" + mobile.id())).andExpect(status().isOk());
            projects.save(draft.id(), saved.version(), withScreens(saved.content(), new ProjectContent.Screens(saved.content().screens().desktop(), new ProjectContent.GalleryImage(replacement.id(), "Unpublished replacement"))), owner.id());
            mvc.perform(get("/api/media/" + replacement.id())).andExpect(status().isNotFound());
            assertThat(projects.published("responsive-screens").content().screens().mobile().mediaId()).isEqualTo(mobile.id());
            projects.unpublish(draft.id(), owner.id());
            mvc.perform(get("/api/media/" + desktop.id())).andExpect(status().isNotFound());
            mvc.perform(get("/api/media/" + mobile.id())).andExpect(status().isNotFound());
        } finally {
            for (var image : List.of(cover, desktop, mobile, replacement)) java.nio.file.Files.deleteIfExists(java.nio.file.Path.of("build/test-media").resolve(image.key()));
        }
    }

    @Test
    void orderingIsAtomicAndPreservesRevisionsAndPresentationFlags() {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("order-first", projectContent("First", null), owner.id());
        var second = projects.create("order-second", projectContent("Second", null), owner.id());
        first = projects.presentation(first.id(), true, 0, true, owner.id());
        projects.ordering(List.of(new ProjectService.OrderChange(first.id(), first.updatedAt(), 2), new ProjectService.OrderChange(second.id(), second.updatedAt(), 1)), owner.id());
        assertThat(projects.draft(first.id()).sortOrder()).isEqualTo(2);
        assertThat(projects.draft(first.id()).featured()).isTrue();
        assertThat(projects.draft(first.id()).archived()).isTrue();
        assertThat(projects.draft(first.id()).version()).isEqualTo(1);
        assertThat(projects.draft(second.id()).sortOrder()).isEqualTo(1);
        assertThat(projects.draft(second.id()).publishedVersion()).isNull();
    }

    @Test
    void staleOrderingAndPresentationNeverOverwriteCompetingChanges() {
        var owner = owners.setup(TOKEN, EMAIL, PASSWORD);
        var first = projects.create("stale-order-first", projectContent("First", null), owner.id());
        var second = projects.create("stale-order-second", projectContent("Second", null), owner.id());
        projects.presentation(second.id(), true, 25, true, owner.id());
        assertThatThrownBy(() -> projects.ordering(List.of(new ProjectService.OrderChange(first.id(), first.updatedAt(), 10), new ProjectService.OrderChange(second.id(), second.updatedAt(), 20)), owner.id()))
                .isInstanceOfSatisfying(ResponseStatusException.class, failure -> assertThat(failure.getStatusCode().value()).isEqualTo(409));
        assertThat(projects.draft(first.id()).sortOrder()).isEqualTo(0);
        assertThat(projects.draft(second.id()).sortOrder()).isEqualTo(25);
        assertThatThrownBy(() -> projects.presentation(second.id(), false, 0, false, owner.id(), second.updatedAt()))
                .isInstanceOfSatisfying(ResponseStatusException.class, failure -> assertThat(failure.getStatusCode().value()).isEqualTo(409));
        assertThat(projects.draft(second.id()).archived()).isTrue();
        assertThatThrownBy(() -> projects.ordering(List.of(new ProjectService.OrderChange(first.id(), first.updatedAt(), 1), new ProjectService.OrderChange(first.id(), first.updatedAt(), 2)), owner.id()))
                .isInstanceOfSatisfying(ResponseStatusException.class, failure -> assertThat(failure.getStatusCode().value()).isEqualTo(400));
    }

    @Test
    void orderingEndpointRequiresOwnerAndValidSnapshotFields() throws Exception {
        mvc.perform(post("/api/admin/projects/ordering").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(EMAIL).roles("OWNER")).contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/projects/ordering").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"items\":[]}"))
                .andExpect(status().isUnauthorized());
        for (String body : List.of("{\"items\":[]}", "{\"items\":[null]}", "{\"items\":[{\"id\":\"" + UUID.randomUUID() + "\",\"sortOrder\":10001}]}")) {
            mvc.perform(post("/api/admin/projects/ordering").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(EMAIL).roles("OWNER")).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void presentationSnapshotIsOptionalForLegacyClientsAndEnforcedWhenProvided() throws Exception {
        var result = mvc.perform(post("/api/admin/auth/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", TOKEN, "email", EMAIL, "password", PASSWORD)))).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) result.getRequest().getSession(false);
        String secret = json.readTree(mvc.perform(get("/api/admin/auth/enrolment").session(session)).andReturn().getResponse().getContentAsString()).get("secret").asText();
        mvc.perform(post("/api/admin/auth/verify").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code", code(secret)))))
                .andExpect(status().isOk());
        var owner = ownerRepository.byEmail(EMAIL).orElseThrow();
        var draft = projects.create("legacy-presentation", projectContent("Legacy client", null), owner.id());
        mvc.perform(patch("/api/admin/projects/" + draft.id() + "/presentation").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"featured\":true,\"sortOrder\":4,\"archived\":false}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.featured").value(true));
        mvc.perform(patch("/api/admin/projects/" + draft.id() + "/presentation").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("featured", false, "sortOrder", 0, "archived", true, "expectedUpdatedAt", draft.updatedAt()))))
                .andExpect(status().isConflict());
        assertThat(projects.draft(draft.id()).sortOrder()).isEqualTo(4);
        assertThat(projects.draft(draft.id()).archived()).isFalse();
    }

    @Test
    void cancellingAuthenticatorSetupRequiresOwnerAndCsrfAndPreservesCurrentCredentials() throws Exception {
        var setup = mvc.perform(post("/api/admin/auth/setup").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", TOKEN, "email", EMAIL, "password", PASSWORD)))).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) setup.getRequest().getSession(false);
        String initialSecret = json.readTree(mvc.perform(get("/api/admin/auth/enrolment").session(session)).andReturn().getResponse().getContentAsString()).get("secret").asText();
        var enrolled = json.readTree(mvc.perform(post("/api/admin/auth/verify").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", code(initialSecret))))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var before = ownerRepository.byEmail(EMAIL).orElseThrow();
        var pending = json.readTree(mvc.perform(post("/api/admin/account/authenticator").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("password", PASSWORD, "code", enrolled.get("recoveryCodes").get(0).asText()))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        mvc.perform(post("/api/admin/account/authenticator/cancel").with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/account/authenticator/cancel").session(session)).andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/account/authenticator/cancel").session(session).with(csrf())).andExpect(status().isOk());
        mvc.perform(post("/api/admin/account/authenticator/confirm").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("code", code(pending.get("secret").asText()))))).andExpect(status().isBadRequest());
        var after = ownerRepository.byEmail(EMAIL).orElseThrow();
        assertThat(after.credentialsVersion()).isEqualTo(before.credentialsVersion());
        assertThat(after.encryptedTotp()).isEqualTo(before.encryptedTotp());
        assertThat(owners.verify(after.id(), after.credentialsVersion(), enrolled.get("recoveryCodes").get(1).asText()).principal().id()).isEqualTo(after.id());
        mvc.perform(get("/api/admin/projects").session(session)).andExpect(status().isOk());
    }

    private ProjectContent withScreens(ProjectContent content, ProjectContent.Screens screens) {
        return new ProjectContent(content.title(), content.category(), content.summary(), content.overview(), content.approach(), content.outcome(), content.liveUrl(), content.technologies(), content.displayDevice(), content.coverMediaId(), content.coverAlt(), content.gallery(), screens);
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


