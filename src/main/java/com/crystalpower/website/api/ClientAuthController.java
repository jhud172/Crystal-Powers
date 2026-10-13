package com.crystalpower.website.api;

import com.crystalpower.website.security.*;
import com.crystalpower.website.service.ClientAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/client/auth")
public class ClientAuthController {
    public record Login(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=72) String password) {}
    public record Activate(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,@NotBlank @Size(min=12,max=72) String password) {}
    public record Preferences(@Min(0) int version,@NotBlank @Pattern(regexp="PORTAL_ONLY|PORTAL_AND_EMAIL") String contactPreference) {}
    public record Password(@NotBlank @Size(max=72) String currentPassword,@NotBlank @Size(min=12,max=72) String password) {}
    private final ClientAccessService clients;
    private final AttemptLimiter limiter;
    private final HttpSessionSecurityContextRepository contexts;
    private final HttpSessionCsrfTokenRepository csrf;
    public ClientAuthController(ClientAccessService clients,AttemptLimiter limiter,HttpSessionSecurityContextRepository contexts,HttpSessionCsrfTokenRepository csrf) { this.clients=clients; this.limiter=limiter; this.contexts=contexts; this.csrf=csrf; }
    @GetMapping("/csrf") public Object csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/session") public Object session(Authentication auth) { if(auth!=null && auth.getPrincipal() instanceof ClientPrincipal) return Map.of("authenticated",true,"client",clients.resolve(auth)); return Map.of("authenticated",false); }
    @PostMapping("/activate") public Object activate(@Valid @RequestBody Activate body,HttpServletRequest request) { limiter.check("client-activate:"+request.getRemoteAddr(),10,900); clients.activate(body.token(),body.password()); return Map.of("success",true); }
    @PostMapping("/login") public Object login(@Valid @RequestBody Login body,HttpServletRequest request,HttpServletResponse response) {
        limiter.check("client-login:"+request.getRemoteAddr(),10,900); var principal=clients.login(body.email(),body.password());
        var previous=request.getSession(false); if(previous!=null) previous.invalidate(); request.getSession(true);
        var context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of(new SimpleGrantedAuthority("ROLE_CLIENT"))));
        SecurityContextHolder.setContext(context); contexts.saveContext(context,request,response); csrf.saveToken(null,request,response); return Map.of("authenticated",true,"client",principal);
    }
    @PostMapping("/logout") public Object logout(HttpServletRequest request) { var session=request.getSession(false); if(session!=null) session.invalidate(); SecurityContextHolder.clearContext(); return Map.of("success",true); }
    @GetMapping("/preferences") public Object preferences(Authentication auth) { return clients.preferences(auth); }
    @PatchMapping("/preferences") public Object preferences(Authentication auth,@Valid @RequestBody Preferences body,HttpServletRequest request) { limiter.check("client-preferences:"+request.getRemoteAddr(),30,60); return clients.preferences(auth,body.version(),body.contactPreference()); }
    @PostMapping("/password") public Object password(Authentication auth,@Valid @RequestBody Password body,HttpServletRequest request) { limiter.check("client-password:"+request.getRemoteAddr(),10,900); clients.changePassword(auth,body.currentPassword(),body.password()); return logout(request); }
}
