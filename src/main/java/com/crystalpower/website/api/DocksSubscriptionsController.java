package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksSubscriptions;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

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
    public record Billing(List<DocksSubscriptions.Plan> plans, boolean testMode,
                          DocksSubscriptions.SubscriptionStatus subscription, boolean canManage,
                          Map<DocksSubscriptions.Plan, Integer> pricePence) {}

    @GetMapping("/plans")
    public ResponseEntity<Object> plans(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> {
            var status = subscriptions.latestStatus(account).orElse(null);
            var plans = subscriptions.availablePlans();
            boolean testMode = subscriptions.testMode();
            var pricePence = new EnumMap<DocksSubscriptions.Plan, Integer>(DocksSubscriptions.Plan.class);
            if (!testMode) {
                plans.forEach(plan -> pricePence.put(plan, plan.livePricePence()));
            }
            return response(200, new Billing(plans, testMode, status,
                    status != null && subscriptions.portalConfigured(), pricePence));
        }).orElseGet(DocksSubscriptionsController::unauthorised);
    }

    @PostMapping("/portal")
    public ResponseEntity<Object> portal(@RequestHeader(name = "Authorization", required = false) String token) {
        return auth.account(token).map(account -> {
            limiter.check("docks-portal:" + account, 8, 900);
            return response(200, subscriptions.portal(account));
        }).orElseGet(DocksSubscriptionsController::unauthorised);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Object> rejected(ResponseStatusException failure) {
        return response(failure.getStatusCode().value(), Map.of("message",
                failure.getReason() == null ? "Crystal Docks billing is unavailable." : failure.getReason()));
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
