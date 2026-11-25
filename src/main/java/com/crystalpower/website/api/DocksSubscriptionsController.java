package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksSubscriptions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docks/billing")
public class DocksSubscriptionsController {
    private final DocksEmailSignIn auth;
    private final DocksSubscriptions subscriptions;
    private final AttemptLimiter limiter;

    public DocksSubscriptionsController(DocksEmailSignIn auth, DocksSubscriptions subscriptions, AttemptLimiter limiter) {
        this.auth = auth;
        this.subscriptions = subscriptions;
        this.limiter = limiter;
    }

    public record Choice(@NotNull DocksSubscriptions.Plan plan) {}

    @GetMapping("/plans")
    public ResponseEntity<Object> plans(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> response(200, Map.of(
                        "plans", subscriptions.availablePlans(), "testMode", true)))
                .orElseGet(DocksSubscriptionsController::unauthorised);
    }

    @PostMapping("/checkout")
    public ResponseEntity<Object> checkout(@Valid @RequestBody Choice choice,
            @RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> {
            limiter.check("docks-billing:" + account, 8, 900);
            return response(200, subscriptions.checkout(account, choice.plan()));
        }).orElseGet(DocksSubscriptionsController::unauthorised);
    }

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
