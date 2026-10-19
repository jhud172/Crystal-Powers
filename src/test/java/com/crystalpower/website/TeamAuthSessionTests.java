package com.crystalpower.website;

import com.crystalpower.website.api.TeamAuthController;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.TeamPrincipal;
import com.crystalpower.website.security.TeamRole;
import com.crystalpower.website.service.TeamAccessService;
import com.crystalpower.website.service.TeamAuthenticationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;
import java.util.concurrent.*;
import java.util.function.Consumer;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Controlled asynchronous servlet boundaries; real credentials/database locks are tested separately. */
class TeamAuthSessionTests {
    private TeamAuthenticationService teams;
    private TeamAuthController controller;
    private TeamPrincipal principal;

    @BeforeEach void syntheticBoundary() {
        teams = mock(TeamAuthenticationService.class);
        var credentials = mock(TeamIdentityRepository.Credentials.class);
        var member = mock(TeamIdentityRepository.Member.class);
        principal = new TeamPrincipal(UUID.randomUUID(), UUID.randomUUID(), "boundary@example.invalid", "Synthetic boundary", TeamRole.MEMBER, 1);
        when(credentials.member()).thenReturn(member);
        when(member.id()).thenReturn(principal.id());
        when(member.credentialsVersion()).thenReturn(1);
        when(teams.password(anyString(), anyString())).thenReturn(credentials);
        when(teams.current(any(UUID.class), anyInt(), eq(false))).thenReturn(credentials);
        when(teams.verify(any(UUID.class), anyInt(), anyString(), anyLong())).thenReturn(principal);
        controller = controller(new HttpSessionSecurityContextRepository());
    }
    @AfterEach void clearThreadContext() { SecurityContextHolder.clearContext(); }

    @Test void passwordResultArrivingAfterLogoutCannotCreateAnotherSession() throws Exception {
        latePassword(request -> controller.logout(request));
    }

    @Test void passwordResultArrivingAfterANewerLoginCannotReplaceItsSession() throws Exception {
        latePassword(request -> {
            controller.login(new TeamAuthController.Login("new@example.invalid", "synthetic-password"), request, new MockHttpServletResponse());
            assertThat(request.getSession(false).getAttribute("crystal.team.pending")).isNotNull();
        });
    }

    @Test void contextRepositoryCannotAllocateAfterExternalInvalidation() {
        var login = new MockHttpServletRequest();
        controller.login(new TeamAuthController.Login("boundary@example.invalid", "synthetic-password"), login, new MockHttpServletResponse());
        var expected = (MockHttpSession) login.getSession(false);
        controller = controller(new HttpSessionSecurityContextRepository() {
            @Override public void saveContext(SecurityContext context, HttpServletRequest request, HttpServletResponse response) {
                expected.invalidate(); // Represents expiry or an unrelated session invalidator during publication.
                super.saveContext(context, request, response);
            }
        });
        var verify = request(expected);
        assertThatThrownBy(() -> controller.verify(new TeamAuthController.Code("123456"), verify, new MockHttpServletResponse()))
            .isInstanceOfSatisfying(ResponseStatusException.class, failure -> assertThat(failure.getStatusCode().value()).isEqualTo(401));
        assertThat(verify.getSession(false)).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private void latePassword(Consumer<MockHttpServletRequest> replacement) throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        var credentials = teams.password("initial@example.invalid", "synthetic-password");
        when(teams.password(eq("late@example.invalid"), anyString())).thenAnswer(call -> {
            entered.countDown();
            assertThat(release.await(5, TimeUnit.SECONDS)).isTrue();
            return credentials;
        });
        var original = new MockHttpSession();
        var late = request(original);
        var current = request(original);
        var executor = Executors.newSingleThreadExecutor();
        try {
            Future<Integer> status = executor.submit(() -> {
                try {
                    controller.login(new TeamAuthController.Login("late@example.invalid", "synthetic-password"), late, new MockHttpServletResponse());
                    return 200;
                } catch (ResponseStatusException rejected) { return rejected.getStatusCode().value(); }
                finally { SecurityContextHolder.clearContext(); }
            });
            assertThat(entered.await(3, TimeUnit.SECONDS)).isTrue();
            replacement.accept(current); release.countDown();
            assertThat(status.get(5, TimeUnit.SECONDS)).isEqualTo(401);
            assertThat(late.getSession(false)).isNull();
            assertThat(original.isInvalid()).isTrue();
            if (current.getSession(false) != null) {
                assertThat(current.getSession(false).getAttribute("crystal.team.pending")).isNotNull();
                assertThat(current.getSession(false).getAttribute("SPRING_SECURITY_CONTEXT")).isNull();
            }
        } finally {
            release.countDown(); executor.shutdownNow();
            assertThat(executor.awaitTermination(5, TimeUnit.SECONDS)).isTrue();
        }
    }
    private TeamAuthController controller(HttpSessionSecurityContextRepository contexts) {
        return new TeamAuthController(teams, new AttemptLimiter(), contexts, new HttpSessionCsrfTokenRepository(), mock(TeamAccessService.class));
    }
    private static MockHttpServletRequest request(MockHttpSession session) {
        var request = new MockHttpServletRequest(); request.setSession(session); return request;
    }
}
