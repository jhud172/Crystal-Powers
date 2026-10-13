package com.crystalpower.website.api;

import com.crystalpower.website.service.RefundDraftService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/support/requests/{request}/billing/{bill}/refunds")
public class TeamRefundController {
    public record Create(@NotNull UUID submissionKey,@NotBlank @Pattern(regexp="(pi_|ch_)[A-Za-z0-9]+") @Size(max=100) String paymentId,@NotNull @Digits(integer=8,fraction=0) @DecimalMin("1") @DecimalMax("99999999") java.math.BigDecimal amountPence,@NotBlank @Pattern(regexp="requested_by_customer|duplicate|fraudulent") String reason,@NotBlank @Size(max=1000) String note) {}
    public record Revision(@Min(0) int expectedVersion) {}
    public record Confirm(@Min(0) int expectedVersion,@AssertTrue boolean confirmed,boolean sharedAccepted,boolean fraudAccepted) {}
    public record Reconcile(@Min(0) int expectedVersion,@NotBlank @Pattern(regexp="re_[A-Za-z0-9]+") @Size(max=100) String providerId) {}
    private final RefundDraftService refunds;
    private final com.crystalpower.website.service.RefundExecutionService execution;
    public TeamRefundController(RefundDraftService refunds,com.crystalpower.website.service.RefundExecutionService execution) { this.refunds=refunds;this.execution=execution; }
    @GetMapping("/settings") public Object settings(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill) { return refunds.settings(auth,request,bill,execution.enabled()); }
    @PostMapping("/{id}/confirm") public Object confirm(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill,@PathVariable UUID id,@Valid @RequestBody Confirm input) { return execution.confirm(auth,request,bill,id,input.expectedVersion(),input.confirmed(),input.sharedAccepted(),input.fraudAccepted()); }
    @PostMapping("/{id}/reconcile") public Object reconcile(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill,@PathVariable UUID id,@Valid @RequestBody Reconcile input) { return execution.reconcile(auth,request,bill,id,input.expectedVersion(),input.providerId()); }
    @GetMapping public Object page(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill,@RequestParam(required=false) String before) { return refunds.page(auth,request,bill,before); }
    @PostMapping public Object propose(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill,@Valid @RequestBody Create input) { return refunds.propose(auth,request,bill,input.submissionKey(),input.paymentId(),input.amountPence().longValueExact(),input.reason(),input.note()); }
    @PostMapping("/{id}/cancel") public Object cancel(Authentication auth,@PathVariable UUID request,@PathVariable UUID bill,@PathVariable UUID id,@Valid @RequestBody Revision input) { refunds.cancel(auth,request,bill,id,input.expectedVersion());return Map.of("success",true); }
}
