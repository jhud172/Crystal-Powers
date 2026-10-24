import com.crystalpower.website.CrystalPowerApplication;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamRoleProfileRepository;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.*;

/** Offline, explicitly invoked local operator tool. Never compiled into the web application. */
public class LocalCodexAccount {
 public static void main(String[] args) throws Exception {
  if(args.length!=1 || !Set.of("provision","remove").contains(args[0]))throw new IllegalArgumentException("Choose provision or remove.");
  var root=Path.of("").toRealPath();var directory=root.resolve(".codex-runtime/security");Files.createDirectories(directory);
  if(!directory.toRealPath().startsWith(root))throw new IllegalStateException("Credential directory must remain in this workspace.");
  var credential=directory.resolve("codex-local.dpapi");
  try(var context=SpringApplication.run(CrystalPowerApplication.class,"--spring.profiles.active=local","--server.address=127.0.0.1","--server.port=0","--app.public-url=http://127.0.0.1:8084","--spring.config.import=","--app.mail.provider=disabled","--app.mail.invitation-enabled=false","--app.billing.enabled=false","--app.billing.event-recovery-enabled=false","--app.billing.invoice-recovery-enabled=false","--crystal.billing.refunds-enabled=false","--PRISM_AI_ENABLED=false")) {
   var env=context.getEnvironment();
   if(!env.getProperty("spring.datasource.url","").equals("jdbc:h2:file:./.codex-runtime/data/crystal;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE"))throw new IllegalStateException("Only the saved local H2 database is supported.");
   var jdbc=context.getBean(JdbcTemplate.class);var mapper=context.getBean(ObjectMapper.class);
   var owner=jdbc.queryForObject("SELECT id,email,credentials_version FROM admin_account WHERE owner_slot=1",(r,i)->new OwnerPrincipal(r.getObject("id",UUID.class),r.getString("email"),r.getInt("credentials_version")));
   var auth=UsernamePasswordAuthenticationToken.authenticated(owner,null,List.of(new SimpleGrantedAuthority("ROLE_OWNER")));
   var members=context.getBean(TeamMemberService.class);var accounts=context.getBean(TeamIdentityRepository.class);var existing=accounts.credentials(LocalAutomationAccounts.EMAIL);
   if(args[0].equals("remove")) {
    if(existing.isPresent()){var member=existing.get().member();if(member.state().equals("ACTIVE"))members.change(auth,member.id(),member.credentialsVersion(),member.role(),"SUSPENDED");}
    Files.deleteIfExists(credential);System.out.println("LOCAL_CODEX_DISABLED: sessions revoked; audit retained.");return;
   }
   if(existing.isPresent()) {
    var member=existing.get().member();if(!Files.exists(credential)||!member.state().equals("ACTIVE"))throw new IllegalStateException("Existing agent identity needs operator review; no credential reset was performed.");
    System.out.println("LOCAL_CODEX_EXISTS: "+LocalAutomationAccounts.EMAIL);return;
   }
   if(Files.exists(credential))throw new IllegalStateException("A credential file already exists; refusing to overwrite.");
   try {
    new TransactionTemplate(context.getBean(PlatformTransactionManager.class)).execute(status->{
     try {
      var created=members.create(auth,LocalAutomationAccounts.EMAIL,"Codex (local only)",TeamRole.ADMIN);
      var roles=context.getBean(TeamRoleProfileService.class);
      var profile=(TeamRoleProfileRepository.Profile)roles.create(auth,"Codex local publisher",TeamRole.ADMIN,Set.of(TeamPermission.READ_CHANNELS,TeamPermission.EDIT_PROJECTS,TeamPermission.PUBLISH_PROJECTS));
      roles.assign(auth,created.member().id(),created.member().credentialsVersion(),profile.id());
      byte[] random=new byte[32];new SecureRandom().nextBytes(random);String password=Base64.getUrlEncoder().withoutPadding().encodeToString(random)+"!Cp9";
      String token=created.invitationPath().substring(created.invitationPath().indexOf("#token=")+7);
      context.getBean(TeamIdentityService.class).activate(token,password);
      var member=accounts.credentials(created.member().id(),false).orElseThrow().member();
      String secret=context.getBean(TeamAuthenticationService.class).setup(member.id(),member.credentialsVersion());
      String json=mapper.writeValueAsString(Map.of("email",LocalAutomationAccounts.EMAIL,"password",password,"secret",secret,"memberId",member.id(),"workspace",root.toString(),"origin","http://127.0.0.1:8084"));
      var protector=new ProcessBuilder("powershell.exe","-NoProfile","-NonInteractive","-Command","Add-Type -AssemblyName System.Security; $data=[Text.Encoding]::UTF8.GetBytes([Console]::In.ReadToEnd()); [Convert]::ToBase64String([Security.Cryptography.ProtectedData]::Protect($data,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser))").start();
      try(var input=protector.getOutputStream()){input.write(json.getBytes(StandardCharsets.UTF_8));}
      String protectedBytes=new String(protector.getInputStream().readAllBytes(),StandardCharsets.US_ASCII).trim();
      if(protector.waitFor()!=0||protectedBytes.isEmpty())throw new IllegalStateException("Windows credential protection failed.");
      Files.write(credential,Base64.getDecoder().decode(protectedBytes),StandardOpenOption.CREATE_NEW);
      return null;
     }catch(Exception failure){throw new IllegalStateException("Local account provisioning failed; no credentials were printed.",failure);}
    });
   }catch(RuntimeException failure){Files.deleteIfExists(credential);throw failure;}
   System.out.println("LOCAL_CODEX_PROVISIONED: "+LocalAutomationAccounts.EMAIL+"; MFA ready; portfolio-only role; Windows-user-encrypted credentials.");
  }
 }
}
