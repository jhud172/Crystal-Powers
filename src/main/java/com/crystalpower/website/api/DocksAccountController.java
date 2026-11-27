package com.crystalpower.website.api;

import com.crystalpower.website.security.AttemptLimiter;
import com.crystalpower.website.service.DocksAccessKeys;
import com.crystalpower.website.service.DocksAccountDeletion;
import com.crystalpower.website.repository.DocksDeviceRepository;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksEntitlements;
import com.crystalpower.website.service.EmailTransport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/docks")
public class DocksAccountController {
    private final DocksEmailSignIn signIn;
    private final DocksDeviceRepository devices;
    private final DocksEntitlements entitlements;
    private final DocksAccessKeys keys;
    private final AttemptLimiter limiter;
    private final DocksAccountDeletion accountDeletion;

    public DocksAccountController(DocksEmailSignIn signIn, DocksDeviceRepository devices,
            DocksEntitlements entitlements, DocksAccessKeys keys, AttemptLimiter limiter,
            DocksAccountDeletion accountDeletion) {
        this.signIn = signIn;
        this.devices = devices;
        this.entitlements = entitlements;
        this.keys = keys;
        this.limiter = limiter;
        this.accountDeletion = accountDeletion;
    }

    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record CodeRequest(@Email @Size(max = 254) String email, String code) {}
    public record DeviceRequest(@NotNull UUID installationId,
                                @NotBlank @Size(max = 120) String label) {}
    public record TrialRequest(@NotNull UUID installationId) {}
    public record RedeemRequest(@NotNull UUID installationId, @NotBlank @Size(max = 24) String code) {}

    @GetMapping("/auth/email")
    public ResponseEntity<?> emailAvailable() {
        return response(200, Map.of("enabled", signIn.available()));
    }

    @PostMapping("/auth/email/request")
    public ResponseEntity<?> request(@Valid @RequestBody EmailRequest request) {
        if (!signIn.available()) return response(503, Map.of("message", "Email sign-in is currently unavailable."));
        try {
            signIn.request(request.email());
            return response(202, Map.of("message", "If a code can be sent, it will arrive by email."));
        } catch (EmailTransport.DeliveryException error) {
            return response(503, Map.of("message", "Email sign-in is currently unavailable."));
        }
    }

    @PostMapping("/auth/email/exchange")
    public ResponseEntity<?> exchange(@Valid @RequestBody CodeRequest request) {
        if (!signIn.available()) return response(503, Map.of("message", "Email sign-in is currently unavailable."));
        String code = request.code();
        // Validate explicitly so rejected code values stay out of validation logs.
        if (code == null || !code.matches("[0-9]{9}|[A-Za-z0-9_-]{43}"))
            return response(400, Map.of("message", "Enter the nine-digit code from your email."));
        if (code.length() == 9 && (request.email() == null || request.email().isBlank()))
            return response(400, Map.of("message", "Enter the email address that requested this code."));
        return signIn.exchange(request.email(), code).map(session -> response(200, session))
                .orElseGet(() -> response(401, Map.of("message", "The code is invalid or expired.")));
    }

    @PostMapping("/auth/sign-out")
    public ResponseEntity<?> signOut(@RequestHeader(name = "Authorization", required = false) String token) {
        signIn.signOut(token);
        return response(204, null);
    }

    @GetMapping("/devices")
    public ResponseEntity<?> list(@RequestHeader(name = "Authorization", required = false) String token) {
        return signIn.account(token).map(account -> response(200, devices.listOwnedBy(account)))
                .orElseGet(DocksAccountController::unauthorised);
    }

    @PostMapping("/devices")
    public ResponseEntity<?> enrol(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody DeviceRequest request) {
        return signIn.account(token).map(account -> response(200,
                devices.enrol(account, request.installationId(), request.label().strip())))
                .orElseGet(DocksAccountController::unauthorised);
    }

    @GetMapping("/entitlement")
    public ResponseEntity<?> entitlement(@RequestHeader(name = "Authorization", required = false) String token,
            @RequestParam UUID installationId) {
        return signIn.account(token).map(account -> entitlements.status(account, installationId)
                .map(status -> response(200, status)).orElseGet(DocksAccountController::unknownDevice))
                .orElseGet(DocksAccountController::unauthorised);
    }

    @PostMapping("/trial")
    public ResponseEntity<?> startTrial(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody TrialRequest request) {
        return signIn.account(token).map(account -> entitlements.startTrial(account, request.installationId())
                .map(status -> response(200, status)).orElseGet(DocksAccountController::unknownDevice))
                .orElseGet(DocksAccountController::unauthorised);
    }

    private static ResponseEntity<Object> unknownDevice() {
        return response(404, Map.of("message", "This installation is not enrolled on your account."));
    }

    @PostMapping("/access-key/redeem")
    public ResponseEntity<?> redeem(@RequestHeader(name = "Authorization", required = false) String token,
            @Valid @RequestBody RedeemRequest request) {
        return signIn.account(token).map(account -> {
            limiter.check("docks-key:" + account, 10, 900);
            return switch (keys.redeem(account, request.installationId(), request.code())) {
                case GRANTED -> response(204, null);
                case NOT_AVAILABLE -> response(422, Map.of("message", "This key is unavailable for this account or device."));
                case DEVICE_LIMIT -> response(409, Map.of("message", "Remove a device before using this key again."));
            };
        }).orElseGet(DocksAccountController::unauthorised);
    }

    @DeleteMapping("/devices/{id}")
    public ResponseEntity<?> remove(@RequestHeader(name = "Authorization", required = false) String token,
            @PathVariable UUID id) {
        return signIn.account(token).map(account -> devices.removeOwnedBy(account, id)
                ? response(204, null) : unknownDevice()).orElseGet(DocksAccountController::unauthorised);
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(@RequestHeader(name = "Authorization", required = false) String token) {
        return signIn.account(token).map(account -> {
            try {
                limiter.check("docks-account-deletion:" + account, 3, 900);
                return switch (accountDeletion.delete(token)) {
                    case DELETED -> response(204, null);
                    case UNAUTHORISED -> unauthorised();
                    case SIGN_IN_AGAIN -> response(403, Map.of("message", "Sign out and sign in again to confirm your identity."));
                    case BILLING_OPEN -> response(409, Map.of("message",
                            "Resolve any open checkout or active Stripe subscription before deleting your account. Contact support if needed."));
                };
            } catch (ResponseStatusException failure) {
                return response(failure.getStatusCode().value(), Map.of("message", failure.getReason() == null
                        ? "Account deletion is temporarily unavailable." : failure.getReason()));
            }
        }).orElseGet(DocksAccountController::unauthorised);
    }

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
