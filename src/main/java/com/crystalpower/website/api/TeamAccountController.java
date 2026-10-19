package com.crystalpower.website.api;

import com.crystalpower.website.service.TeamAccountService;
import com.crystalpower.website.security.AttemptLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.io.Serializable;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/account")
public class TeamAccountController {
    public record Proof(@NotBlank @Size(max=256) String password,@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    public record Password(@NotBlank @Size(max=256) String password,@NotBlank @Pattern(regexp="[0-9]{6}") String code,@NotBlank @Size(max=256) String nextPassword) {}
    public record Code(@NotBlank @Pattern(regexp="[0-9]{6}") String code) {}
    private record Pending(UUID account,int version,String encryptedSecret,long expires) implements Serializable {}
    private static final String PENDING="crystal.team.authenticator-replacement";
    private final TeamAccountService accounts;
    private final AttemptLimiter limiter;
    public TeamAccountController(TeamAccountService accounts,AttemptLimiter limiter){this.accounts=accounts;this.limiter=limiter;}
    private void limit(Authentication auth){limiter.check("team-account-security:"+accounts.principal(auth).id(),10,900);}
    @PostMapping("/password") public Object password(Authentication auth,@Valid @RequestBody Password input,HttpServletRequest request){
        limit(auth);var session=request.getSession();
        synchronized(session){accounts.password(auth,input.password(),input.code(),input.nextPassword());signOut(session);}
        return Map.of("message","Password changed. Sign in again with your new password. All previous team sessions have ended.");
    }
    @PostMapping("/sessions/revoke") public Object sessions(Authentication auth,@Valid @RequestBody Proof input,HttpServletRequest request){
        limit(auth);var session=request.getSession();
        synchronized(session){accounts.sessions(auth,input.password(),input.code());signOut(session);}
        return Map.of("message","All previous team sessions have ended. Sign in again to continue.");
    }
    @PostMapping("/authenticator") public Object begin(Authentication auth,@Valid @RequestBody Proof input,HttpServletRequest request){
        limit(auth);var principal=accounts.principal(auth);var session=request.getSession();
        synchronized(session){
            var setup=accounts.beginAuthenticator(auth,input.password(),input.code());
            try{session.setAttribute(PENDING,new Pending(principal.id(),principal.credentialsVersion(),setup.encryptedSecret(),Instant.now().getEpochSecond()+300));}
            catch(IllegalStateException ended){throw endedSession();}
            return Map.of("secret",setup.secret());
        }
    }
    @PostMapping("/authenticator/confirm") public Object confirm(Authentication auth,@Valid @RequestBody Code input,HttpServletRequest request){
        limit(auth);var principal=accounts.principal(auth);var session=request.getSession(false);
        if(session==null)throw expiredSetup();
        synchronized(session){
            Object value;try{value=session.getAttribute(PENDING);}catch(IllegalStateException ended){throw endedSession();}
            if(!(value instanceof Pending pending) || !pending.account().equals(principal.id()) || pending.version()!=principal.credentialsVersion() || pending.expires()<=Instant.now().getEpochSecond())throw expiredSetup();
            accounts.confirmAuthenticator(auth,pending.encryptedSecret(),input.code(),pending.expires());signOut(session);
            return Map.of("message","Authenticator replaced. Sign in again with your new authenticator. All previous team sessions have ended.");
        }
    }
    @PostMapping("/authenticator/cancel") public Object cancel(Authentication auth,HttpServletRequest request){
        accounts.principal(auth);var session=request.getSession(false);
        if(session!=null)synchronized(session){try{session.removeAttribute(PENDING);}catch(IllegalStateException ended){throw endedSession();}}
        return Map.of("message","New authenticator setup cancelled. Your existing authenticator remains active.");
    }
    private void signOut(HttpSession session){try{session.invalidate();}catch(IllegalStateException alreadyEnded){/* A concurrent logout already ended this session. */}SecurityContextHolder.clearContext();}
    private static ResponseStatusException expiredSetup(){return new ResponseStatusException(HttpStatus.BAD_REQUEST,"Authenticator setup has expired or belongs to another account. Cancel it and start again.");}
    private static ResponseStatusException endedSession(){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Your session has ended. Sign in again before changing security.");}
}
