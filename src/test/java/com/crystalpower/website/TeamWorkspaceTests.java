package com.crystalpower.website;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import javax.crypto.spec.SecretKeySpec;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-team-tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1}", "app.owner.setup-token=synthetic-team-test-setup-token-2026"})
@AutoConfigureMockMvc
@Transactional
class TeamWorkspaceTests {
    private static final String PASSWORD = "Synthetic-team-password-2026";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired OwnerService owners;
    @Autowired TeamMemberService members;
    @Autowired TeamIdentityService identities;
    @Autowired TeamAuthenticationService authentication;
    @Autowired TeamIdentityRepository repository;
    @Autowired TeamChannelService channels;
    @Autowired TeamGroupService groups;
    @Autowired com.crystalpower.website.repository.OwnerRepository ownerRepository;
    @Autowired com.crystalpower.website.repository.SupportRepository supportRepository;
    @Autowired ClientAccessService clientAccess;
    @Autowired ClientPortalService portal;
    @Autowired SupportRequestService supportRequests;
    @Autowired javax.sql.DataSource dataSource;
    @Autowired TeamAttachmentService attachmentService;
    @Autowired TeamAttachmentStore attachments;
    @Autowired SupportModerationService moderation;
    @Autowired UploadScanStore supportScans;
    @Autowired TeamRoleProfileService roleProfiles;
    @Autowired TeamAccessService teamAccess;
    @Autowired com.crystalpower.website.repository.ClientRepository clients;
    @Autowired TeamRoleResolver roleResolver;
    @Autowired TeamSettingsService teamSettings;
    @Autowired TeamAccountService teamAccounts;
    @Autowired SecretVault teamTestVault;
    @Autowired com.crystalpower.website.repository.TeamSettingsRepository settingsRepository;
    @Autowired SupportIntakeStore intakeStore;
    @Autowired UploadValidationService uploadValidator;
    private Authentication root;

    @BeforeEach void owner() throws Exception {
        try (var connection = dataSource.getConnection()) {
            if (connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) {
                // Other integration classes leave a synthetic owner in this shared
                // disposable target. Isolate each team fixture inside its rollback.
                assertThat(connection.getMetaData().getURL()).matches("jdbc:postgresql://127\\.0\\.0\\.1:(55432|55447)/crystal_rebuild_test[a-z0-9_]*");
                assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                new org.springframework.jdbc.core.JdbcTemplate(dataSource).execute("TRUNCATE TABLE public.admin_account CASCADE");
            }
        }
        var owner = owners.setup("synthetic-team-test-setup-token-2026", "root@example.invalid", PASSWORD);
        var principal = owners.verify(owner.id(), owner.credentialsVersion(), code(owners.enrolmentSecret(owner.id()))).principal();
        root = token(principal, "OWNER");
    }

    @Test void configuredIntegrationDatabaseIsActuallySelected() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String expected = System.getProperty("crystal.test.database-url") == null ? "H2" : "PostgreSQL";
            assertThat(connection.getMetaData().getDatabaseProductName()).isEqualTo(expected);
        }
    }

    @Test void activationCannotChooseItsRoleAndTeamAdminCannotEnterOwnerApis() throws Exception {
        var invited = members.create(root, "support@example.invalid", "Support", TeamRole.SUPPORT);
        mvc.perform(post("/api/team/auth/activate").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("token", invitationToken(invited), "password", PASSWORD, "role", "ADMIN")))).andExpect(status().isOk());
        assertThat(repository.credentials(invited.member().id(), false).orElseThrow().member().role()).isEqualTo(TeamRole.SUPPORT);
        Authentication support = enrol(invited.member().id());
        mvc.perform(get("/api/team/members").with(authentication(support))).andExpect(status().isForbidden());
        Authentication admin = member("admin", TeamRole.ADMIN);
        mvc.perform(get("/api/team/members").with(authentication(admin))).andExpect(status().isOk());
        mvc.perform(get("/api/admin/projects").with(authentication(admin))).andExpect(status().isForbidden());
        assertThatThrownBy(() -> members.change(admin, ((TeamPrincipal) admin.getPrincipal()).id(), 1, TeamRole.MEMBER, "ACTIVE")).isInstanceOf(ResponseStatusException.class);
    }

    @Test void audiencesAreEnforcedOnReadsAndWritesAndSuspensionRevokesAccess() throws Exception {
        var all = channels.workspace(root).channels();
        var supportChannel = all.stream().filter(item -> item.audience().equals("SUPPORT")).findFirst().orElseThrow();
        var moderation = all.stream().filter(item -> item.audience().equals("MODERATION")).findFirst().orElseThrow();
        Authentication support = member("support", TeamRole.SUPPORT), moderator = member("moderator", TeamRole.MODERATOR);
        mvc.perform(get("/api/team/channels/" + moderation.id() + "/messages").with(authentication(support))).andExpect(status().isNotFound());
        mvc.perform(post("/api/team/channels/" + supportChannel.id() + "/messages").with(authentication(moderator)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Forbidden conversation\"}")).andExpect(status().isNotFound());
        mvc.perform(get("/api/team/workspace").with(authentication(support))).andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"));
        var principal = (TeamPrincipal) support.getPrincipal();
        members.change(root, principal.id(), principal.credentialsVersion(), TeamRole.SUPPORT, "SUSPENDED");
        mvc.perform(get("/api/team/workspace").with(authentication(support))).andExpect(status().isUnauthorized());
    }

    @Test void invitationsAreSingleUseAndReplacementRecoveryRevokesOldCredentials() throws Exception {
        var first = members.create(root, "member@example.invalid", "Member", TeamRole.MEMBER);
        var replacement = members.reissue(root, first.member().id(), first.member().credentialsVersion());
        assertThatThrownBy(() -> identities.activate(invitationToken(first), PASSWORD)).isInstanceOf(ResponseStatusException.class);
        identities.activate(invitationToken(replacement), PASSWORD);
        assertThatThrownBy(() -> identities.activate(invitationToken(replacement), PASSWORD)).isInstanceOf(ResponseStatusException.class);
        var principal = (TeamPrincipal) enrol(first.member().id()).getPrincipal();
        assertThat(authentication.valid(principal)).isTrue();
        var recovery = members.reset(root, principal.id(), principal.credentialsVersion());
        assertThat(authentication.valid(principal)).isFalse();
        var reset = repository.credentials(principal.id(), false).orElseThrow();
        assertThat(reset.passwordHash()).isNull(); assertThat(reset.encryptedTotp()).isNull(); assertThat(reset.mfaEnabled()).isFalse();
        identities.activate(invitationToken(recovery), PASSWORD);
        assertThat(repository.credentials(principal.id(), false).orElseThrow().member().state()).isEqualTo("ACTIVE");
    }

    @Test void messageAuthorsModeratorsAndStaleVersionsHaveSeparateBoundaries() throws Exception {
        var general = channels.workspace(root).channels().stream().filter(item -> item.audience().equals("TEAM")).findFirst().orElseThrow();
        Authentication author = member("author", TeamRole.MEMBER), other = member("other", TeamRole.MEMBER), moderator = member("moderator", TeamRole.MODERATOR);
        var message = channels.post(author, general.id(), "<script>plain text only</script>");
        assertThat(channels.messages(other, general.id(), null).get(0).body()).isEqualTo(message.body());
        assertThatThrownBy(() -> channels.edit(other, general.id(), message.id(), 0, "Another author", false)).isInstanceOf(ResponseStatusException.class);
        channels.edit(author, general.id(), message.id(), 0, "Edited", false);
        assertThatThrownBy(() -> channels.edit(author, general.id(), message.id(), 0, "Stale overwrite", false)).isInstanceOf(ResponseStatusException.class);
        channels.edit(moderator, general.id(), message.id(), 1, "", true);
        assertThat(channels.messages(author, general.id(), null)).isEmpty();
    }

    @Test void passwordPendingSessionCannotReadWorkspaceAndEnrolmentRequiresCsrf() throws Exception {
        var created = members.create(root, "pending@example.invalid", "Pending", TeamRole.MEMBER);
        identities.activate(invitationToken(created), PASSWORD);
        var login = mvc.perform(post("/api/team/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email", "pending@example.invalid", "password", PASSWORD)))).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) login.getRequest().getSession(false);
        mvc.perform(get("/api/team/workspace").session(session)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/team/auth/enrolment").session(session)).andExpect(status().isForbidden());
        var secret = json.readTree(mvc.perform(post("/api/team/auth/enrolment").session(session).with(csrf())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("secret").asText();
        assertThat(repository.credentials(created.member().id(), false).orElseThrow().encryptedTotp()).doesNotContain(secret);
        String accepted = code(secret);
        mvc.perform(post("/api/team/auth/verify").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code", accepted)))).andExpect(status().isOk());
        mvc.perform(get("/api/team/workspace").session(session)).andExpect(status().isOk());
        var current = repository.credentials(created.member().id(), false).orElseThrow();
        assertThatThrownBy(() -> authentication.verify(created.member().id(), current.member().credentialsVersion(), accepted)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void removingGroupMembershipRevokesCachedConversationPinsReadMarkersAndWrites() throws Exception {
        Authentication reader = member("group-reader", TeamRole.MEMBER);
        var readerId = ((TeamPrincipal) reader.getPrincipal()).id();
        var group = groups.save(root, null, 0, "Client delivery", "Private team work", false, List.of(readerId));
        var channel = channels.create(root, "private-delivery", "Private work", "Delivery", "TEAM", group.id());
        var message = channels.post(root, channel.id(), "Private delivery detail");
        channels.pin(root, channel.id(), message.id(), message.version(), true);
        var current = channels.conversation(reader, channel.id(), null, null, null);
        assertThat(current.messages()).extracting(item -> item.body()).contains("Private delivery detail");
        assertThat(channels.workspace(reader).channels()).extracting(item -> item.id()).contains(channel.id());

        groups.save(root, group.id(), group.version(), group.name(), group.description(), false, List.of());
        assertThat(channels.workspace(reader).channels()).extracting(item -> item.id()).doesNotContain(channel.id());
        assertThat(channels.unread(reader)).extracting(item -> item.channelId()).doesNotContain(channel.id());
        for (String suffix : List.of("/messages", "/pins", "/conversation?version=" + current.version())) {
            mvc.perform(get("/api/team/channels/" + channel.id() + suffix).with(authentication(reader)))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(post("/api/team/channels/" + channel.id() + "/messages").with(authentication(reader)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"Revoked write\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/team/channels/" + channel.id() + "/read").with(authentication(reader)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("throughId", message.id()))))
                .andExpect(status().isNotFound());
        assertThat(channels.messages(root, channel.id(), null)).hasSize(1);
    }

    @Test void messageRetryKeysBindTheActorChannelBodyAndReplyAndCannotResurrectRemovedMessages() throws Exception {
        Authentication author = member("retry-author", TeamRole.MEMBER), other = member("retry-other", TeamRole.MEMBER);
        var general = channels.workspace(root).channels().stream().filter(item -> item.audience().equals("TEAM")).findFirst().orElseThrow();
        var second = channels.create(root, "second-team", "Second channel", "Team", "TEAM", null);
        var key = java.util.UUID.randomUUID();
        var first = channels.post(author, general.id(), "A stable message", key, null, List.of());
        assertThat(channels.post(author, general.id(), "A stable message", key, null, List.of()).id()).isEqualTo(first.id());
        assertThat(channels.messages(author, general.id(), null)).hasSize(1);
        assertStatus(409, () -> channels.post(author, general.id(), "Changed intent", key, null, List.of()));
        assertStatus(409, () -> channels.post(other, general.id(), "A stable message", key, null, List.of()));
        assertStatus(409, () -> channels.post(author, second.id(), "A stable message", key, null, List.of()));
        assertStatus(409, () -> channels.post(author, general.id(), "A stable message", key, first.id(), List.of()));
        channels.edit(author, general.id(), first.id(), first.version(), "", true);
        assertStatus(409, () -> channels.post(author, general.id(), "A stable message", key, null, List.of()));
        assertThat(channels.messages(root, general.id(), null)).isEmpty();
    }

    @Test void repliesHistoryCursorsAndReadPositionsCannotCrossChannelsAndPinsRequireCurrentAuthority() throws Exception {
        Authentication author = member("boundary-author", TeamRole.MEMBER);
        var general = channels.workspace(root).channels().stream().filter(item -> item.audience().equals("TEAM")).findFirst().orElseThrow();
        var second = channels.create(root, "separate-history", "Separate history", "Team", "TEAM", null);
        var message = channels.post(author, general.id(), "First channel only");
        assertStatus(404, () -> channels.post(author, second.id(), "Foreign reply", java.util.UUID.randomUUID(), message.id(), List.of()));
        assertStatus(400, () -> channels.conversation(author, second.id(), null, null, message.id()));
        assertStatus(400, () -> channels.markRead(author, second.id(), message.id()));
        assertStatus(403, () -> channels.pin(author, general.id(), message.id(), message.version(), true));
        var pinned = channels.pin(root, general.id(), message.id(), message.version(), true);
        assertThat(channels.pins(author, general.id())).extracting(item -> item.id()).containsExactly(message.id());
        assertStatus(409, () -> channels.edit(author, general.id(), message.id(), message.version(), "Stale edit after pin", false));
        channels.edit(author, general.id(), message.id(), pinned.version(), "Current edit", false);
        mvc.perform(post("/api/team/channels/" + general.id() + "/messages").with(authentication(author))
                .contentType(MediaType.APPLICATION_JSON).content("{\"body\":\"No CSRF token\"}"))
                .andExpect(status().isForbidden());
        assertThat(channels.messages(root, general.id(), null)).hasSize(1);
    }

    @Test void revokedOwnerCredentialsCannotResolveFreshTeamServiceAuthority() {
        var principal = (OwnerPrincipal) root.getPrincipal();
        channels.workspace(root);
        ownerRepository.invalidateSessions(principal.id());
        assertThat(owners.valid(principal)).isFalse();
        assertStatus(401, () -> channels.workspace(root));
        assertStatus(401, () -> groups.list(root));
    }

    @Test void clientPortalOnlyExposesLinkedRequestsSharedMessagesAndCustomerHistory() throws Exception {
        var request = clientRequest("first-client");
        var otherRequest = clientRequest("other-client");
        var invited = clientAccess.provision(root, request.id());
        clientAccess.activate(invited.invitationToken(), PASSWORD);
        Authentication client = token(clientAccess.login(request.clientEmail(), PASSWORD), "CLIENT");
        var note = supportRequests.addMessage(root, request.id(), java.util.UUID.randomUUID(), "INTERNAL", "Private staff note");
        var shared = supportRequests.addMessage(root, request.id(), java.util.UUID.randomUUID(), "CLIENT", "Reviewed client update");
        supportRepository.event(request.id(), ((OwnerPrincipal) root.getPrincipal()).id(), null, "PRIVATE_TEST_EVENT", "Private staff history", false);
        supportRepository.event(request.id(), ((OwnerPrincipal) root.getPrincipal()).id(), null, "PUBLIC_TEST_EVENT", "Agreed progress", true);
        assertThat(portal.conversation(client, request.id(), null).items()).isEmpty();
        assertStatus(400, () -> supportRequests.shareToPortal(root, request.id(), note.id()));
        supportRequests.shareToPortal(root, request.id(), shared.id());
        assertThat(portal.list(client)).extracting(item -> item.id()).containsExactly(request.id());
        assertThat(portal.detail(client, request.id()).messages()).extracting(item -> item.body()).containsExactly("Reviewed client update");
        assertThat(portal.history(client, request.id(), null).items()).extracting(item -> item.detail()).containsExactly("Agreed progress");
        assertStatus(404, () -> portal.detail(client, otherRequest.id()));
        assertStatus(404, () -> portal.projects(client, otherRequest.id().toString()));
        assertStatus(404, () -> portal.conversation(client, request.id(), "TEAM:" + note.id()));
        mvc.perform(get("/api/client/projects/" + otherRequest.id()).with(authentication(client))).andExpect(status().isNotFound());
        mvc.perform(get("/api/team/workspace").with(authentication(client))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/projects").with(authentication(client))).andExpect(status().isForbidden());

        var key = java.util.UUID.randomUUID();
        var reply = portal.reply(client, request.id(), key, "Client feedback");
        assertThat(portal.reply(client, request.id(), key, "Client feedback")).isEqualTo(reply);
        assertStatus(409, () -> portal.reply(client, request.id(), key, "Changed feedback"));
        assertStatus(404, () -> portal.reply(client, otherRequest.id(), java.util.UUID.randomUUID(), "Foreign reply"));
        assertThat(portal.conversation(client, request.id(), null).items()).hasSize(2);
    }

    @Test void clientRecoveryAndSuspensionRevokeAllLinkedRequestAccessAndOldInvitations() {
        var first = clientRequest("recover-client");
        var second = clientRequest("recover-client");
        var original = clientAccess.provision(root, first.id());
        var replacement = clientAccess.provision(root, first.id(),true,original.version());
        assertThat(replacement.version()).isGreaterThan(original.version());
        assertStatus(409, () -> clientAccess.provision(root, first.id(),true,original.version()));
        assertStatus(400, () -> clientAccess.activate(original.invitationToken(), PASSWORD));
        clientAccess.activate(replacement.invitationToken(), PASSWORD);
        assertStatus(400, () -> clientAccess.activate(replacement.invitationToken(), PASSWORD));
        var principal = clientAccess.login(first.clientEmail(), PASSWORD);
        Authentication client = token(principal, "CLIENT");
        assertThat(clientAccess.provision(root, second.id()).id()).isEqualTo(principal.id());
        assertThat(portal.list(client)).hasSize(2);
        var recovery = clientAccess.reset(root, first.id(), principal.credentialsVersion());
        assertThat(clientAccess.valid(principal)).isFalse();
        assertStatus(401, () -> portal.detail(client, second.id()));
        assertStatus(409, () -> clientAccess.reset(root, first.id(), principal.credentialsVersion()));
        clientAccess.activate(recovery.invitationToken(), PASSWORD);
        var recovered = clientAccess.login(first.clientEmail(), PASSWORD);
        clientAccess.suspend(root, second.id(), recovered.credentialsVersion());
        assertThat(clientAccess.valid(recovered)).isFalse();
        assertStatus(401, () -> portal.list(token(recovered, "CLIENT")));
        assertStatus(401, () -> clientAccess.login(first.clientEmail(), PASSWORD));
        var third = clientRequest("recover-client");
        assertStatus(409, () -> clientAccess.provision(root, third.id()));
        assertThat(clients.linked(identities.workspaceId(((OwnerPrincipal)root.getPrincipal()).id()),third.id())).isEmpty();
        var suspended=clientAccess.status(root,first.id());
        var restored=clientAccess.reset(root,first.id(),suspended.version());
        clientAccess.activate(restored.invitationToken(),PASSWORD);
        assertThat(clientAccess.provision(root,third.id()).id()).isEqualTo(restored.id());
    }

    @Test void channelFilesRequireOwnershipValidationScanningAndApprovalBeforeSharedDownload() throws Exception {
        Authentication author = member("file-author", TeamRole.MEMBER), reader = member("file-reader", TeamRole.MEMBER);
        var channel = channels.workspace(root).channels().stream().filter(item -> item.audience().equals("TEAM")).findFirst().orElseThrow();
        var message = channels.post(author, channel.id(), "A file for the team");
        var key = java.util.UUID.randomUUID();
        var png = png();
        var file = (com.crystalpower.website.repository.TeamAttachmentRepository.File) attachmentService.upload(author, channel.id(), message.id(), key, image("reference.png", png));
        assertThat(((com.crystalpower.website.repository.TeamAttachmentRepository.File) attachmentService.upload(author, channel.id(), message.id(), key, image("reference.png", png))).id()).isEqualTo(file.id());
        assertThat(attachments.list(reader, channel.id(), message.id()).files()).isEmpty();
        assertStatus(403, () -> attachments.download(author, channel.id(), message.id(), file.id()));
        assertStatus(409, () -> attachments.review(root, channel.id(), message.id(), file.id(), file.version(), "APPROVED", "Not scanned"));
        assertStatus(503, () -> attachments.begin(root, channel.id(), message.id(), file.id(), file.version()));
        assertStatus(403, () -> attachmentService.upload(reader, channel.id(), message.id(), java.util.UUID.randomUUID(), image("reference.png", png)));
        assertStatus(400, () -> attachmentService.upload(author, channel.id(), message.id(), java.util.UUID.randomUUID(), image("../reference.png", png)));
        assertStatus(400, () -> attachmentService.upload(author, channel.id(), message.id(), java.util.UUID.randomUUID(), image("forged.png", new byte[]{1,2,3})));
        for (int i=0;i<4;i++) attachmentService.upload(author, channel.id(), message.id(), java.util.UUID.randomUUID(), image("extra-"+i+".png", png));
        assertThat(attachments.list(author, channel.id(), message.id()).files()).hasSize(5);
        assertStatus(409, () -> attachmentService.upload(author, channel.id(), message.id(), java.util.UUID.randomUUID(), image("sixth.png", png)));
        assertThat(((com.crystalpower.website.repository.TeamAttachmentRepository.File) attachmentService.upload(author, channel.id(), message.id(), key, image("reference.png", png))).id()).isEqualTo(file.id());
        new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE team_message_attachment SET scan_state='CLEAN',scanned_at=CURRENT_TIMESTAMP,version=version+1 WHERE id=?", file.id());
        var clean = attachments.list(root, channel.id(), message.id()).files().stream().filter(item -> item.id().equals(file.id())).findFirst().orElseThrow();
        assertStatus(403, () -> attachments.download(reader, channel.id(), message.id(), file.id()));
        var approved = attachments.review(root, channel.id(), message.id(), file.id(), clean.version(), "APPROVED", "Synthetic completed scan fixture");
        assertThat(attachments.download(reader, channel.id(), message.id(), file.id()).content()).isEqualTo(png);
        mvc.perform(get("/api/team/channels/"+channel.id()+"/messages/"+message.id()+"/attachments/"+file.id()+"/download").with(authentication(reader)))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("X-Content-Type-Options","nosniff")).andExpect(header().string("Content-Security-Policy","sandbox"));
        assertStatus(400, () -> attachments.rename(root, channel.id(), message.id(), file.id(), approved.version(), "reference.html"));
        attachments.remove(author, channel.id(), message.id(), file.id(), approved.version());
        assertStatus(404, () -> attachments.download(reader, channel.id(), message.id(), file.id()));
    }

    @Test void uploadRechecksCredentialsAfterReadingFileBytes() throws Exception {
        Authentication author = member("revoked-uploader", TeamRole.MEMBER);
        var principal = (TeamPrincipal) author.getPrincipal();
        var channel = channels.workspace(root).channels().stream().filter(item -> item.audience().equals("TEAM")).findFirst().orElseThrow();
        var message = channels.post(author, channel.id(), "Revoked before persistence");
        var file = new org.springframework.mock.web.MockMultipartFile("file", "reference.png", "image/png", png()) {
            @Override public java.io.InputStream getInputStream() throws java.io.IOException {
                members.change(root, principal.id(), principal.credentialsVersion(), TeamRole.MEMBER, "SUSPENDED");
                return super.getInputStream();
            }
        };
        assertStatus(401, () -> attachmentService.upload(author, channel.id(), message.id(), java.util.UUID.randomUUID(), file));
        assertThat(attachments.list(root, channel.id(), message.id()).files()).isEmpty();
    }

    @Test void clientFileReleaseRequiresCleanScanAndHumanApprovalAndRemovalRevokesIt() throws Exception {
        var request = clientRequest("file-client");
        var invite = clientAccess.provision(root, request.id()); clientAccess.activate(invite.invitationToken(), PASSWORD);
        Authentication client = token(clientAccess.login(request.clientEmail(), PASSWORD), "CLIENT");
        var png = png(); supportRepository.attach(request.id(), "reference.png", "image/png", png);
        var file = supportRepository.attachments(request.id()).get(0);
        assertStatus(404, () -> portal.file(client, file.id()));
        assertStatus(409, () -> moderation.review(root, file.id(), file.version(), "APPROVED", "No scan"));
        var lease = supportScans.begin(root, file.id(), file.version());
        var clean = supportScans.finish(root, lease, "CLEAN"); // Deliberate store-state fixture, not a real scanner pass.
        assertThat(portal.detail(client, request.id()).files()).isEmpty();
        assertStatus(404, () -> portal.file(client, file.id()));
        var approved = moderation.review(root, file.id(), clean.attachment().version(), "APPROVED", "Private moderation note");
        assertThat(portal.detail(client, request.id()).files()).singleElement().satisfies(item -> assertThat(item.reviewNote()).isEmpty());
        assertThat(portal.file(client, file.id()).content()).isEqualTo(png);
        moderation.remove(root, file.id(), approved.attachment().version(), "Synthetic removal");
        assertThat(portal.detail(client, request.id()).files()).isEmpty();
        assertStatus(404, () -> portal.file(client, file.id()));
        assertStatus(409, () -> supportScans.finish(root, lease, "CLEAN"));
    }

    @Test void supportReviewCannotInvalidateAnActiveScannerLease() throws Exception {
        var request = clientRequest("scanning-client"); supportRepository.attach(request.id(), "reference.png", "image/png", png());
        var file = supportRepository.attachments(request.id()).get(0);
        var lease = supportScans.begin(root, file.id(), file.version());
        assertStatus(409, () -> moderation.review(root, file.id(), lease.version(), "REJECTED", "Running scan"));
        moderation.remove(root, file.id(), lease.version(), "Withdraw content during scan");
        assertStatus(409, () -> supportScans.finish(root, lease, "CLEAN"));
    }

    @Test void expiredSupportScanLeaseCannotReleaseAFile() throws Exception {
        var request = clientRequest("expired-scan"); supportRepository.attach(request.id(), "reference.png", "image/png", png());
        var file = supportRepository.attachments(request.id()).get(0);
        var lease = supportScans.begin(root, file.id(), file.version());
        new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_attachment SET scan_started_at=? WHERE id=?", java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(6), file.id());
        assertStatus(409, () -> supportScans.finish(root, lease, "CLEAN"));
        var replacement = supportScans.begin(root, file.id(), lease.version());
        assertStatus(409, () -> supportScans.finish(root, lease, "CLEAN"));
        var infected = supportScans.finish(root, replacement, "INFECTED");
        assertThat(infected.attachment().scanState()).isEqualTo("INFECTED");
        assertThat(infected.attachment().reviewState()).isEqualTo("REJECTED");
        assertStatus(403, () -> supportRequests.download(root, file.id()));
    }

    @Test void revokedModeratorCannotCompleteAnOutstandingScan() throws Exception {
        Authentication moderator = member("revoked-scanner", TeamRole.MODERATOR);
        var principal = (TeamPrincipal) moderator.getPrincipal();
        var request = clientRequest("revoked-scan"); supportRepository.attach(request.id(), "reference.png", "image/png", png());
        var file = supportRepository.attachments(request.id()).get(0);
        var lease = supportScans.begin(moderator, file.id(), file.version());
        members.change(root, principal.id(), principal.credentialsVersion(), TeamRole.MODERATOR, "SUSPENDED");
        assertStatus(401, () -> supportScans.finish(moderator, lease, "CLEAN"));
        assertThat(supportRepository.attachments(request.id()).get(0).scanState()).isEqualTo("SCANNING");
    }

    @Test void customRoleAssignmentAndChangesRevokeExistingSessionsAndResolveCurrentGrants() throws Exception {
        Authentication admin = member("profile-admin", TeamRole.ADMIN);
        var id = ((TeamPrincipal) admin.getPrincipal()).id();
        var readOnly = profile("Read-only administrator", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS));
        roleProfiles.assign(root, id, ((TeamPrincipal) admin.getPrincipal()).credentialsVersion(), readOnly.id());
        mvc.perform(get("/api/team/workspace").with(authentication(admin))).andExpect(status().isUnauthorized());
        var limited = currentRevisionToken(admin);
        assertThat(channels.workspace(limited).permissions()).containsExactly(TeamPermission.READ_CHANNELS);
        mvc.perform(get("/api/team/members").with(authentication(limited))).andExpect(status().isForbidden());
        mvc.perform(get("/api/team/support/requests").with(authentication(limited))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/projects").with(authentication(limited))).andExpect(status().isForbidden());
        roleProfiles.update(root, readOnly.id(), readOnly.version(), readOnly.name(), java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES), false);
        mvc.perform(get("/api/team/workspace").with(authentication(limited))).andExpect(status().isUnauthorized());
        var updated = currentRevisionToken(admin);
        assertThat(channels.workspace(updated).permissions()).containsExactly(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES);
        assertStatus(409, () -> roleProfiles.update(root, readOnly.id(), readOnly.version(), "Stale edit", java.util.Set.of(TeamPermission.READ_CHANNELS), false));
        roleProfiles.assign(root, id, ((TeamPrincipal) updated.getPrincipal()).credentialsVersion(), null);
        mvc.perform(get("/api/team/workspace").with(authentication(updated))).andExpect(status().isUnauthorized());
        assertThat(channels.workspace(currentRevisionToken(admin)).permissions()).containsAll(TeamRole.ADMIN.permissions());
    }

    @Test void customProfilesRejectOutOfBaseAndMissingDependentGrantsWithoutSaving() {
        assertStatus(400, () -> profile("No reading", TeamRole.ADMIN, java.util.Set.of(TeamPermission.MANAGE_MEMBERS)));
        assertStatus(400, () -> profile("Member escalation", TeamRole.MEMBER, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.MANAGE_ROLES, TeamPermission.MANAGE_MEMBERS)));
        assertStatus(400, () -> profile("Reply without reading", TeamRole.SUPPORT, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.REPLY_SUPPORT)));
        assertStatus(400, () -> profile("Edit without review", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.EDIT_UPLOADS)));
        assertStatus(400, () -> profile("Billing without support", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.MANAGE_BILLING)));
        assertStatus(400, () -> profile("Roles without members", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.MANAGE_ROLES)));
        assertStatus(400, () -> profile("Publish without editing", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.PUBLISH_PROJECTS)));
        assertThat(roleProfiles.overview(root).profiles()).isEmpty();
    }

    @Test void boundedManagersCannotEditTheirOwnProfileOrResetOthersToBroaderBaseRoles() throws Exception {
        Authentication manager = member("bounded-manager", TeamRole.ADMIN), peer = member("bounded-peer", TeamRole.ADMIN);
        var grants = java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES, TeamPermission.UPLOAD_FILES, TeamPermission.MANAGE_MEMBERS, TeamPermission.MANAGE_ROLES);
        var bounded = profile("Bounded managers", TeamRole.ADMIN, grants);
        roleProfiles.assign(root, ((TeamPrincipal) manager.getPrincipal()).id(), ((TeamPrincipal) manager.getPrincipal()).credentialsVersion(), bounded.id());
        roleProfiles.assign(root, ((TeamPrincipal) peer.getPrincipal()).id(), ((TeamPrincipal) peer.getPrincipal()).credentialsVersion(), bounded.id());
        var actor = currentRevisionToken(manager); var currentPeer = currentRevisionToken(peer);
        var overview = roleProfiles.overview(actor);
        assertThat(overview.manageableMembers()).contains(((TeamPrincipal) peer.getPrincipal()).id()).doesNotContain(((TeamPrincipal) manager.getPrincipal()).id());
        assertThat(overview.editableProfiles()).doesNotContain(bounded.id());
        assertStatus(400, () -> roleProfiles.update(actor, bounded.id(), bounded.version(), bounded.name(), grants, false));
        assertStatus(403, () -> roleProfiles.assign(actor, ((TeamPrincipal) peer.getPrincipal()).id(), ((TeamPrincipal) currentPeer.getPrincipal()).credentialsVersion(), null));
        assertStatus(403, () -> roleProfiles.create(actor, "Escalated billing", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.READ_SUPPORT, TeamPermission.MANAGE_BILLING)));
        var created = members.create(actor, "bounded-invite@example.invalid", "Bounded invitation", TeamRole.MEMBER);
        assertThat(created.member().role()).isEqualTo(TeamRole.MEMBER);
        mvc.perform(post("/api/team/roles").with(authentication(actor)).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("name","No CSRF","baseRole","MEMBER","permissions",List.of("READ_CHANNELS")))))
                .andExpect(status().isForbidden());
    }

    @Test void archivedHigherProfilesDenySignInWithoutBecomingManageableByLowerAccounts() throws Exception {
        Authentication manager = member("archive-manager", TeamRole.ADMIN), higher = member("archive-higher", TeamRole.ADMIN);
        var limited = profile("Limited role manager", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.MANAGE_MEMBERS, TeamPermission.MANAGE_ROLES));
        var retained = profile("Retained full administrator", TeamRole.ADMIN, TeamRole.ADMIN.permissions());
        roleProfiles.assign(root, ((TeamPrincipal) manager.getPrincipal()).id(), ((TeamPrincipal) manager.getPrincipal()).credentialsVersion(), limited.id());
        roleProfiles.assign(root, ((TeamPrincipal) higher.getPrincipal()).id(), ((TeamPrincipal) higher.getPrincipal()).credentialsVersion(), retained.id());
        roleProfiles.update(root, retained.id(), retained.version(), retained.name(), retained.permissions(), true);
        var actor = currentRevisionToken(manager); var target = repository.credentials(((TeamPrincipal) higher.getPrincipal()).id(), false).orElseThrow().member();
        assertStatus(401, () -> authentication.password(target.email(), PASSWORD));
        mvc.perform(get("/api/team/workspace").with(authentication(currentRevisionToken(higher)))).andExpect(status().isUnauthorized());
        assertStatus(403, () -> members.reset(actor, target.id(), target.credentialsVersion()));
        assertStatus(403, () -> members.change(actor, target.id(), target.credentialsVersion(), TeamRole.MEMBER, "SUSPENDED"));
        assertStatus(403, () -> roleProfiles.assign(actor, target.id(), target.credentialsVersion(), limited.id()));
        assertStatus(403, () -> roleProfiles.update(actor, retained.id(), retained.version()+1, retained.name(), java.util.Set.of(TeamPermission.READ_CHANNELS), false));
        assertThat(roleProfiles.overview(actor).manageableMembers()).doesNotContain(target.id());
    }

    @Test void uploadPermissionRequiresMessageSending() {
        assertStatus(400, () -> profile("Upload without sending", TeamRole.MEMBER, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.UPLOAD_FILES)));
        var usable = profile("Message uploader", TeamRole.MEMBER, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES, TeamPermission.UPLOAD_FILES));
        assertThat(usable.permissions()).contains(TeamPermission.SEND_MESSAGES, TeamPermission.UPLOAD_FILES);
    }

    @Test void existingUploadOnlyProfilesCanBeArchivedButMustBeCorrectedBeforeRestore() {
        // Representation accepted before the new upload/message dependency rule.
        var legacy = new com.crystalpower.website.repository.TeamRoleProfileRepository(new org.springframework.jdbc.core.JdbcTemplate(dataSource))
                .create(identities.workspaceId(((OwnerPrincipal) root.getPrincipal()).id()), "Older upload profile", TeamRole.MEMBER,
                        java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.UPLOAD_FILES));
        var archived = (com.crystalpower.website.repository.TeamRoleProfileRepository.Profile) roleProfiles.update(root, legacy.id(), legacy.version(), legacy.name(), legacy.permissions(), true);
        assertThat(archived.archived()).isTrue();
        assertStatus(400, () -> roleProfiles.update(root, archived.id(), archived.version(), archived.name(), archived.permissions(), false));
        var restored = (com.crystalpower.website.repository.TeamRoleProfileRepository.Profile) roleProfiles.update(root, archived.id(), archived.version(), archived.name(),
                java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES, TeamPermission.UPLOAD_FILES), false);
        assertThat(restored.archived()).isFalse();
    }

    @Test void delegatedChannelManagerCanEditAnExistingGroupChannelWithoutChangingItsRestriction() throws Exception {
        Authentication manager = member("group-channel-manager", TeamRole.ADMIN);
        var principal = (TeamPrincipal) manager.getPrincipal();
        var limited = profile("Channel management only", TeamRole.ADMIN, java.util.Set.of(TeamPermission.READ_CHANNELS, TeamPermission.MANAGE_CHANNELS));
        roleProfiles.assign(root, principal.id(), principal.credentialsVersion(), limited.id());
        var actor = currentRevisionToken(manager);
        var group = groups.save(root, null, 0, "Private design", "", false, List.of(principal.id()));
        var channel = channels.create(root, "design", "Original", "Team", "TEAM", group.id());
        var changed = channels.change(actor, channel.id(), channel.version(), "design", "Updated", "Team", "TEAM", false, null, false);
        assertThat(changed.groupId()).isEqualTo(group.id());
        assertThat(changed.description()).isEqualTo("Updated");
        assertStatus(409, () -> channels.change(actor, channel.id(), channel.version(), "design", "Stale", "Team", "TEAM", false, null, false));
        assertStatus(403, () -> channels.change(actor, channel.id(), changed.version(), "design", "", "Team", "TEAM", false, null, true));
        var foreign = groups.save(root, null, 0, "Other private group", "", false, List.of());
        var hidden = channels.create(root, "hidden", "", "Team", "TEAM", foreign.id());
        assertStatus(404, () -> channels.change(actor, hidden.id(), hidden.version(), "hidden", "Unexpected", "Team", "TEAM", false, null, false));
    }

    @Test void conversationFloorMustBelongToItsChannelEvenWhenTheVersionIsUnchanged() {
        var first = channels.create(root, "first-history", "", "Team", "TEAM", null);
        var second = channels.create(root, "second-history", "", "Team", "TEAM", null);
        var own = channels.post(root, first.id(), "First channel message");
        var foreign = channels.post(root, second.id(), "Other channel message");
        long version = channels.conversation(root, first.id(), null, null, null).version();
        assertStatus(400, () -> channels.conversation(root, first.id(), null, foreign.id(), null));
        assertStatus(400, () -> channels.conversation(root, first.id(), version, foreign.id(), null));
        assertThat(channels.conversation(root, first.id(), version, own.id(), null).unchanged()).isTrue();
        channels.edit(root, first.id(), own.id(), own.version(), own.body(), true);
        assertThat(channels.conversation(root, first.id(), null, own.id(), null).messages()).isEmpty();
    }

    @Test void archivedGroupAllowsAuthorisedByteCleanupWithoutRestoringConversationAccess() throws Exception {
        Authentication moderator = member("archived-group-moderator", TeamRole.MODERATOR);
        var memberId = ((TeamPrincipal) moderator.getPrincipal()).id();
        var group = groups.save(root, null, 0, "Retained private group", "", false, List.of(memberId));
        var channel = channels.create(root, "retained-files", "", "Team", "TEAM", group.id());
        var message = channels.post(root, channel.id(), "Retained reference");
        var file = (com.crystalpower.website.repository.TeamAttachmentRepository.File) attachmentService.upload(root, channel.id(), message.id(), java.util.UUID.randomUUID(), image("reference.png", png()));
        groups.save(root, group.id(), group.version(), group.name(), "", true, List.of(memberId));
        assertStatus(404, () -> channels.messages(root, channel.id(), null));
        assertStatus(404, () -> attachments.download(root, channel.id(), message.id(), file.id()));
        assertStatus(404, () -> attachments.cleanupList(moderator, channel.id(), message.id()));
        assertThat(attachments.queue(moderator, "PENDING", true, null).files()).isEmpty();
        assertThat(attachments.queue(root, "PENDING", false, null).files()).isEmpty();
        assertThat(attachments.cleanupList(root, channel.id(), message.id()).files()).extracting(com.crystalpower.website.repository.TeamAttachmentRepository.File::id).containsExactly(file.id());
        var queue = attachments.queue(root, "PENDING", true, null);
        assertThat(queue.files()).hasSize(1);
        mvc.perform(get("/api/team/channel-uploads?inactive=true").with(authentication(root)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.files[0].groupArchived").value(true));
        var removed = attachments.cleanupRemove(root, channel.id(), message.id(), file.id(), file.version());
        assertThat(removed.removedAt()).isNotNull();
        assertThat(new org.springframework.jdbc.core.JdbcTemplate(dataSource).queryForObject("SELECT content FROM team_message_attachment WHERE id=?", byte[].class, file.id())).isNull();
        assertStatus(404, () -> channels.messages(root, channel.id(), null));
        assertThat(groups.detail(root, group.id()).archived()).isTrue();
    }

    @Test void legacyHistoryAlsoRejectsForeignAndInvalidAnchors() throws Exception {
        var channel = channels.create(root, "legacy-history", "", "Team", "TEAM", null);
        var other = channels.create(root, "foreign-history", "", "Team", "TEAM", null);
        var first = channels.post(root, channel.id(), "Earlier history");
        var last = channels.post(root, channel.id(), "Latest history");
        var foreign = channels.post(root, other.id(), "Foreign history");
        mvc.perform(get("/api/team/channels/" + channel.id() + "/messages?before=" + foreign.id()).with(authentication(root))).andExpect(status().isBadRequest());
        for (long invalid : List.of(-1L, 0L, Long.MAX_VALUE)) {
            mvc.perform(get("/api/team/channels/" + channel.id() + "/messages?before=" + invalid).with(authentication(root))).andExpect(status().isBadRequest());
        }
        assertThat(channels.messages(root, channel.id(), last.id())).extracting(item -> item.id()).containsExactly(first.id());
        channels.edit(root, channel.id(), last.id(), last.version(), last.body(), true);
        assertThat(channels.messages(root, channel.id(), last.id())).extracting(item -> item.id()).containsExactly(first.id());
    }

    @Test void archiveRestoreAndStaleGroupWritesPreserveMembershipAndChannelState() throws Exception {
        Authentication reader = member("lifecycle-reader", TeamRole.MEMBER);
        var readerId = ((TeamPrincipal) reader.getPrincipal()).id();
        var group = groups.save(root, null, 0, "Lifecycle group", "Original", false, List.of(readerId));
        var active = channels.create(root, "lifecycle-active", "", "Team", "TEAM", group.id());
        var archived = channels.create(root, "lifecycle-archived", "", "Team", "TEAM", group.id());
        channels.change(root, archived.id(), archived.version(), archived.name(), "", "Team", "TEAM", true, null, false);
        var message = channels.post(root, active.id(), "Private lifecycle message");
        var version = channels.conversation(reader, active.id(), null, null, null).version();
        var hidden = groups.save(root, group.id(), group.version(), group.name(), "Archived", true, List.of(readerId));
        assertThat(channels.workspace(reader).channels()).extracting(item -> item.id()).doesNotContain(active.id(), archived.id());
        assertStatus(404, () -> channels.conversation(reader, active.id(), version, message.id(), null));
        assertStatus(404, () -> channels.create(root, "cannot-assign-archived", "", "Team", "TEAM", group.id()));
        assertStatus(409, () -> groups.save(root, group.id(), group.version(), "Stale group", "", false, List.of()));
        assertThat(groups.detail(root, group.id()).members()).containsExactly(readerId);
        assertThat(groups.detail(root, group.id()).archived()).isTrue();
        groups.save(root, group.id(), hidden.version(), group.name(), "Restored", false, List.of(readerId));
        assertThat(channels.workspace(reader).channels()).extracting(item -> item.id()).contains(active.id()).doesNotContain(archived.id());
        assertThat(channels.conversation(reader, active.id(), null, null, null).messages()).extracting(item -> item.id()).containsExactly(message.id());
        assertStatus(404, () -> channels.messages(reader, archived.id(), null));
    }

    @Test void suspendedMembershipCanBeRetainedButCannotBeNewlyAddedOrUseOldCredentials() throws Exception {
        Authentication retained = member("retained-suspended", TeamRole.MEMBER), newcomer = member("new-suspended", TeamRole.MEMBER);
        var first = (TeamPrincipal) retained.getPrincipal(); var second = (TeamPrincipal) newcomer.getPrincipal();
        var group = groups.save(root, null, 0, "Suspended membership", "", false, List.of(first.id()));
        var channel = channels.create(root, "suspended-group", "", "Team", "TEAM", group.id());
        var suspended = members.change(root, first.id(), first.credentialsVersion(), TeamRole.MEMBER, "SUSPENDED");
        members.change(root, second.id(), second.credentialsVersion(), TeamRole.MEMBER, "SUSPENDED");
        var unchanged = groups.save(root, group.id(), group.version(), group.name(), "Retain membership", false, List.of(first.id()));
        assertStatus(409, () -> groups.save(root, group.id(), unchanged.version(), group.name(), "Invalid addition", false, List.of(first.id(), second.id())));
        assertThat(groups.detail(root, group.id()).members()).containsExactly(first.id());
        assertThat(groups.detail(root, group.id()).version()).isEqualTo(unchanged.version());
        assertStatus(401, () -> channels.messages(retained, channel.id(), null));
        members.change(root, first.id(), suspended.credentialsVersion(), TeamRole.MEMBER, "ACTIVE");
        assertStatus(401, () -> channels.messages(retained, channel.id(), null));
        assertThat(channels.workspace(currentRevisionToken(retained)).channels()).extracting(item -> item.id()).contains(channel.id());
    }

    @Test void revokedPrivateGroupModeratorLosesFileMetadataAndQueueAnchorsImmediately() throws Exception {
        Authentication moderator = member("group-file-reviewer", TeamRole.MODERATOR);
        var id = ((TeamPrincipal) moderator.getPrincipal()).id();
        var group = groups.save(root, null, 0, "Private upload membership", "", false, List.of(id));
        var channel = channels.create(root, "private-upload-membership", "", "Team", "TEAM", group.id());
        var message = channels.post(root, channel.id(), "Private upload");
        var file = (com.crystalpower.website.repository.TeamAttachmentRepository.File) attachmentService.upload(root, channel.id(), message.id(), java.util.UUID.randomUUID(), image("private.png", png()));
        assertThat(attachments.queue(moderator, "PENDING", false, null).files()).hasSize(1);
        groups.save(root, group.id(), group.version(), group.name(), "", false, List.of());
        assertThat(attachments.queue(moderator, "PENDING", false, null).files()).isEmpty();
        assertStatus(409, () -> attachments.queue(moderator, "PENDING", false, file.id()));
        assertStatus(404, () -> attachments.list(moderator, channel.id(), message.id()));
        assertStatus(404, () -> attachments.cleanupList(moderator, channel.id(), message.id()));
        assertStatus(404, () -> attachments.cleanupRemove(moderator, channel.id(), message.id(), file.id(), file.version()));
        assertThat(attachments.list(root, channel.id(), message.id()).files()).hasSize(1);
        assertThat(new org.springframework.jdbc.core.JdbcTemplate(dataSource).queryForObject("SELECT content FROM team_message_attachment WHERE id=?", byte[].class, file.id())).isNotEmpty();
    }

    @Test void forgedWorkspaceSessionsAndUnknownGroupIdsCannotChangeMembership() throws Exception {
        Authentication manager = member("workspace-bound-manager", TeamRole.ADMIN);
        var principal = (TeamPrincipal) manager.getPrincipal();
        var group = groups.save(root, null, 0, "Workspace-bound group", "", false, List.of(principal.id()));
        // The product has one protected owner/workspace. Exercise a mismatched
        // authenticated-principal fixture rather than bypassing that schema rule.
        var forged = token(new TeamPrincipal(principal.id(), java.util.UUID.randomUUID(), principal.email(), principal.displayName(), principal.role(), principal.credentialsVersion()), "TEAM");
        assertStatus(401, () -> groups.detail(forged, group.id()));
        assertStatus(401, () -> groups.save(forged, group.id(), group.version(), "Forbidden change", "", false, List.of()));
        assertStatus(401, () -> attachments.queue(forged, "PENDING", false, null));
        var unknown = java.util.UUID.randomUUID();
        assertStatus(404, () -> groups.detail(manager, unknown));
        assertStatus(404, () -> groups.save(manager, unknown, 0, "Unknown group", "", false, List.of()));
        assertStatus(404, () -> groups.save(manager, group.id(), group.version(), group.name(), "", false, List.of(unknown)));
        assertStatus(404, () -> channels.create(manager, "unknown-group-binding", "", "Team", "TEAM", unknown));
        assertThat(groups.detail(manager, group.id()).members()).containsExactly(principal.id());
        assertThat(groups.detail(manager, group.id()).version()).isEqualTo(group.version());
    }

    @Test void staleSuccessfulReplyEmailCannotCompleteANewerAttempt() {
        var request = clientRequest("stale-reply-success");
        var transport = org.mockito.Mockito.mock(EmailTransport.class);
        org.mockito.Mockito.when(transport.configured()).thenReturn(true);
        var service = new SupportRequestService(teamAccess, supportRepository, repository, json, transport, clients, roleResolver);
        var message = service.addMessage(root, request.id(), java.util.UUID.randomUUID(), "CLIENT", "Reviewed client update");
        org.mockito.Mockito.doAnswer(call -> {
            new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_message SET delivery_started_at=? WHERE id=?", java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20), message.id());
            assertThat(service.claimDelivery(root, request.id(), message.id()).claimed()).isTrue();
            return null;
        }).when(transport).send(org.mockito.ArgumentMatchers.any(EmailTransport.Message.class), org.mockito.ArgumentMatchers.anyString());
        var sender = new SupportReplyEmailService(service, transport, "support@example.invalid");
        assertStatus(409, () -> sender.send(root, request.id(), message.id()));
        assertThat(supportRepository.message(request.id(), message.id()).orElseThrow().deliveryState()).isEqualTo("SENDING");
    }

    @Test void staleFailedReplyEmailCannotFailANewerAttempt() {
        var request = clientRequest("stale-reply-failure");
        var transport = org.mockito.Mockito.mock(EmailTransport.class);
        org.mockito.Mockito.when(transport.configured()).thenReturn(true);
        var service = new SupportRequestService(teamAccess, supportRepository, repository, json, transport, clients, roleResolver);
        var message = service.addMessage(root, request.id(), java.util.UUID.randomUUID(), "CLIENT", "Client update retained");
        org.mockito.Mockito.doAnswer(call -> {
            new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_message SET delivery_started_at=? WHERE id=?", java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20), message.id());
            assertThat(service.claimDelivery(root, request.id(), message.id()).claimed()).isTrue();
            throw new EmailTransport.DeliveryException();
        }).when(transport).send(org.mockito.ArgumentMatchers.any(EmailTransport.Message.class), org.mockito.ArgumentMatchers.anyString());
        var sender = new SupportReplyEmailService(service, transport, "support@example.invalid");
        assertStatus(409, () -> sender.send(root, request.id(), message.id()));
        assertThat(supportRepository.message(request.id(), message.id()).orElseThrow().deliveryState()).isEqualTo("SENDING");
    }

    @Test void supportTrackingNormalisesCompletionAndRejectsStaleOrIneligibleAssignments() throws Exception {
        Authentication supporter = member("tracking-supporter", TeamRole.SUPPORT), ordinary = member("tracking-member", TeamRole.MEMBER);
        var request = clientRequest("tracking-client");
        var assigned = ((TeamPrincipal) supporter.getPrincipal()).id();
        var updated = supportRequests.update(supporter, request.id(), request.version(), "COMPLETED", 17, "  Final review complete  ", assigned);
        assertThat(updated.progress()).isEqualTo(100);
        assertThat(updated.nextStep()).isEqualTo("Final review complete");
        assertThat(updated.assignedMemberId()).isEqualTo(assigned);
        assertThat(supportRepository.events(request.id())).filteredOn(item -> item.customerVisible()).extracting(item -> item.event()).containsExactly("PROGRESS_UPDATED");
        assertStatus(409, () -> supportRequests.update(supporter, request.id(), request.version(), "NEW", 0, "Stale overwrite", null));
        assertStatus(400, () -> supportRequests.update(supporter, request.id(), updated.version(), "IN_PROGRESS", 70, "Wrong assignee", ((TeamPrincipal) ordinary.getPrincipal()).id()));
        assertThat(supportRequests.detail(root, request.id()).request().version()).isEqualTo(updated.version());
        assertThat(supportRepository.events(request.id())).hasSize(2);
        mvc.perform(patch("/api/team/support/requests/" + request.id()).with(authentication(supporter)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("expectedVersion",updated.version(),"state","IN_PROGRESS","progress",101,"nextStep","Invalid progress"))))
                .andExpect(status().isBadRequest());
        assertStatus(403, () -> supportRequests.update(ordinary, request.id(), updated.version(), "NEW", 0, "Forbidden", null));
    }

    @Test void confirmedProjectScopeIsVersionedClientScopedAndPreservedByLegacyTracking() throws Exception {
        var request = clientRequest("confirmed-scope");
        var other = clientRequest("unrelated-scope");
        var invitation = clientAccess.provision(root,request.id());
        clientAccess.activate(invitation.invitationToken(),PASSWORD);
        Authentication client = token(clientAccess.login(request.clientEmail(),PASSWORD),"CLIENT");
        Authentication supporter = member("scope-support",TeamRole.SUPPORT);
        var saved = supportRequests.update(supporter,request.id(),request.version(),"IN_PROGRESS",40,"Review the draft",null,"  Five agreed pages\nOne review round  ");
        assertThat(saved.projectScope()).isEqualTo("Five agreed pages\nOne review round");
        assertThat(portal.overview(client,request.id()).project().projectScope()).isEqualTo(saved.projectScope());
        assertStatus(404,()->portal.overview(client,other.id()));
        mvc.perform(patch("/api/team/support/requests/"+request.id()).with(authentication(client)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("expectedVersion",saved.version(),"state","NEW","progress",0,"nextStep","Client cannot rewrite scope","projectScope","Unauthorised"))))
                .andExpect(status().isForbidden());
        assertStatus(409,()->supportRequests.update(supporter,request.id(),request.version(),"NEW",0,"Stale",null,"Stale scope"));
        var legacy = supportRequests.update(supporter,request.id(),saved.version(),"WAITING_CLIENT",50,"Reply when ready",null);
        assertThat(legacy.projectScope()).isEqualTo(saved.projectScope());
        assertThat(supportRepository.events(request.id())).filteredOn(event->event.event().equals("PROJECT_SCOPE_UPDATED")).hasSize(1);
        var cleared = supportRequests.update(supporter,request.id(),legacy.version(),"WAITING_CLIENT",50,"Reply when ready",null,"");
        assertThat(cleared.projectScope()).isEmpty();
        assertThat(portal.overview(client,request.id()).project().projectScope()).isEmpty();
    }

    @Test void scopeEndpointRejectsOversizedUnauthorisedAndCsrfFreeWritesWithoutChangingTheRequest() throws Exception {
        var request = clientRequest("scope-validation");
        var body = Map.of("expectedVersion",request.version(),"state","NEW","progress",0,"nextStep","Review","projectScope","x".repeat(6001));
        mvc.perform(patch("/api/team/support/requests/"+request.id()).with(authentication(root)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/team/support/requests/"+request.id()).with(authentication(root)).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body)))
                .andExpect(status().isForbidden());
        Authentication ordinary = member("scope-member",TeamRole.MEMBER);
        assertStatus(403,()->supportRequests.update(ordinary,request.id(),request.version(),"NEW",0,"Review",null,"Unauthorised scope"));
        assertStatus(400,()->supportRequests.update(root,request.id(),request.version(),"NEW",0,"Review",null,"x".repeat(6001)));
        assertThat(supportRequests.detail(root,request.id()).request().version()).isEqualTo(request.version());
        assertThat(supportRequests.detail(root,request.id()).request().projectScope()).isEmpty();
    }

    @Test void staffMessageRetryKeysBindActorRequestKindAndContent() throws Exception {
        Authentication supporter = member("reply-supporter", TeamRole.SUPPORT);
        var request = clientRequest("staff-reply-client"); var other = clientRequest("staff-reply-other");
        var key = java.util.UUID.randomUUID();
        var message = supportRequests.addMessage(root, request.id(), key, "CLIENT", "  Reviewed update  ");
        assertThat(supportRequests.addMessage(root, request.id(), key, "CLIENT", "Reviewed update").id()).isEqualTo(message.id());
        assertStatus(409, () -> supportRequests.addMessage(root, request.id(), key, "CLIENT", "Changed update"));
        assertStatus(409, () -> supportRequests.addMessage(root, request.id(), key, "INTERNAL", "Reviewed update"));
        assertStatus(409, () -> supportRequests.addMessage(supporter, request.id(), key, "CLIENT", "Reviewed update"));
        assertStatus(409, () -> supportRequests.addMessage(root, other.id(), key, "CLIENT", "Reviewed update"));
        assertThat(supportRepository.messages(request.id())).hasSize(1);
        assertThat(supportRepository.events(request.id())).hasSize(1);
        assertThat(message.deliveryState()).isEqualTo("SAVED");
        assertThat(message.portalVisible()).isFalse();
    }

    @Test void supportEmailSeparatesSavedSharedAndAcceptedWithBoundRecipientAndRetryIdentity() {
        var request = clientRequest("email-contract");
        var transport = org.mockito.Mockito.mock(EmailTransport.class);
        org.mockito.Mockito.when(transport.configured()).thenReturn(true);
        var service = new SupportRequestService(teamAccess, supportRepository, repository, json, transport, clients, roleResolver);
        var sender = new SupportReplyEmailService(service, transport, "support@example.invalid");
        var note = service.addMessage(root, request.id(), java.util.UUID.randomUUID(), "INTERNAL", "Private note");
        var message = service.addMessage(root, request.id(), java.util.UUID.randomUUID(), "CLIENT", "<script>Untrusted text</script>");
        assertStatus(400, () -> sender.send(root, request.id(), note.id()));
        var linked = clientAccess.provision(root, request.id());
        assertThat(clients.preferences(linked.id(), clients.preferences(linked.id()).version(), "PORTAL_ONLY")).isTrue();
        assertStatus(409, () -> sender.send(root, request.id(), message.id()));
        org.mockito.Mockito.verify(transport, org.mockito.Mockito.never()).send(org.mockito.ArgumentMatchers.any(EmailTransport.Message.class), org.mockito.ArgumentMatchers.anyString());
        service.shareToPortal(root, request.id(), message.id());
        assertThat(supportRepository.message(request.id(), message.id()).orElseThrow().deliveryState()).isEqualTo("SAVED");
        assertThat(clients.preferences(linked.id(), clients.preferences(linked.id()).version(), "PORTAL_AND_EMAIL")).isTrue();
        var sent = sender.send(root, request.id(), message.id());
        assertThat(sent.deliveryState()).isEqualTo("SENT");
        assertThat(sent.portalVisible()).isTrue();
        assertThat(sent.deliveryStartedAt()).isNotNull();
        assertThat(sender.send(root, request.id(), message.id()).deliveryState()).isEqualTo("SENT");
        var mail = org.mockito.ArgumentCaptor.forClass(EmailTransport.Message.class);
        org.mockito.Mockito.verify(transport, org.mockito.Mockito.times(1)).send(mail.capture(), org.mockito.ArgumentMatchers.eq("support-reply-" + message.id()));
        assertThat(mail.getValue().to()).isEqualTo(request.clientEmail());
        assertThat(mail.getValue().html()).contains("&lt;script&gt;").doesNotContain("<script>");
        assertThat(supportRepository.events(request.id())).filteredOn(item -> item.event().equals("CLIENT_EMAIL_ACCEPTED")).hasSize(1);
    }

    @Test void expiredReplyAttemptCannotFinishWithoutReclaimAndOnlyItsReplacementCanComplete() {
        var request = clientRequest("expired-reply");
        var transport = org.mockito.Mockito.mock(EmailTransport.class);
        org.mockito.Mockito.when(transport.configured()).thenReturn(true);
        var service = new SupportRequestService(teamAccess, supportRepository, repository, json, transport, clients, roleResolver);
        var message = service.addMessage(root, request.id(), java.util.UUID.randomUUID(), "CLIENT", "Expired attempt");
        var first = service.claimDelivery(root, request.id(), message.id());
        assertStatus(409, () -> service.claimDelivery(root, request.id(), message.id()));
        new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_message SET delivery_started_at=? WHERE id=?", java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20), message.id());
        assertStatus(409, () -> service.finishDelivery(first, true));
        var replacement = service.claimDelivery(root, request.id(), message.id());
        assertThat(replacement.token()).isNotEqualTo(first.token());
        assertStatus(409, () -> service.finishDelivery(first, false));
        service.finishDelivery(replacement, true);
        assertStatus(409, () -> service.finishDelivery(replacement, false));
        assertThat(supportRepository.message(request.id(), message.id()).orElseThrow().deliveryState()).isEqualTo("SENT");
    }

    @Test void providerReceiptIsRecordedAfterRevocationButItsResponseRequiresCurrentAccess() throws Exception {
        Authentication supporter = member("inflight-email-support", TeamRole.SUPPORT);
        var principal = (TeamPrincipal) supporter.getPrincipal();
        var request = clientRequest("inflight-email");
        var transport = org.mockito.Mockito.mock(EmailTransport.class);
        org.mockito.Mockito.when(transport.configured()).thenReturn(true);
        var service = new SupportRequestService(teamAccess, supportRepository, repository, json, transport, clients, roleResolver);
        var message = service.addMessage(supporter, request.id(), java.util.UUID.randomUUID(), "CLIENT", "Reviewed before revocation");
        org.mockito.Mockito.doAnswer(call -> {
            members.change(root, principal.id(), principal.credentialsVersion(), TeamRole.SUPPORT, "SUSPENDED");return null;
        }).when(transport).send(org.mockito.ArgumentMatchers.any(EmailTransport.Message.class), org.mockito.ArgumentMatchers.anyString());
        assertStatus(401, () -> new SupportReplyEmailService(service, transport, "support@example.invalid").send(supporter, request.id(), message.id()));
        assertThat(supportRepository.message(request.id(), message.id()).orElseThrow().deliveryState()).isEqualTo("SENT");
        assertThat(supportRepository.events(request.id())).filteredOn(item -> item.event().equals("CLIENT_EMAIL_ACCEPTED")).hasSize(1);
    }

    @Test void oldSuccessfulEnquiryNotificationCannotReplaceANewerFailedAttempt() {
        var form = enquiry("old-success"); var key = java.util.UUID.randomUUID();
        var notifications = org.mockito.Mockito.mock(InquiryEmailService.class);
        var intake = new SupportIntakeService(intakeStore, supportRepository, notifications, uploadValidator, json);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        org.mockito.Mockito.doAnswer(call -> {
            if(calls.incrementAndGet()==1){
                var receipt=supportRepository.submission(key).orElseThrow();
                new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_request SET notification_started_at=? WHERE id=?",java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20),receipt.id());
                assertThatThrownBy(() -> intake.receive(form,null,"Synthetic contact",key)).isInstanceOf(SupportIntakeService.ReceiptException.class);
                return null;
            }
            throw new InquiryEmailService.InquiryEmailException("Synthetic unconfirmed notification",new java.io.IOException("Synthetic outage"));
        }).when(notifications).sendInquiry(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        assertThatThrownBy(() -> intake.receive(form,null,"Synthetic contact",key)).isInstanceOf(SupportIntakeService.ReceiptException.class);
        assertThat(supportRepository.submission(key).orElseThrow().notificationState()).isEqualTo("FAILED");
    }

    @Test void oldFailedEnquiryNotificationCannotReplaceANewerAcceptedAttempt() {
        var form = enquiry("old-failure"); var key = java.util.UUID.randomUUID();
        var notifications = org.mockito.Mockito.mock(InquiryEmailService.class);
        var intake = new SupportIntakeService(intakeStore, supportRepository, notifications, uploadValidator, json);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        org.mockito.Mockito.doAnswer(call -> {
            if(calls.incrementAndGet()==1){
                var receipt=supportRepository.submission(key).orElseThrow();
                new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_request SET notification_started_at=? WHERE id=?",java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20),receipt.id());
                assertThat(intake.receive(form,null,"Synthetic contact",key)).isEqualTo(receipt.id());
                throw new InquiryEmailService.InquiryEmailException("Synthetic old callback",new java.io.IOException("Synthetic timeout"));
            }
            return null;
        }).when(notifications).sendInquiry(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        assertThatThrownBy(() -> intake.receive(form,null,"Synthetic contact",key)).isInstanceOf(SupportIntakeService.ReceiptException.class);
        assertThat(supportRepository.submission(key).orElseThrow().notificationState()).isEqualTo("SENT");
    }

    @Test void expiredEnquiryNotificationCannotCompleteAndCanBeReclaimed() {
        var form = enquiry("expired-notification"); var key = java.util.UUID.randomUUID();
        var notifications = org.mockito.Mockito.mock(InquiryEmailService.class);
        var intake = new SupportIntakeService(intakeStore, supportRepository, notifications, uploadValidator, json);
        org.mockito.Mockito.doAnswer(call -> {
            var receipt=supportRepository.submission(key).orElseThrow();
            new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE support_request SET notification_started_at=? WHERE id=?",java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).minusMinutes(20),receipt.id());return null;
        }).when(notifications).sendInquiry(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        assertThatThrownBy(() -> intake.receive(form,null,"Synthetic contact",key)).isInstanceOf(SupportIntakeService.ReceiptException.class);
        assertThat(supportRepository.submission(key).orElseThrow().notificationState()).isEqualTo("SENDING");
        org.mockito.Mockito.reset(notifications);
        var receipt=intake.receive(form,null,"Synthetic contact",key);
        assertThat(supportRepository.submission(key).orElseThrow().notificationState()).isEqualTo("SENT");
        assertThat(receipt).isEqualTo(supportRepository.submission(key).orElseThrow().id());
    }

    @Test void enquiryRetryPreservesReceiptAndQuarantinedFilesAndBindsAllSubmissionInput() throws Exception {
        var form=enquiry("retry-enquiry");var key=java.util.UUID.randomUUID();
        var notifications=org.mockito.Mockito.mock(InquiryEmailService.class);
        var intake=new SupportIntakeService(intakeStore,supportRepository,notifications,uploadValidator,json);
        var files=new org.springframework.web.multipart.MultipartFile[]{image("reference.png",png())};
        var receipt=intake.receive(form,files,"Synthetic services",key);
        assertThat(intake.receive(form,files,"Synthetic services",key)).isEqualTo(receipt);
        org.mockito.Mockito.verify(notifications,org.mockito.Mockito.times(1)).sendInquiry(org.mockito.ArgumentMatchers.eq(form),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.eq("Synthetic services"),org.mockito.ArgumentMatchers.eq("enquiry-"+receipt));
        assertThat(supportRepository.attachments(receipt)).hasSize(1);
        assertThat(supportRepository.attachments(receipt).get(0).scanState()).isEqualTo("UNSCANNED");
        assertStatus(409,()->intake.receive(form,null,"Synthetic services",key));
        assertStatus(409,()->intake.receive(form,files,"Other source",key));
        form.setMessage("Changed body");assertStatus(409,()->intake.receive(form,files,"Synthetic services",key));
        assertThat(supportRepository.events(receipt)).hasSize(1);
    }

    @Test void unconfirmedNotificationKeepsReceiptAndRetryUsesTheSameProviderIdentity() {
        var form=enquiry("unknown-notification");var key=java.util.UUID.randomUUID();
        var notifications=org.mockito.Mockito.mock(InquiryEmailService.class);
        var intake=new SupportIntakeService(intakeStore,supportRepository,notifications,uploadValidator,json);
        org.mockito.Mockito.doThrow(new InquiryEmailService.InquiryEmailException("Synthetic timeout",new java.io.IOException("Synthetic outage"))).when(notifications).sendInquiry(org.mockito.ArgumentMatchers.any(),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.anyString(),org.mockito.ArgumentMatchers.anyString());
        assertThatThrownBy(()->intake.receive(form,null,"Synthetic contact",key)).isInstanceOfSatisfying(SupportIntakeService.ReceiptException.class,failure->assertThat(failure.requestId()).isEqualTo(supportRepository.submission(key).orElseThrow().id()));
        var receipt=supportRepository.submission(key).orElseThrow();assertThat(receipt.notificationState()).isEqualTo("FAILED");
        org.mockito.Mockito.reset(notifications);
        assertThat(intake.receive(form,null,"Synthetic contact",key)).isEqualTo(receipt.id());
        org.mockito.Mockito.verify(notifications).sendInquiry(org.mockito.ArgumentMatchers.eq(form),org.mockito.ArgumentMatchers.isNull(),org.mockito.ArgumentMatchers.eq("Synthetic contact"),org.mockito.ArgumentMatchers.eq("enquiry-"+receipt.id()));
        assertThat(supportRepository.events(receipt.id())).hasSize(1);
    }

    private com.crystalpower.website.dto.ContactForm enquiry(String suffix){
        var form=new com.crystalpower.website.dto.ContactForm();form.setIntent("general");form.setFirstName("Synthetic");form.setLastName("Visitor");form.setEmail(suffix+"@example.invalid");form.setPreferredContactPoint("Email");form.setMessage("Synthetic enquiry for isolated recovery checks");return form;
    }

    private com.crystalpower.website.repository.TeamRoleProfileRepository.Profile profile(String name, TeamRole base, java.util.Set<TeamPermission> grants) {
        return (com.crystalpower.website.repository.TeamRoleProfileRepository.Profile) roleProfiles.create(root,name,base,grants);
    }
    private Authentication currentRevisionToken(Authentication previous) {
        // Current-revision authenticated fixture, not a claim of another real MFA sign-in.
        var member = repository.credentials(((TeamPrincipal) previous.getPrincipal()).id(), false).orElseThrow().member();
        return token(new TeamPrincipal(member.id(),member.workspaceId(),member.email(),member.displayName(),member.role(),member.credentialsVersion()), "TEAM");
    }

    private byte[] png() throws java.io.IOException {
        var output = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB), "png", output);
        return output.toByteArray();
    }
    private org.springframework.mock.web.MockMultipartFile image(String name, byte[] bytes) { return new org.springframework.mock.web.MockMultipartFile("file",name,"image/png",bytes); }

    private com.crystalpower.website.repository.SupportRepository.Request clientRequest(String name) {
        var workspace = identities.workspaceId(((OwnerPrincipal) root.getPrincipal()).id());
        return supportRepository.create(java.util.UUID.randomUUID(), java.util.UUID.randomUUID().toString(), workspace,
                "Synthetic client", name + "@example.invalid", "website", "Synthetic request", "isolated test", "{}");
    }

    private void assertStatus(int status, org.assertj.core.api.ThrowableAssert.ThrowingCallable operation) {
        assertThatThrownBy(operation).isInstanceOfSatisfying(ResponseStatusException.class,
                failure -> assertThat(failure.getStatusCode().value()).isEqualTo(status));
    }

    @Test void personalSettingsAreActorScopedAndStaleWritesCannotChangeProfile() throws Exception {
        Authentication first=member("settings-first",TeamRole.MEMBER),second=member("settings-second",TeamRole.MEMBER);
        var original=teamSettings.view(first);var untouched=teamSettings.view(second);
        var saved=teamSettings.preferences(first,original.preferences().version(),"Updated teammate",true,false,false);
        assertThat(saved.displayName()).isEqualTo("Updated teammate");
        assertThat(saved.preferences().compact()).isTrue();
        assertThat(saved.preferences().unreadBadges()).isFalse();
        assertThat(saved.preferences().mentionAlerts()).isFalse();
        assertStatus(409,()->teamSettings.preferences(first,original.preferences().version(),"Stale overwrite",false,true,true));
        assertThat(teamSettings.view(first).displayName()).isEqualTo("Updated teammate");
        assertThat(teamSettings.view(first).preferences()).isEqualTo(saved.preferences());
        assertThat(teamSettings.view(second)).isEqualTo(untouched);
        var owner=teamSettings.view(root);
        assertStatus(400,()->teamSettings.preferences(root,owner.preferences().version(),"Renamed protected owner",true,false,false));
        assertThat(teamSettings.view(root)).isEqualTo(owner);
    }

    @Test void workspaceSettingsRequireLiveAuthorityCsrfAndValidInput() throws Exception {
        Authentication ordinary=member("settings-ordinary",TeamRole.MEMBER),admin=member("settings-admin",TeamRole.ADMIN);
        var before=teamSettings.view(admin);
        assertStatus(403,()->teamSettings.branding(ordinary,before.branding().version(),"Forbidden name",""));
        var body=json.writeValueAsString(Map.of("expectedVersion",before.branding().version(),"name","Reviewed team","tagline","Private work"));
        mvc.perform(patch("/api/team/settings/workspace").with(authentication(admin)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(patch("/api/team/settings/personal").with(authentication(admin)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"displayName\":\" \",\"expectedVersion\":0}")).andExpect(status().isBadRequest());
        var saved=teamSettings.branding(admin,before.branding().version()," Reviewed team "," Private work ");
        assertThat(saved.branding().name()).isEqualTo("Reviewed team");
        assertThat(saved.branding().tagline()).isEqualTo("Private work");
        assertStatus(409,()->teamSettings.branding(admin,before.branding().version(),"Stale identity",""));
        assertThat(teamSettings.view(admin).branding()).isEqualTo(saved.branding());
        var principal=(TeamPrincipal)admin.getPrincipal();
        members.change(root,principal.id(),principal.credentialsVersion(),TeamRole.MEMBER,"ACTIVE");
        assertStatus(401,()->teamSettings.branding(admin,saved.branding().version(),"Revoked identity",""));
        assertThat(teamSettings.view(root).branding()).isEqualTo(saved.branding());
    }

    @Test void channelPreferencesRespectCurrentMembershipAndGlobalMentionChoices() throws Exception {
        Authentication reader=member("settings-reader",TeamRole.MEMBER),other=member("settings-other",TeamRole.MEMBER);
        var readerId=((TeamPrincipal)reader.getPrincipal()).id();
        var group=groups.save(root,null,0,"Settings private group","",false,List.of(readerId));
        var channel=channels.create(root,"settings-private","","Team","TEAM",group.id());
        var original=teamSettings.channel(reader,channel.id());
        assertStatus(404,()->teamSettings.channel(other,channel.id()));
        assertStatus(404,()->teamSettings.channel(other,channel.id(),0,false,false,true));
        var saved=teamSettings.channel(reader,channel.id(),original.version(),false,false,true);
        assertThat(saved.favourite()).isTrue();
        assertStatus(409,()->teamSettings.channel(reader,channel.id(),original.version(),true,true,false));
        String key="TEAM:"+readerId;
        assertThat(settingsRepository.mentionEnabled(key,channel.id())).isFalse();
        saved=teamSettings.channel(reader,channel.id(),saved.version(),true,true,true);
        assertThat(settingsRepository.mentionEnabled(key,channel.id())).isTrue();
        var global=teamSettings.view(reader).preferences();
        teamSettings.preferences(reader,global.version(),"Reader",false,true,false);
        assertThat(settingsRepository.mentionEnabled(key,channel.id())).isFalse();
        groups.save(root,group.id(),group.version(),group.name(),"",false,List.of());
        final int savedVersion=saved.version();
        assertStatus(404,()->teamSettings.channel(reader,channel.id()));
        assertStatus(404,()->teamSettings.channel(reader,channel.id(),savedVersion,true,true,false));
        assertThat(teamSettings.view(reader).channelPreferences()).isEmpty();
        assertThat(teamSettings.view(root).channelPreferences()).isEmpty();
    }

    @Test void teamPasswordChangeRequiresFreshProofAndRevokesOnlyItsActor() throws Exception {
        Authentication actor=member("security-password",TeamRole.MEMBER),other=member("security-other",TeamRole.SUPPORT);
        var principal=(TeamPrincipal)actor.getPrincipal();var before=repository.credentials(principal.id(),false).orElseThrow();
        String fresh=freshTeamCode(actor),next="Synthetic-changed-password-2026";
        assertStatus(400,()->teamAccounts.password(actor,"Wrong synthetic password",fresh,next));
        assertThat(repository.credentials(principal.id(),false).orElseThrow()).isEqualTo(beforeWithFreshStep(before));
        assertStatus(400,()->teamAccounts.password(actor,PASSWORD,fresh,"Short"));
        assertStatus(400,()->teamAccounts.password(actor,PASSWORD,fresh,"\u00e9".repeat(37)));
        teamAccounts.password(actor,PASSWORD,fresh,next);
        assertThat(authentication.valid(principal)).isFalse();
        assertThat(authentication.valid((TeamPrincipal)other.getPrincipal())).isTrue();
        assertStatus(401,()->authentication.password(before.member().email(),PASSWORD));
        var current=authentication.password(before.member().email(),next);
        assertThat(current.member().credentialsVersion()).isEqualTo(principal.credentialsVersion()+1);
        assertThat(current.encryptedTotp()).isEqualTo(before.encryptedTotp());
        assertThat(current.mfaEnabled()).isTrue();
        assertThat(new org.springframework.jdbc.core.JdbcTemplate(dataSource).queryForObject("SELECT COUNT(*) FROM team_audit WHERE actor_team_id=? AND event='TEAM_PASSWORD_CHANGED'",Integer.class,principal.id())).isEqualTo(1);
        assertStatus(401,()->teamAccounts.sessions(actor,next,fresh));
    }

    @Test void teamSessionRevocationKeepsPasswordAndAuthenticatorAndEndsHttpSession() throws Exception {
        Authentication actor=member("security-sessions",TeamRole.ADMIN);
        var principal=(TeamPrincipal)actor.getPrincipal();String fresh=freshTeamCode(actor);
        var before=repository.credentials(principal.id(),false).orElseThrow();var session=new MockHttpSession();
        mvc.perform(post("/api/team/account/sessions/revoke").session(session).with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",PASSWORD,"code",fresh)))).andExpect(status().isOk());
        assertThat(session.isInvalid()).isTrue();assertThat(authentication.valid(principal)).isFalse();
        var current=repository.credentials(principal.id(),false).orElseThrow();
        assertThat(current.passwordHash()).isEqualTo(before.passwordHash());assertThat(current.encryptedTotp()).isEqualTo(before.encryptedTotp());
        assertThat(current.member().credentialsVersion()).isEqualTo(before.member().credentialsVersion()+1);
        assertStatus(401,()->authentication.current(principal.id(),principal.credentialsVersion(),false));
    }

    @Test void teamAuthenticatorReplacementIsEncryptedPendingScopedAndReplayProtected() throws Exception {
        Authentication actor=member("security-authenticator",TeamRole.MODERATOR),other=member("security-authenticator-other",TeamRole.MEMBER);
        var principal=(TeamPrincipal)actor.getPrincipal();var original=repository.credentials(principal.id(),false).orElseThrow();
        String fresh=freshTeamCode(actor);var session=new MockHttpSession();
        var response=mvc.perform(post("/api/team/account/authenticator").session(session).with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",PASSWORD,"code",fresh)))).andExpect(status().isOk()).andReturn();
        String nextSecret=json.readTree(response.getResponse().getContentAsString()).get("secret").asText();
        assertThat(session.getAttribute("crystal.team.authenticator-replacement").toString()).doesNotContain(nextSecret);
        assertThat(repository.credentials(principal.id(),false).orElseThrow().encryptedTotp()).isEqualTo(original.encryptedTotp());
        assertThat(authentication.valid(principal)).isTrue();
        assertStatus(400,()->teamAccounts.sessions(actor,PASSWORD,fresh));
        mvc.perform(post("/api/team/account/authenticator/confirm").session(session).with(authentication(other)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code",code(nextSecret))))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/team/account/authenticator/confirm").session(session).with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code",code(nextSecret))))).andExpect(status().isOk());
        assertThat(session.isInvalid()).isTrue();assertThat(authentication.valid(principal)).isFalse();
        var current=repository.credentials(principal.id(),false).orElseThrow();
        assertThat(teamTestVault.decrypt(current.encryptedTotp())).isEqualTo(nextSecret);
        assertThat(current.passwordHash()).isEqualTo(original.passwordHash());
        assertStatus(401,()->authentication.verify(principal.id(),current.member().credentialsVersion(),code(nextSecret)));
    }

    @Test void cancelledOrExpiredTeamSetupCannotReplaceTheActiveAuthenticator() throws Exception {
        Authentication actor=member("security-cancel",TeamRole.SUPPORT);var principal=(TeamPrincipal)actor.getPrincipal();
        var original=repository.credentials(principal.id(),false).orElseThrow();var session=new MockHttpSession();
        var response=mvc.perform(post("/api/team/account/authenticator").session(session).with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("password",PASSWORD,"code",freshTeamCode(actor))))).andExpect(status().isOk()).andReturn();
        String nextSecret=json.readTree(response.getResponse().getContentAsString()).get("secret").asText();
        assertStatus(400,()->teamAccounts.confirmAuthenticator(actor,teamTestVault.encrypt(nextSecret),code(nextSecret),Instant.now().minusSeconds(1).getEpochSecond()));
        mvc.perform(post("/api/team/account/authenticator/cancel").session(session).with(authentication(actor)).with(csrf())).andExpect(status().isOk());
        assertThat(session.getAttribute("crystal.team.authenticator-replacement")).isNull();
        mvc.perform(post("/api/team/account/authenticator/confirm").session(session).with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("code",code(nextSecret))))).andExpect(status().isBadRequest());
        assertThat(repository.credentials(principal.id(),false).orElseThrow().encryptedTotp()).isEqualTo(original.encryptedTotp());
        assertThat(authentication.valid(principal)).isTrue();
    }

    @Test void teamAccountEndpointsRejectOwnerAnonymousCsrfAndForeignPrincipal() throws Exception {
        Authentication actor=member("security-boundaries",TeamRole.MEMBER);var principal=(TeamPrincipal)actor.getPrincipal();
        String body=json.writeValueAsString(Map.of("password",PASSWORD,"code",freshTeamCode(actor),"nextPassword","Synthetic-new-password-2026"));
        mvc.perform(post("/api/team/account/password").with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/team/account/password").with(authentication(root)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/team/account/password").with(authentication(actor)).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/team/account/password").with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"x\",\"code\":\"invalid\",\"nextPassword\":\"Synthetic-new-password-2026\"}")).andExpect(status().isBadRequest());
        var forged=token(new TeamPrincipal(principal.id(),java.util.UUID.randomUUID(),principal.email(),principal.displayName(),principal.role(),principal.credentialsVersion()),"TEAM");
        assertStatus(401,()->teamAccounts.sessions(forged,PASSWORD,freshTeamCode(actor)));
        assertThat(authentication.valid(principal)).isTrue();assertThat(owners.valid((OwnerPrincipal)root.getPrincipal())).isTrue();
    }

    @Test void teamSecurityProofAttemptsAreLimitedWithoutChangingCredentials() throws Exception {
        Authentication actor=member("security-limited",TeamRole.MEMBER);var principal=(TeamPrincipal)actor.getPrincipal();
        var before=repository.credentials(principal.id(),false).orElseThrow();
        String body=json.writeValueAsString(Map.of("password","Wrong synthetic proof password","code","123456"));
        for(int attempt=0;attempt<10;attempt++)mvc.perform(post("/api/team/account/sessions/revoke").with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/team/account/sessions/revoke").with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isTooManyRequests());
        assertThat(repository.credentials(principal.id(),false).orElseThrow()).isEqualTo(before);
        assertThat(authentication.valid(principal)).isTrue();
    }

    @Test void teamSettingsRolesAndAccountFormsReturnTheSharedJsonErrorContract() throws Exception {
        mvc.perform(patch("/api/team/settings/workspace").with(authentication(root)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("expectedVersion",0,"name","","tagline",""))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").isNotEmpty()).andExpect(jsonPath("$.fieldErrors.name").exists());
        mvc.perform(post("/api/team/roles").with(authentication(root)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("name","","baseRole","MEMBER","permissions",List.of("READ_CHANNELS")))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").isNotEmpty()).andExpect(jsonPath("$.fieldErrors.name").exists());
        Authentication actor=member("security-error-contract",TeamRole.MEMBER);
        mvc.perform(post("/api/team/account/password").with(authentication(actor)).with(csrf()).contentType(MediaType.APPLICATION_JSON)
            .content(json.writeValueAsString(Map.of("password","synthetic invalid proof","code","invalid","nextPassword",PASSWORD))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").isNotEmpty()).andExpect(jsonPath("$.fieldErrors.code").exists());
    }

    private String freshTeamCode(Authentication actor) throws Exception {
        var principal=(TeamPrincipal)actor.getPrincipal();
        // The disposable fixture represents a session whose last accepted code is from an older period.
        new org.springframework.jdbc.core.JdbcTemplate(dataSource).update("UPDATE team_account SET last_totp_step=-1 WHERE id=?",principal.id());
        return code(teamTestVault.decrypt(repository.credentials(principal.id(),false).orElseThrow().encryptedTotp()));
    }
    private TeamIdentityRepository.Credentials beforeWithFreshStep(TeamIdentityRepository.Credentials value) {
        return new TeamIdentityRepository.Credentials(value.member(),value.passwordHash(),value.encryptedTotp(),value.mfaEnabled(),-1);
    }

    private Authentication member(String name, TeamRole role) throws Exception { var created = members.create(root, name + "@example.invalid", name, role); identities.activate(invitationToken(created), PASSWORD); return enrol(created.member().id()); }
    private Authentication enrol(java.util.UUID id) throws Exception { var current = repository.credentials(id, false).orElseThrow(); String secret = authentication.setup(id, current.member().credentialsVersion()); return token(authentication.verify(id, current.member().credentialsVersion(), code(secret)), "TEAM"); }
    private Authentication token(Object principal, String role) { return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))); }
    private String invitationToken(TeamIdentityService.Created created) { return created.invitationPath().substring(created.invitationPath().indexOf("#token=") + 7); }
    private String code(String secret) throws Exception { var generator = new TimeBasedOneTimePasswordGenerator(); return generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm()), Instant.now()); }
}
