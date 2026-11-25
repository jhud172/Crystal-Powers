package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksGoogleSignIn;
import com.crystalpower.website.service.DocksEmailSignIn;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docks/auth/google")
public class DocksGoogleController {
    private static final String PATH = "/api/docks/auth/google";
    private static final String BROWSER = "__Secure-docks-oauth";
    private static final String TICKET = "__Secure-docks-google-ticket";
    private final DocksGoogleSignIn google;
    private final AttemptLimiter limiter;
    private final DocksEmailSignIn accounts;

    public DocksGoogleController(DocksGoogleSignIn google, AttemptLimiter limiter, DocksEmailSignIn accounts) {
        this.google = google;
        this.limiter = limiter;
        this.accounts = accounts;
    }

    @GetMapping
    public ResponseEntity<Object> available() {
        return response(200).body(Map.of("enabled", google.enabled()));
    }

    @PostMapping("/start")
    public ResponseEntity<Object> start(@RequestHeader(name = "Origin", required = false) String origin, HttpServletRequest request) {
        if (!google.acceptsOrigin(origin)) return response(403).build();
        limiter.check("docks-google-start:" + request.getRemoteAddr(), 12, 900);
        var start = google.start();
        return response(200).header(HttpHeaders.SET_COOKIE, cookie(BROWSER, start.browserToken(), 600, "Lax"))
                .header(HttpHeaders.SET_COOKIE, cookie(TICKET, "", 0, "Strict"))
                .body(Map.of("url", start.authorisation().toString()));
    }

    @GetMapping("/callback")
    public ResponseEntity<Object> callback(@RequestParam(required = false) String state,
            @RequestParam(required = false) String code, @CookieValue(name = BROWSER, required = false) String browser) {
        var ticket = google.complete(state, browser, code);
        var result = response(HttpStatus.SEE_OTHER.value()).location(URI.create("/docks/reports?google="
                + (ticket.isPresent() ? "ready" : "failed")));
        if (ticket.isPresent()) result.header(HttpHeaders.SET_COOKIE, cookie(TICKET, ticket.get(), 120, "Strict"));
        return result.build();
    }

    @PostMapping("/exchange")
    public ResponseEntity<Object> exchange(@RequestHeader(name = "Origin", required = false) String origin,
            @CookieValue(name = TICKET, required = false) String ticket) {
        if (!google.acceptsOrigin(origin)) return response(403).build();
        var session = google.exchange(ticket);
        return response(session.isPresent() ? 200 : 401).header(HttpHeaders.SET_COOKIE, cookie(TICKET, "", 0, "Strict"))
                .body(session.<Object>map(value -> value).orElseGet(() -> Map.of("message", "Google sign-in expired. Try again.")));
    }

    public record DesktopCode(@NotNull @Pattern(regexp = "[A-Za-z0-9_-]{43}") String code) {}

    @PostMapping("/desktop-code")
    public ResponseEntity<Object> desktopCode(@RequestHeader(name = "Authorization", required = false) String token) {
        if (!google.enabled()) return response(404).build();
        return accounts.account(token).map(account -> {
            limiter.check("docks-google-code:" + account, 12, 900);
            return response(200).body((Object) new DesktopCode(google.desktopCode(account)));
        }).orElseGet(() -> response(401).build());
    }

    @PostMapping("/desktop-exchange")
    public ResponseEntity<Object> desktopExchange(@Valid @RequestBody DesktopCode body, HttpServletRequest request) {
        limiter.check("docks-google-desktop:" + request.getRemoteAddr(), 24, 900);
        return google.exchangeDesktop(body.code()).map(value -> response(200).body((Object) value))
                .orElseGet(() -> response(401).body(Map.of("message", "Google sign-in code expired. Request another.")));
    }

    private static String cookie(String name, String token, long maxAge, String sameSite) {
        return ResponseCookie.from(name, token).secure(true).httpOnly(true).sameSite(sameSite)
                .path(PATH).maxAge(maxAge).build().toString();
    }

    private static ResponseEntity.BodyBuilder response(int status) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).header("Referrer-Policy", "no-referrer");
    }
}
