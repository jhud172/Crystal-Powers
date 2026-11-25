package com.crystalpower.website.api;

import com.crystalpower.website.repository.DocksDeviceRepository;
import com.crystalpower.website.service.DocksEmailSignIn;
import com.crystalpower.website.service.DocksEntitlements;
import com.crystalpower.website.service.EmailTransport;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/docks")
public class DocksAccountController {
    private final DocksEmailSignIn signIn;
    private final DocksDeviceRepository devices;
    private final DocksEntitlements entitlements;

    public DocksAccountController(DocksEmailSignIn signIn, DocksDeviceRepository devices,
            DocksEntitlements entitlements) {
        this.signIn = signIn;
        this.devices = devices;
        this.entitlements = entitlements;
    }

    public record EmailRequest(@NotBlank @Email @Size(max = 254) String email) {}
    public record CodeRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String code) {}
    public record DeviceRequest(@NotNull UUID installationId,
                                @NotBlank @Size(max = 120) String label) {}
    public record TrialRequest(@NotNull UUID installationId) {}

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
        return signIn.exchange(request.code()).map(session -> response(200, session))
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

    private static ResponseEntity<Object> unauthorised() {
        return response(401, Map.of("message", "Sign in to Crystal Docks."));
    }

    private static ResponseEntity<Object> response(int status, Object body) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(body);
    }
}
