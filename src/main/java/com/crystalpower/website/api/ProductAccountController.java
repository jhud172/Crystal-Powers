package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.security.ClientPrincipal;
import com.crystalpower.website.service.ClientAccessService;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.ProductAccountLinks;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/client/auth/product-link")
public class ProductAccountController {
    private final DocksEmailSignIn docks;
    private final ClientAccessService clients;
    private final ClientAuthController sessions;
    private final ProductAccountLinks links;
    private final AttemptLimiter limiter;

    public ProductAccountController(DocksEmailSignIn docks, ClientAccessService clients,
            ClientAuthController sessions, ProductAccountLinks links, AttemptLimiter limiter) {
        this.docks = docks;
        this.clients = clients;
        this.sessions = sessions;
        this.links = links;
        this.limiter = limiter;
    }

    @GetMapping
    public Object status(@RequestHeader(name = "Authorization", required = false) String authorization) {
        return Map.of("connected", links.client(grant(authorization)).isPresent());
    }

    @PostMapping
    public Object link(@RequestHeader(name = "Authorization", required = false) String authorization,
            @Valid @RequestBody ClientAuthController.Login credentials, HttpServletRequest request) {
        String grant = grant(authorization);
        limiter.check("client-product-link:" + request.getRemoteAddr(), 10, 900);
        links.link(grant, clients.login(credentials.email(), credentials.password()));
        return Map.of("connected", true);
    }

    @PostMapping("/open")
    public Object open(@RequestHeader(name = "Authorization", required = false) String authorization,
            Authentication current, HttpServletRequest request, HttpServletResponse response) {
        var previous = request.getSession(true);
        String grant = grant(authorization);
        ClientPrincipal client = links.client(grant).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "Link your client workspace first."));
        if (current != null && current.isAuthenticated() && !(current.getPrincipal() instanceof ClientPrincipal)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Open the dashboard in a separate browser profile to keep your staff session.");
        }
        return sessions.signIn(previous, client, grant, request, response);
    }

    @DeleteMapping
    public Object unlink(@RequestHeader(name = "Authorization", required = false) String authorization) {
        links.unlink(grant(authorization));
        return Map.of("connected", false);
    }

    private String grant(String authorization) {
        return docks.browserGrant(authorization).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to the product dashboard again."));
    }
}
