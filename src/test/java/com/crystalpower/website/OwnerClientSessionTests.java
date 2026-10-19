package com.crystalpower.website;

import com.crystalpower.website.api.*;
import com.crystalpower.website.repository.OwnerRepository.Owner;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Controlled servlet interleavings; cryptography and database deadlines have separate integration proof. */
class OwnerClientSessionTests {
    private final OwnerService owners = mock(OwnerService.class);
    private final ClientAccessService clients = mock(ClientAccessService.class);
    private final Owner owner = new Owner(UUID.randomUUID(), "owner@example.invalid", "synthetic-hash", "synthetic-encrypted-key", true, -1, 1);
    private final ClientPrincipal client = new ClientPrincipal(UUID.randomUUID(), UUID.randomUUID(), "Synthetic client", 1);
    private OwnerAuthController ownerAuth;
    private ClientAuthController clientAuth;

    @BeforeEach void boundary() {
        var contexts = new HttpSessionSecurityContextRepository();
        var csrf = new HttpSessionCsrfTokenRepository();
        ownerAuth = new OwnerAuthController(owners, new AttemptLimiter(), contexts, csrf);
        clientAuth = new ClientAuthController(clients, new AttemptLimiter(), contexts, csrf);
        when(owners.password(anyString(), anyString())).thenReturn(owner);
        when(owners.owner(owner.id())).thenReturn(owner);
        when(clients.login(anyString(), anyString())).thenReturn(client);
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void ownerPasswordResultCannotRestoreLogout() {
        var original = new MockHttpSession(); var late = request(original);
        when(owners.password(eq("late@example.invalid"), anyString())).thenAnswer(call -> { ownerAuth.logout(request(original), new MockHttpServletResponse()); return owner; });
        ended(() -> ownerAuth.login(new OwnerAuthController.Login("late@example.invalid", "synthetic-password"), late, new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void ownerPasswordResultCannotReplaceNewerLogin() {
        var original = new MockHttpSession(); var late = request(original); var newer = request(original);
        when(owners.password(eq("late@example.invalid"), anyString())).thenAnswer(call -> { ownerAuth.login(new OwnerAuthController.Login("new@example.invalid", "synthetic-password"), newer, new MockHttpServletResponse()); return owner; });
        ended(() -> ownerAuth.login(new OwnerAuthController.Login("late@example.invalid", "synthetic-password"), late, new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
        assertThat(newer.getSession(false).getAttribute("crystal.pending-owner")).isNotNull();
    }
    @Test void ownerMfaResultCannotRestoreLogoutOrReturnRecoveryCodes() {
        var login = new MockHttpServletRequest();
        ownerAuth.login(new OwnerAuthController.Login(owner.email(), "synthetic-password"), login, new MockHttpServletResponse());
        var original = (MockHttpSession) login.getSession(false); var late = request(original);
        when(owners.verify(eq(owner.id()), eq(1), anyString(), anyLong())).thenAnswer(call -> {
            ownerAuth.logout(request(original), new MockHttpServletResponse());
            return new OwnerService.Verification(new OwnerPrincipal(owner.id(), owner.email(), 1), List.of("synthetic-private-recovery-code"));
        });
        ended(() -> ownerAuth.verify(new OwnerAuthController.Code("123456"), late, new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void ownerEnrolmentResultCannotReturnKeyAfterLogout() {
        var pendingOwner = new Owner(owner.id(), owner.email(), owner.passwordHash(), owner.encryptedTotp(), false, -1, 1);
        when(owners.password(anyString(), anyString())).thenReturn(pendingOwner);
        when(owners.owner(owner.id())).thenReturn(pendingOwner);
        var login = new MockHttpServletRequest();
        ownerAuth.login(new OwnerAuthController.Login(owner.email(), "synthetic-password"), login, new MockHttpServletResponse());
        var original = (MockHttpSession) login.getSession(false); var late = request(original);
        when(owners.enrolmentSecret(eq(owner.id()), eq(1), anyLong())).thenAnswer(call -> { ownerAuth.logout(request(original), new MockHttpServletResponse()); return "A".repeat(32); });
        ended(() -> ownerAuth.enrolment(late));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void clientPasswordResultCannotRestoreLogout() {
        var original = new MockHttpSession(); var late = request(original);
        when(clients.login(eq("late@example.invalid"), anyString())).thenAnswer(call -> { clientAuth.logout(request(original)); return client; });
        ended(() -> clientAuth.login(new ClientAuthController.Login("late@example.invalid", "synthetic-password"), late, new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void clientPasswordResultCannotReplaceNewerLogin() {
        var original = new MockHttpSession(); var late = request(original); var newer = request(original);
        when(clients.login(eq("late@example.invalid"), anyString())).thenAnswer(call -> { clientAuth.login(new ClientAuthController.Login("new@example.invalid", "synthetic-password"), newer, new MockHttpServletResponse()); return client; });
        ended(() -> clientAuth.login(new ClientAuthController.Login("late@example.invalid", "synthetic-password"), late, new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
        assertThat(newer.getSession(false).getAttribute("SPRING_SECURITY_CONTEXT")).isNotNull();
    }
    @Test void ownerSetupResultCannotRestoreLogout() {
        var original = new MockHttpSession(); var late = request(original);
        when(owners.setup(anyString(), anyString(), anyString())).thenAnswer(call -> { clientAuth.logout(request(original)); return owner; });
        ended(() -> ownerAuth.setup(new OwnerAuthController.Setup("synthetic-token",owner.email(),"synthetic-password"),late,new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void ownerMfaCannotSurviveClientLogoutOnTheSameSession() {
        var login = new MockHttpServletRequest();
        ownerAuth.login(new OwnerAuthController.Login(owner.email(), "synthetic-password"),login,new MockHttpServletResponse());
        var original = (MockHttpSession)login.getSession(false); var late = request(original);
        when(owners.verify(eq(owner.id()),eq(1),anyString(),anyLong())).thenAnswer(call -> {
            clientAuth.logout(request(original));
            return new OwnerService.Verification(new OwnerPrincipal(owner.id(),owner.email(),1),List.of());
        });
        ended(() -> ownerAuth.verify(new OwnerAuthController.Code("123456"),late,new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void clientPasswordCannotSurviveOwnerLogoutOnTheSameSession() {
        var original = new MockHttpSession(); var late = request(original);
        when(clients.login(anyString(),anyString())).thenAnswer(call -> { ownerAuth.logout(request(original),new MockHttpServletResponse()); return client; });
        ended(() -> clientAuth.login(new ClientAuthController.Login("late@example.invalid","synthetic-password"),late,new MockHttpServletResponse()));
        assertThat(late.getSession(false)).isNull();
    }
    @Test void revokedOwnerChallengeReturnsCleanSignedOutStatus() {
        var login = new MockHttpServletRequest();
        ownerAuth.login(new OwnerAuthController.Login(owner.email(),"synthetic-password"),login,new MockHttpServletResponse());
        when(owners.owner(owner.id())).thenReturn(new Owner(owner.id(),owner.email(),owner.passwordHash(),owner.encryptedTotp(),true,-1,2));
        var state = ownerAuth.session(null,login);
        assertThat(state.get("authenticated")).isEqualTo(false);
        assertThat(state.get("mfaRequired")).isEqualTo(false);
        assertThat(login.getSession(false).getAttribute("crystal.pending-owner")).isNull();
    }
    @Test void clientContextPublicationCannotAllocateAfterExternalInvalidation() {
        clientAuth = new ClientAuthController(clients,new AttemptLimiter(),invalidatingRepository(),new HttpSessionCsrfTokenRepository());
        var request = new MockHttpServletRequest();
        ended(() -> clientAuth.login(new ClientAuthController.Login("client@example.invalid","synthetic-password"),request,new MockHttpServletResponse()));
        assertThat(request.getSession(false)).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
    @Test void ownerContextPublicationCannotAllocateAfterExternalInvalidation() {
        ownerAuth = new OwnerAuthController(owners,new AttemptLimiter(),invalidatingRepository(),new HttpSessionCsrfTokenRepository());
        var request = new MockHttpServletRequest();
        ownerAuth.login(new OwnerAuthController.Login(owner.email(),"synthetic-password"),request,new MockHttpServletResponse());
        when(owners.verify(eq(owner.id()),eq(1),anyString(),anyLong())).thenReturn(new OwnerService.Verification(new OwnerPrincipal(owner.id(),owner.email(),1),List.of()));
        ended(() -> ownerAuth.verify(new OwnerAuthController.Code("123456"),request,new MockHttpServletResponse()));
        assertThat(request.getSession(false)).isNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
    private static HttpSessionSecurityContextRepository invalidatingRepository() {
        return new HttpSessionSecurityContextRepository() {
            @Override public void saveContext(org.springframework.security.core.context.SecurityContext context,jakarta.servlet.http.HttpServletRequest request,jakarta.servlet.http.HttpServletResponse response) {
                request.getSession(false).invalidate(); super.saveContext(context,request,response);
            }
        };
    }
    private static void ended(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOfSatisfying(ResponseStatusException.class, failure -> assertThat(failure.getStatusCode().value()).isEqualTo(401));
    }
    private static MockHttpServletRequest request(MockHttpSession session) { var request = new MockHttpServletRequest(); request.setSession(session); return request; }
}
