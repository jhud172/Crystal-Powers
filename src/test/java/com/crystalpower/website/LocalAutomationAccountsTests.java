package com.crystalpower.website;
import com.crystalpower.website.security.*;
import com.crystalpower.website.repository.TeamIdentityRepository.Member;
import com.crystalpower.website.repository.TeamRoleProfileRepository;
import com.crystalpower.website.service.TeamRoleResolver;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class LocalAutomationAccountsTests {
 private final UUID workspace=UUID.randomUUID();
 private Member member(String email){return new Member(UUID.randomUUID(),workspace,email,"Codex local",TeamRole.ADMIN,"ACTIVE",1);}
 private MockEnvironment local(){var env=new MockEnvironment();env.setActiveProfiles("local");return env.withProperty("spring.datasource.url","jdbc:h2:file:./.codex-runtime/data/crystal").withProperty("server.address","127.0.0.1").withProperty("app.public-url","http://127.0.0.1:8084");}
 @Test void allowsOnlyLocalLoopbackFileDatabase(){assertTrue(new LocalAutomationAccounts(local()).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void rejectsProductionEvenWithCopiedLocalIdentity(){var env=local();env.setActiveProfiles("production");assertFalse(new LocalAutomationAccounts(env).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void rejectsPostgresEvenWithLocalProfile(){assertFalse(new LocalAutomationAccounts(local().withProperty("spring.datasource.url","jdbc:postgresql://localhost/app")).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void rejectsMemoryDatabase(){assertFalse(new LocalAutomationAccounts(local().withProperty("spring.datasource.url","jdbc:h2:mem:test")).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void rejectsExposedBinding(){assertFalse(new LocalAutomationAccounts(local().withProperty("server.address","0.0.0.0")).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void rejectsRemotePublicOrigin(){assertFalse(new LocalAutomationAccounts(local().withProperty("app.public-url","https://localhost.evil.invalid")).allowed(member(LocalAutomationAccounts.EMAIL)));}
 @Test void doesNotRestrictOrdinaryAccounts(){assertTrue(new LocalAutomationAccounts(new MockEnvironment()).allowed(member("james@example.test")));}
 @Test void restrictsCaseVariants(){assertFalse(new LocalAutomationAccounts(new MockEnvironment()).allowed(member("CODEX@LOCAL.CRYSTAL.INVALID")));}
 @Test void scalarAndBatchResolutionDenyCopiedIdentity(){var profiles=mock(TeamRoleProfileRepository.class);when(profiles.profiles(workspace)).thenReturn(List.of());when(profiles.assignments(workspace)).thenReturn(List.of());var roles=new TeamRoleResolver(profiles,new LocalAutomationAccounts(new MockEnvironment()));var codex=member(LocalAutomationAccounts.EMAIL);assertFalse(roles.usable(codex));assertEquals(Set.of(),roles.permissions(workspace,List.of(codex)).get(codex.id()));assertEquals(TeamRole.ADMIN.permissions(),roles.managementPermissions(codex));}
}
