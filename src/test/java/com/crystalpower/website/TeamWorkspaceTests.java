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

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:crystal-team-tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "app.owner.setup-token=synthetic-team-test-setup-token-2026"})
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
    private Authentication root;

    @BeforeEach void owner() throws Exception {
        var owner = owners.setup("synthetic-team-test-setup-token-2026", "root@example.invalid", PASSWORD);
        var principal = owners.verify(owner.id(), owner.credentialsVersion(), code(owners.enrolmentSecret(owner.id()))).principal();
        root = token(principal, "OWNER");
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

    private Authentication member(String name, TeamRole role) throws Exception { var created = members.create(root, name + "@example.invalid", name, role); identities.activate(invitationToken(created), PASSWORD); return enrol(created.member().id()); }
    private Authentication enrol(java.util.UUID id) throws Exception { var current = repository.credentials(id, false).orElseThrow(); String secret = authentication.setup(id, current.member().credentialsVersion()); return token(authentication.verify(id, current.member().credentialsVersion(), code(secret)), "TEAM"); }
    private Authentication token(Object principal, String role) { return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))); }
    private String invitationToken(TeamIdentityService.Created created) { return created.invitationPath().substring(created.invitationPath().indexOf("#token=") + 7); }
    private String code(String secret) throws Exception { var generator = new TimeBasedOneTimePasswordGenerator(); return generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm()), Instant.now()); }
}
