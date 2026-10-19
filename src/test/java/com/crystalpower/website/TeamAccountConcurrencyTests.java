package com.crystalpower.website;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.api.TeamAuthController;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.web.servlet.ServletListenerRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.spec.SecretKeySpec;
import javax.sql.DataSource;
import java.time.Instant;
import java.time.Duration;
import java.net.CookieManager;
import java.net.URI;
import java.net.http.*;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

/** Committed disposable fixtures and independent connections, rather than a test rollback pretending to race. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "server.address=127.0.0.1",
    "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-security-races;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000}",
    "app.owner.setup-token=synthetic-security-race-setup-token-2026"
})
@Import(TeamAccountConcurrencyTests.HttpSessions.class)
class TeamAccountConcurrencyTests {
    private static final String PASSWORD = "Synthetic-security-race-password-2026";
    @Autowired DataSource dataSource;
    @Autowired PlatformTransactionManager manager;
    @Autowired TeamIdentityRepository repository;
    @Autowired TeamIdentityService identities;
    @Autowired TeamMemberService members;
    @Autowired TeamAuthenticationService authentication;
    @Autowired TeamAccountService security;
    @Autowired OwnerService owners;
    @Autowired com.crystalpower.website.repository.OwnerRepository ownerRepository;
    @Autowired com.crystalpower.website.repository.SupportRepository supportRepository;
    @Autowired ClientAccessService clientAccess;
    @Autowired BillingDraftService billingDrafts;
    @Autowired BillingInvoiceStore billingInvoices;
    @Autowired TeamChannelService channels;
    @Autowired TeamGroupService groups;
    @Autowired TeamMentionService mentions;
    @Autowired SupportModerationService moderation;
    @Autowired UploadScanStore uploadScans;
    @Autowired SecretVault vault;
    @Autowired TeamAuthController authController;
    @Autowired ObjectMapper json;
    @Autowired Sessions httpSessions;
    @LocalServerPort int port;
    private JdbcTemplate jdbc;
    private boolean postgres;
    private Authentication root;
    private Authentication staff;
    private TeamPrincipal principal;

    @BeforeEach void committedFixture() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String url = connection.getMetaData().getURL();
            postgres = connection.getMetaData().getDatabaseProductName().equals("PostgreSQL");
            if (postgres) assertThat(url).matches("jdbc:postgresql://127\\.0\\.0\\.1:55432/crystal_rebuild_test[a-z0-9_]*");
            else assertThat(url).startsWith("jdbc:h2:mem:crystal-security-races");
        }
        jdbc = new JdbcTemplate(dataSource);
        cleanup();
        var owner = owners.setup("synthetic-security-race-setup-token-2026", "race-root@example.invalid", PASSWORD);
        var ownerPrincipal = owners.verify(owner.id(), owner.credentialsVersion(), code(owners.enrolmentSecret(owner.id()))).principal();
        root = token(ownerPrincipal, "OWNER");
        var created = members.create(root, "race-member@example.invalid", "Synthetic race member", TeamRole.MEMBER);
        identities.activate(invitation(created), PASSWORD);
        var credentials = repository.credentials(created.member().id(), false).orElseThrow();
        String secret = authentication.setup(created.member().id(), credentials.member().credentialsVersion());
        principal = authentication.verify(created.member().id(), credentials.member().credentialsVersion(), code(secret));
        staff = token(principal, "TEAM");
        // Only the disposable fixture: represents a login made in an older TOTP period.
        jdbc.update("UPDATE team_account SET last_totp_step=-1 WHERE id=?", principal.id());
    }

    @AfterEach void cleanup() {
        if (jdbc == null) return;
        // Both database identity guards above must succeed before this template is created.
        if (postgres) jdbc.execute("TRUNCATE TABLE public.admin_account CASCADE");
        else {
            jdbc.execute("SET REFERENTIAL_INTEGRITY FALSE");
            try {
                for (String table : jdbc.queryForList("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'", String.class)) {
                    if (!table.equals("flyway_schema_history")) jdbc.execute("TRUNCATE TABLE \"" + table.replace("\"", "\"\"") + "\"");
                }
            } finally { jdbc.execute("SET REFERENTIAL_INTEGRITY TRUE"); }
        }
    }

    @Test void passwordChangeWinsAgainstSimultaneousSessionRevocation() throws Exception {
        String proof = currentCode();
        var before = repository.credentials(principal.id(), false).orElseThrow();
        assertThat(overlap(() -> security.password(staff, PASSWORD, proof, PASSWORD + "-new"),
                () -> security.sessions(staff, PASSWORD, proof))).isEqualTo(401);
        assertThat(authentication.valid(principal)).isFalse();
        assertThat(authentication.password(principal.email(), PASSWORD + "-new").member().credentialsVersion()).isEqualTo(principal.credentialsVersion() + 1);
        assertThat(repository.credentials(principal.id(), false).orElseThrow().encryptedTotp()).isEqualTo(before.encryptedTotp());
        assertThat(eventCount("TEAM_PASSWORD_CHANGED")).isEqualTo(1);
        assertThat(eventCount("TEAM_SESSIONS_REVOKED")).isZero();
    }

    @Test void simultaneousAuthenticatorBeginsCannotConsumeTheSameCodeTwice() throws Exception {
        String proof = currentCode();
        String key = repository.credentials(principal.id(), false).orElseThrow().encryptedTotp();
        assertThat(overlap(() -> security.beginAuthenticator(staff, PASSWORD, proof),
                () -> security.beginAuthenticator(staff, PASSWORD, proof))).isEqualTo(400);
        assertThat(authentication.valid(principal)).isTrue();
        assertThat(repository.credentials(principal.id(), false).orElseThrow().encryptedTotp()).isEqualTo(key);
        assertThat(eventCount("TEAM_AUTHENTICATOR_REPLACEMENT_STARTED")).isEqualTo(1);
    }

    @Test void sessionRevocationWinsAgainstSimultaneousPasswordChange() throws Exception {
        String proof = currentCode();
        assertThat(overlap(() -> security.sessions(staff, PASSWORD, proof),
                () -> security.password(staff, PASSWORD, proof, PASSWORD + "-new"))).isEqualTo(401);
        assertThat(authentication.valid(principal)).isFalse();
        assertThat(authentication.password(principal.email(), PASSWORD).member().credentialsVersion()).isEqualTo(principal.credentialsVersion() + 1);
        assertThat(eventCount("TEAM_SESSIONS_REVOKED")).isEqualTo(1);
        assertThat(eventCount("TEAM_PASSWORD_CHANGED")).isZero();
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"status","provision","recover","suspend","billing-create","billing-cancel","invoice-start","invoice-restart","channel-create","channel-change","post","edit","pin","mark-read","mention-read","support-review","support-remove","scan-start","scan-finish"})
    void revokedAdminCannotUseBusinessAuthorityAfterWorkspaceWait(String operation) throws Exception {
        var created=members.create(root,"client-admin-race@example.invalid","Synthetic client admin",TeamRole.ADMIN);
        identities.activate(invitation(created),PASSWORD);
        var credentials=repository.credentials(created.member().id(),false).orElseThrow();
        String secret=authentication.setup(created.member().id(),credentials.member().credentialsVersion());
        var admin=authentication.verify(created.member().id(),credentials.member().credentialsVersion(),code(secret));
        Authentication adminAuth=token(admin,"TEAM");
        var request=supportRepository.create(java.util.UUID.randomUUID(),java.util.UUID.randomUUID().toString(),principal.workspaceId(),
            "Synthetic access client","authority-client@example.invalid","website","Synthetic authority request","isolated test","{}");
        var invitation=clientAccess.provision(root,request.id());
        var bill=billingDrafts.create(root,request.id(),java.util.UUID.randomUUID(),"DEPOSIT","Synthetic deposit",1000,"Synthetic agreed deposit terms");
        var channel=channels.workspace(root).channels().stream().filter(item->item.audience().equals("TEAM")).findFirst().orElseThrow();
        var message=channels.post(root,channel.id(),"Synthetic original message",java.util.UUID.randomUUID(),null,List.of("TEAM:"+admin.id()));
        // Direct synthetic stored bytes: these tests exercise authority, not scanner/content acceptance.
        supportRepository.attach(request.id(),"synthetic.png","image/png",new byte[]{1,2,3});
        var file=supportRepository.attachments(request.id()).get(0);
        var scanLease=operation.equals("scan-finish") ? uploadScans.begin(root,file.id(),file.version()) : null;
        var originalFile=supportRepository.moderationFile(principal.workspaceId(),file.id()).orElseThrow();
        int invitations=jdbc.queryForObject("SELECT COUNT(*) FROM client_invitation",Integer.class);
        int events=jdbc.queryForObject("SELECT COUNT(*) FROM support_event WHERE request_id=?",Integer.class,request.id());
        int drafts=jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_request",Integer.class);
        int channelCount=jdbc.queryForObject("SELECT COUNT(*) FROM team_channel",Integer.class);
        int messageCount=jdbc.queryForObject("SELECT COUNT(*) FROM team_message",Integer.class);
        Runnable attempt=()->{
            switch(operation){
                case "status" -> clientAccess.status(adminAuth,request.id());
                case "provision" -> clientAccess.provision(adminAuth,request.id());
                case "recover" -> clientAccess.reset(adminAuth,request.id(),invitation.version());
                case "suspend" -> clientAccess.suspend(adminAuth,request.id(),invitation.version());
                case "billing-create" -> billingDrafts.create(adminAuth,request.id(),java.util.UUID.randomUUID(),"DEPOSIT","Late draft",2000,"Synthetic late terms");
                case "billing-cancel" -> billingDrafts.cancel(adminAuth,request.id(),bill.id());
                case "invoice-start" -> billingInvoices.begin(adminAuth,request.id(),bill.id(),"in_synthetic",0);
                case "invoice-restart" -> billingInvoices.restart(adminAuth,request.id(),bill.id(),"in_synthetic",0);
                case "channel-create" -> channels.create(adminAuth,"late-channel","Late channel","Team","TEAM",null);
                case "channel-change" -> channels.change(adminAuth,channel.id(),channel.version(),"late-name","Late edit","Team","TEAM",false,null,false);
                case "post" -> channels.post(adminAuth,channel.id(),"Late message");
                case "edit" -> channels.edit(adminAuth,channel.id(),message.id(),message.version(),"Late edit",false);
                case "pin" -> channels.pin(adminAuth,channel.id(),message.id(),message.version(),true);
                case "mark-read" -> channels.markRead(adminAuth,channel.id(),message.id());
                case "mention-read" -> mentions.acknowledge(adminAuth,channel.id(),message.id());
                case "support-review" -> moderation.review(adminAuth,file.id(),file.version(),"REJECTED","Synthetic refused review");
                case "support-remove" -> moderation.remove(adminAuth,file.id(),file.version(),"Synthetic refused removal");
                case "scan-start" -> uploadScans.begin(adminAuth,file.id(),file.version());
                case "scan-finish" -> uploadScans.finish(adminAuth,scanLease,"CLEAN");
                default -> throw new IllegalArgumentException(operation);
            }
        };
        int outcome=overlap(()->members.change(root,admin.id(),admin.credentialsVersion(),TeamRole.ADMIN,"SUSPENDED"),attempt);
        assertThat(repository.credentials(admin.id(),false).orElseThrow().member().state()).isEqualTo("SUSPENDED");
        assertThat(authentication.valid(admin)).isFalse();
        assertThat(outcome).as("revoked admin %s must be rejected after the committed suspension",operation).isEqualTo(401);
        assertThat(clientAccess.status(root,request.id()).version()).isEqualTo(invitation.version());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM client_invitation",Integer.class)).isEqualTo(invitations);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM support_event WHERE request_id=?",Integer.class,request.id())).isEqualTo(events);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_request",Integer.class)).isEqualTo(drafts);
        assertThat(billingDrafts.list(root,request.id()).get(0).state()).isEqualTo("DRAFT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_channel",Integer.class)).isEqualTo(channelCount);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_message",Integer.class)).isEqualTo(messageCount);
        var unchanged=channels.messages(root,channel.id(),null).get(0);
        assertThat(unchanged.body()).isEqualTo(message.body());assertThat(unchanged.pinned()).isFalse();
        assertThat(channels.workspace(root).channels().stream().filter(item->item.id().equals(channel.id())).findFirst().orElseThrow().name()).isEqualTo(channel.name());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_channel_read WHERE channel_id=?",Integer.class,channel.id())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_mention WHERE channel_id=? AND acknowledged_at IS NOT NULL",Integer.class,channel.id())).isZero();
        assertThat(supportRepository.moderationFile(principal.workspaceId(),file.id()).orElseThrow()).isEqualTo(originalFile);
        assertThat(supportRepository.file(principal.workspaceId(),file.id()).orElseThrow().content()).containsExactly(new byte[]{1,2,3});
    }

    @RepeatedTest(8)
    void revokedAdminMessagePostRechecksAfterWorkspaceWait() throws Exception {
        revokedAdminCannotUseBusinessAuthorityAfterWorkspaceWait("post");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"post","edit","mark-read","mention-read"})
    void removedGroupMemberCannotMutateConversationAfterWorkspaceWait(String operation) throws Exception {
        var group=groups.save(root,null,0,"Synthetic restricted group","Synthetic access boundary",false,List.of(principal.id()));
        var channel=channels.create(root,"private-race","Synthetic private conversation","Team","TEAM",group.id());
        var own=channels.post(staff,channel.id(),"Original private message");
        var notice=channels.post(root,channel.id(),"Synthetic mention",java.util.UUID.randomUUID(),null,List.of("TEAM:"+principal.id()));
        Runnable attempt=()->{
            switch(operation){
                case "post" -> channels.post(staff,channel.id(),"Refused private message");
                case "edit" -> channels.edit(staff,channel.id(),own.id(),own.version(),"Refused edit",false);
                case "mark-read" -> channels.markRead(staff,channel.id(),notice.id());
                case "mention-read" -> mentions.acknowledge(staff,channel.id(),notice.id());
                default -> throw new IllegalArgumentException(operation);
            }
        };
        assertThat(overlap(()->groups.save(root,group.id(),group.version(),group.name(),group.description(),false,List.of()),attempt)).isEqualTo(404);
        assertThat(channels.messages(root,channel.id(),null)).hasSize(2).anySatisfy(message->{assertThat(message.id()).isEqualTo(own.id());assertThat(message.body()).isEqualTo(own.body());});
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_channel_read WHERE channel_id=?",Integer.class,channel.id())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM team_mention WHERE channel_id=? AND acknowledged_at IS NOT NULL",Integer.class,channel.id())).isZero();
    }

    @Test void cancelledInvitationCannotActivateAfterWaitingForAdminCommit() throws Exception {
        var created = members.create(root, "race-invite@example.invalid", "Synthetic invitation", TeamRole.MEMBER);
        assertThat(overlap(() -> members.cancel(root, created.member().id(), created.member().credentialsVersion()),
                () -> identities.activate(invitation(created), PASSWORD))).isEqualTo(400);
        var current = repository.credentials(created.member().id(), false).orElseThrow();
        assertThat(current.member().state()).isEqualTo("SUSPENDED");
        assertThat(current.passwordHash()).isNull();
        assertThat(current.mfaEnabled()).isFalse();
        assertThat(authentication.valid(principal)).isTrue();
    }

    @Test void activationWinsAgainstStaleInvitationCancellation() throws Exception {
        var created = members.create(root, "race-invite@example.invalid", "Synthetic invitation", TeamRole.MEMBER);
        assertThat(overlap(() -> identities.activate(invitation(created), PASSWORD),
                () -> members.cancel(root, created.member().id(), created.member().credentialsVersion()))).isEqualTo(409);
        var current = repository.credentials(created.member().id(), false).orElseThrow();
        assertThat(current.member().state()).isEqualTo("ACTIVE");
        assertThat(authentication.password(current.member().email(), PASSWORD).member().id()).isEqualTo(created.member().id());
        assertThatThrownBy(() -> identities.activate(invitation(created), PASSWORD)).isInstanceOf(ResponseStatusException.class);
    }

    @Test void adminRecoveryWinsAgainstPendingAuthenticatorConfirmation() throws Exception {
        var setup = security.beginAuthenticator(staff, PASSWORD, currentCode());
        String proof = code(setup.secret());
        assertThat(overlap(() -> members.reset(root, principal.id(), principal.credentialsVersion()),
                () -> security.confirmAuthenticator(staff, setup.encryptedSecret(), proof, Instant.now().getEpochSecond() + 300))).isEqualTo(401);
        var current = repository.credentials(principal.id(), false).orElseThrow();
        assertThat(current.member().state()).isEqualTo("INVITED");
        assertThat(current.passwordHash()).isNull();
        assertThat(current.encryptedTotp()).isNull();
        assertThat(current.mfaEnabled()).isFalse();
        assertThat(authentication.valid(principal)).isFalse();
        assertThat(eventCount("TEAM_AUTHENTICATOR_REPLACED")).isZero();
        assertThat(eventCount("TEAM_CREDENTIALS_RESET")).isEqualTo(1);
    }

    @Test void authenticatorConfirmationWinsAgainstStaleAdminRecovery() throws Exception {
        var setup = security.beginAuthenticator(staff, PASSWORD, currentCode());
        String proof = code(setup.secret());
        assertThat(overlap(() -> security.confirmAuthenticator(staff, setup.encryptedSecret(), proof, Instant.now().getEpochSecond() + 300),
                () -> members.reset(root, principal.id(), principal.credentialsVersion()))).isEqualTo(409);
        var current = repository.credentials(principal.id(), false).orElseThrow();
        assertThat(current.member().state()).isEqualTo("ACTIVE");
        assertThat(current.member().credentialsVersion()).isEqualTo(principal.credentialsVersion() + 1);
        assertThat(vault.decrypt(current.encryptedTotp())).isEqualTo(setup.secret());
        assertThat(authentication.valid(principal)).isFalse();
        assertThat(eventCount("TEAM_AUTHENTICATOR_REPLACED")).isEqualTo(1);
        assertThat(eventCount("TEAM_CREDENTIALS_RESET")).isZero();
    }

    @Test void signInChallengeExpiringDuringLockWaitCannotConsumeCodeOrAuthenticate() throws Exception {
        String proof = currentCode();
        var before = repository.credentials(principal.id(), false).orElseThrow();
        long deadline = Instant.now().getEpochSecond() + 3;
        assertThat(overlap(() -> repository.lockWorkspace(principal.workspaceId()),
                () -> authentication.verify(principal.id(), principal.credentialsVersion(), proof, deadline),
                () -> awaitDeadline(deadline))).isEqualTo(401);
        assertThat(repository.credentials(principal.id(), false).orElseThrow()).isEqualTo(before);
        assertThat(eventCount("TEAM_SIGNED_IN")).isZero();
    }

    @Test void enrolmentChallengeExpiringDuringLockWaitCannotCreateOrRevealKey() throws Exception {
        var created = members.create(root, "expiring-enrolment@example.invalid", "Synthetic enrolment", TeamRole.MEMBER);
        identities.activate(invitation(created), PASSWORD);
        var before = repository.credentials(created.member().id(), false).orElseThrow();
        long deadline = Instant.now().getEpochSecond() + 3;
        assertThat(overlap(() -> repository.lockWorkspace(principal.workspaceId()),
                () -> authentication.setup(created.member().id(), before.member().credentialsVersion(), deadline),
                () -> awaitDeadline(deadline))).isEqualTo(401);
        assertThat(repository.credentials(created.member().id(), false).orElseThrow()).isEqualTo(before);
        assertThat(before.encryptedTotp()).isNull();
        assertThat(before.mfaEnabled()).isFalse();
    }

    @Test void logoutDuringBlockedMfaCannotRestoreTheEndedSession() throws Exception {
        var login = new MockHttpServletRequest();
        authController.login(new TeamAuthController.Login(principal.email(), PASSWORD), login, new MockHttpServletResponse());
        var pendingSession = (MockHttpSession) login.getSession(false);
        var verify = request(pendingSession);
        String proof = currentCode();
        assertThat(overlap(() -> repository.lockWorkspace(principal.workspaceId()),
                () -> authController.verify(new TeamAuthController.Code(proof), verify, new MockHttpServletResponse()),
                () -> authController.logout(request(pendingSession)))).isEqualTo(401);
        assertThat(pendingSession.isInvalid()).isTrue();
        assertThat(verify.getSession(false)).isNull();
    }

    @Test void replacingLoginDuringBlockedMfaCannotRestoreThePreviousChallenge() throws Exception {
        var login = new MockHttpServletRequest();
        authController.login(new TeamAuthController.Login(principal.email(), PASSWORD), login, new MockHttpServletResponse());
        var pendingSession = (MockHttpSession) login.getSession(false);
        var verify = request(pendingSession);
        var replacement = request(pendingSession);
        String proof = currentCode();
        assertThat(overlap(() -> repository.lockWorkspace(principal.workspaceId()),
                () -> authController.verify(new TeamAuthController.Code(proof), verify, new MockHttpServletResponse()),
                () -> authController.login(new TeamAuthController.Login(principal.email(), PASSWORD), replacement, new MockHttpServletResponse()))).isEqualTo(401);
        assertThat(verify.getSession(false)).isNull();
        assertThat(replacement.getSession(false)).isNotSameAs(pendingSession).isNotNull();
        assertThat(replacement.getSession(false).getAttribute("crystal.team.pending")).isNotNull();
        assertThat(replacement.getSession(false).getAttribute("SPRING_SECURITY_CONTEXT")).isNull();
    }

    @Test void logoutDuringBlockedEnrolmentCannotReturnThePrivateKey() throws Exception {
        var created = members.create(root, "cancelled-enrolment@example.invalid", "Synthetic cancelled enrolment", TeamRole.MEMBER);
        identities.activate(invitation(created), PASSWORD);
        var login = new MockHttpServletRequest();
        authController.login(new TeamAuthController.Login(created.member().email(), PASSWORD), login, new MockHttpServletResponse());
        var pendingSession = (MockHttpSession) login.getSession(false);
        var enrolment = request(pendingSession);
        assertThat(overlap(() -> repository.lockWorkspace(principal.workspaceId()),
                () -> authController.enrolment(enrolment),
                () -> authController.logout(request(pendingSession)))).isEqualTo(401);
        assertThat(enrolment.getSession(false)).isNull();
        assertThat(repository.credentials(created.member().id(), false).orElseThrow().mfaEnabled()).isFalse();
    }

    @Test void actualHttpSignInRotatesCookiesAndLogoutEndsProtectedAccess() throws Exception {
        var cookies = new CookieManager();
        var client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(3)).build();
        authenticatedHttp(client, cookies);
        assertThat(post(client, "/api/team/auth/logout", Map.of()).statusCode()).isEqualTo(200);
        assertThat(get(client, "/api/team/workspace").statusCode()).isEqualTo(401);
        assertThat(json.readTree(get(client, "/api/team/auth/session").body()).path("authenticated").asBoolean()).isFalse();
        assertThat(post(client, "/api/team/auth/logout", Map.of()).statusCode()).isEqualTo(200);
    }

    @Test void actualServletIdleExpiryEndsProtectedAccessWithoutRestoringAuthentication() throws Exception {
        var cookies = new CookieManager();
        var client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(3)).build();
        authenticatedHttp(client, cookies);
        var session = httpSessions.live.get(cookieId(cookies));
        assertThat(session).as("actual authenticated Tomcat session").isNotNull();
        assertThat(session.getMaxInactiveInterval()).isEqualTo(1800);
        session.setMaxInactiveInterval(1); // Only this disposable server session; production stays 30 minutes.
        long idleAfter = session.getLastAccessedTime() + 1500;
        while (System.currentTimeMillis() < idleAfter) Thread.sleep(10);
        assertThat(get(client, "/api/team/workspace").statusCode()).isEqualTo(401);
        assertThat(json.readTree(get(client, "/api/team/auth/session").body()).path("authenticated").asBoolean()).isFalse();
        assertThat(httpSessions.live.containsKey(session.getId())).isFalse();
    }

    @Test void actualHttpAdminRecoveryClearsPendingMfaInsteadOfRepeatingSessionErrors() throws Exception {
        var cookies = new CookieManager();
        var client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(3)).build();
        String oldProof = currentCode();
        assertThat(post(client, "/api/team/auth/login", Map.of("email", principal.email(), "password", PASSWORD)).statusCode()).isEqualTo(200);
        var pending = httpSessions.live.get(cookieId(cookies));
        assertThat(pending.getAttribute("crystal.team.pending")).isNotNull();
        members.reset(root, principal.id(), principal.credentialsVersion());
        for (int retry=0; retry<2; retry++) {
            var state = get(client, "/api/team/auth/session");
            assertThat(state.statusCode()).isEqualTo(200);
            var body = json.readTree(state.body());
            assertThat(body.path("authenticated").asBoolean()).isFalse();
            assertThat(body.path("mfaRequired").asBoolean()).isFalse();
        }
        assertThat(pending.getAttribute("crystal.team.pending")).isNull();
        assertThat(post(client, "/api/team/auth/verify", Map.of("code", oldProof)).statusCode()).isEqualTo(401);
        assertThat(get(client, "/api/team/workspace").statusCode()).isEqualTo(401);
        assertThat(repository.credentials(principal.id(), false).orElseThrow().member().state()).isEqualTo("INVITED");
    }

    @Test void ownerMfaDeadlineIsRecheckedAfterItsAccountLock() throws Exception {
        var id = ((OwnerPrincipal)root.getPrincipal()).id();
        jdbc.update("UPDATE admin_account SET last_totp_step=-1 WHERE id=?",id);
        var before = ownerRepository.byId(id).orElseThrow();
        String proof = code(vault.decrypt(before.encryptedTotp()));
        long expires = Instant.now().getEpochSecond()+3;
        assertThat(overlap(() -> ownerRepository.lock(id),
                () -> owners.verify(id,before.credentialsVersion(),proof,expires),
                () -> awaitDeadline(expires))).isEqualTo(401);
        assertThat(ownerRepository.byId(id).orElseThrow()).isEqualTo(before);
    }

    @Test void ownerEnrolmentDeadlineIsRecheckedBeforeRevealingItsKey() throws Exception {
        var id = ((OwnerPrincipal)root.getPrincipal()).id();
        jdbc.update("UPDATE admin_account SET mfa_enabled=FALSE WHERE id=?",id); // Synthetic pre-enrolment state only.
        var before = ownerRepository.byId(id).orElseThrow();
        long expires = Instant.now().getEpochSecond()+3;
        assertThat(overlap(() -> ownerRepository.lock(id),
                () -> owners.enrolmentSecret(id,before.credentialsVersion(),expires),
                () -> awaitDeadline(expires))).isEqualTo(401);
        assertThat(ownerRepository.byId(id).orElseThrow()).isEqualTo(before);
    }

    @Test void expiredOwnerChallengeCannotConsumeARecoveryCode() throws Exception {
        var id = ((OwnerPrincipal)root.getPrincipal()).id();
        var before = ownerRepository.byId(id).orElseThrow();
        String recovery = owners.newRecoveryCodes(id).get(0);
        long expires = Instant.now().getEpochSecond()+3;
        assertThat(overlap(() -> ownerRepository.lock(id),
                () -> owners.verify(id,before.credentialsVersion(),recovery,expires),
                () -> awaitDeadline(expires))).isEqualTo(401);
        assertThat(owners.verify(id,before.credentialsVersion(),recovery).principal().id()).isEqualTo(id);
    }

    @Test void actualOwnerHttpKeepsMfaRotationFreshnessAndRoleBoundaries() throws Exception {
        var id = ((OwnerPrincipal)root.getPrincipal()).id();
        jdbc.update("UPDATE admin_account SET last_totp_step=-1 WHERE id=?",id);
        var owner = ownerRepository.byId(id).orElseThrow();
        var cookies = new CookieManager();
        var client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(3)).build();
        get(client,"/api/admin/auth/csrf"); String anonymous = cookieId(cookies);
        assertThat(post(client,"/api/admin/auth/login",Map.of("email",owner.email(),"password",PASSWORD)).statusCode()).isEqualTo(200);
        String pending = cookieId(cookies); assertThat(pending).isNotEqualTo(anonymous);
        assertThat(get(client,"/api/admin/projects").statusCode()).isEqualTo(401);
        assertThat(post(client,"/api/admin/auth/verify",Map.of("code",code(vault.decrypt(owner.encryptedTotp())))).statusCode()).isEqualTo(200);
        assertThat(cookieId(cookies)).isNotEqualTo(pending);
        assertThat(httpSessions.live.get(cookieId(cookies)).getAttribute("crystal.authenticated-at")).isInstanceOf(Long.class);
        assertThat(json.readTree(get(client,"/api/admin/auth/session").body()).path("authenticated").asBoolean()).isTrue();
        assertThat(get(client,"/api/admin/projects").statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/team/workspace").statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/client/projects").statusCode()).isEqualTo(403);
        assertThat(post(client,"/api/admin/auth/logout",Map.of()).statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/admin/projects").statusCode()).isEqualTo(401);
    }

    @Test void actualClientHttpRotatesSessionAndCannotInheritOwnerOrTeamAccess() throws Exception {
        var request = supportRepository.create(java.util.UUID.randomUUID(),java.util.UUID.randomUUID().toString(),principal.workspaceId(),
            "Synthetic HTTP client","identity-client@example.invalid","website","Synthetic request","isolated test","{}");
        var invitation = clientAccess.provision(root,request.id()); clientAccess.activate(invitation.invitationToken(),PASSWORD);
        var cookies = new CookieManager();
        var client = HttpClient.newBuilder().cookieHandler(cookies).connectTimeout(Duration.ofSeconds(3)).build();
        get(client,"/api/client/auth/csrf"); String anonymous = cookieId(cookies);
        assertThat(post(client,"/api/client/auth/login",Map.of("email",invitation.email(),"password",PASSWORD)).statusCode()).isEqualTo(200);
        assertThat(cookieId(cookies)).isNotEqualTo(anonymous);
        assertThat(json.readTree(get(client,"/api/client/auth/session").body()).path("authenticated").asBoolean()).isTrue();
        assertThat(get(client,"/api/client/projects").statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/admin/projects").statusCode()).isEqualTo(403);
        assertThat(get(client,"/api/team/workspace").statusCode()).isEqualTo(403);
        assertThat(post(client,"/api/client/auth/logout",Map.of()).statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/client/projects").statusCode()).isEqualTo(401);
        assertThat(post(client,"/api/client/auth/login",Map.of("email",invitation.email(),"password",PASSWORD)).statusCode()).isEqualTo(200);
        assertThat(post(client,"/api/admin/auth/logout",Map.of()).statusCode()).isEqualTo(200);
        assertThat(get(client,"/api/client/projects").statusCode()).isEqualTo(401);
    }

    private void authenticatedHttp(HttpClient client, CookieManager cookies) throws Exception {
        var grant = json.readTree(get(client, "/api/admin/auth/csrf").body());
        String anonymousId = cookieId(cookies);
        var login = send(client, "/api/team/auth/login", Map.of("email", principal.email(), "password", PASSWORD), grant);
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(json.readTree(login.body()).path("mfaRequired").asBoolean()).isTrue();
        String pendingId = cookieId(cookies);
        assertThat(pendingId).isNotEqualTo(anonymousId);
        assertThat(get(client, "/api/team/workspace").statusCode()).isEqualTo(401);
        var verified = post(client, "/api/team/auth/verify", Map.of("code", currentCode()));
        assertThat(verified.statusCode()).isEqualTo(200);
        assertThat(json.readTree(verified.body()).path("authenticated").asBoolean()).isTrue();
        assertThat(cookieId(cookies)).isNotEqualTo(pendingId);
        var workspace = get(client, "/api/team/workspace");
        assertThat(workspace.statusCode()).isEqualTo(200);
        assertThat(workspace.headers().firstValue("Cache-Control").orElse("")).contains("no-store");
        assertThat(workspace.headers().firstValue("X-Robots-Tag").orElse("")).contains("noindex");
        assertThat(cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("JSESSIONID")).findFirst().orElseThrow().isHttpOnly()).isTrue();
    }
    private HttpResponse<String> get(HttpClient client, String path) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(5)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> post(HttpClient client, String path, Object body) throws Exception {
        return send(client, path, body, json.readTree(get(client, "/api/admin/auth/csrf").body()));
    }
    private HttpResponse<String> send(HttpClient client, String path, Object body, com.fasterxml.jackson.databind.JsonNode grant) throws Exception {
        return client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).timeout(Duration.ofSeconds(5))
            .header("Content-Type", "application/json").header(grant.path("headerName").asText(), grant.path("token").asText())
            .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    private static String cookieId(CookieManager cookies) {
        return cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("JSESSIONID")).findFirst().orElseThrow().getValue();
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class HttpSessions {
        @Bean Sessions syntheticSessions() { return new Sessions(); }
        @Bean ServletListenerRegistrationBean<Sessions> syntheticSessionListener(Sessions sessions) { return new ServletListenerRegistrationBean<>(sessions); }
    }
    static class Sessions implements HttpSessionListener, HttpSessionIdListener {
        final ConcurrentMap<String,HttpSession> live = new ConcurrentHashMap<>();
        @Override public void sessionCreated(HttpSessionEvent event) { live.put(event.getSession().getId(), event.getSession()); }
        @Override public void sessionDestroyed(HttpSessionEvent event) { live.remove(event.getSession().getId()); }
        @Override public void sessionIdChanged(HttpSessionEvent event, String oldId) { live.remove(oldId); live.put(event.getSession().getId(), event.getSession()); }
    }

    private static MockHttpServletRequest request(MockHttpSession session) {
        var request = new MockHttpServletRequest(); request.setSession(session); return request;
    }

    /** First mutation stays uncommitted while a second connection demonstrably waits on its database lock. */
    private int overlap(Runnable first, Runnable second) throws Exception {
        return overlap(first, second, () -> {});
    }
    private int overlap(Runnable first, Runnable second, Runnable beforeCommit) throws Exception {
        var mutated = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var entered = new CountDownLatch(1);
        var holderId = new AtomicInteger();
        var waiter = new AtomicInteger();
        var executor = Executors.newFixedThreadPool(2);
        Future<?> holder = executor.submit(() -> new TransactionTemplate(manager).executeWithoutResult(status -> {
            holderId.set(jdbc.queryForObject(postgres ? "SELECT pg_backend_pid()" : "SELECT SESSION_ID()", Integer.class));
            first.run(); mutated.countDown(); await(release);
        }));
        Future<Integer> contender = null;
        try {
            assertThat(mutated.await(10, TimeUnit.SECONDS)).as("first mutation reached its uncommitted state").isTrue();
            contender = executor.submit(() -> {
                try {
                    new TransactionTemplate(manager).executeWithoutResult(status -> {
                        waiter.set(jdbc.queryForObject(postgres ? "SELECT pg_backend_pid()" : "SELECT SESSION_ID()", Integer.class));
                        entered.countDown(); second.run();
                    });
                    return 200;
                } catch (ResponseStatusException rejected) { return rejected.getStatusCode().value(); }
            });
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
            boolean blocked = false;
            while (System.nanoTime() < deadline && !contender.isDone()) {
                blocked = postgres
                    ? Boolean.TRUE.equals(jdbc.queryForObject("SELECT ? = ANY(pg_blocking_pids(?))", Boolean.class, holderId.get(), waiter.get()))
                    : jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.sessions WHERE session_id=? AND blocker_id=?", Integer.class, waiter.get(), holderId.get()) > 0;
                if (blocked) break;
                Thread.sleep(10);
            }
            assertThat(blocked).as("independent contender actually waited on the holder's database lock").isTrue();
            beforeCommit.run();
            release.countDown(); holder.get(10, TimeUnit.SECONDS);
            return contender.get(10, TimeUnit.SECONDS);
        } finally {
            release.countDown();
            try { holder.get(12, TimeUnit.SECONDS); }
            finally {
                if (contender != null) try { contender.get(12, TimeUnit.SECONDS); } finally { executor.shutdownNow(); }
                else executor.shutdownNow();
                assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
            }
        }
    }

    private static void await(CountDownLatch latch) {
        try { if (!latch.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Synthetic transaction release timed out"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
    }
    private static void awaitDeadline(long deadline) {
        assertThat(Instant.now().getEpochSecond()).as("challenge is still live when its database lock wait is observed").isLessThan(deadline);
        while (Instant.now().getEpochSecond() < deadline) {
            try { Thread.sleep(10); }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException(interrupted); }
        }
    }
    private int eventCount(String event) { return jdbc.queryForObject("SELECT COUNT(*) FROM team_audit WHERE event=?", Integer.class, event); }
    private String currentCode() throws Exception { return code(vault.decrypt(repository.credentials(principal.id(), false).orElseThrow().encryptedTotp())); }
    private static String invitation(TeamIdentityService.Created created) { return created.invitationPath().substring(created.invitationPath().indexOf("#token=") + 7); }
    private static Authentication token(Object principal, String role) { return UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role))); }
    private static String code(String secret) throws Exception {
        var generator = new TimeBasedOneTimePasswordGenerator();
        return generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm()), Instant.now());
    }
}
