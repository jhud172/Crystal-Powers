package com.crystalpower.website.api;

import com.crystalpower.website.service.BillingDraftService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/support/requests/{request}/billing")
public class TeamBillingController {
    public record Create(@NotNull UUID submissionKey, @NotBlank @Pattern(regexp="FULL|DEPOSIT|BALANCE|MONTHLY") String purpose, @NotBlank @Size(max=200) String title, @NotNull @Digits(integer=8, fraction=0) @DecimalMin("1") @DecimalMax("99999999") java.math.BigDecimal amountPence, @NotBlank @Size(max=3000) String terms) {}
    public record Reconcile(@NotBlank @Pattern(regexp="cs_(test_|live_)?[A-Za-z0-9]+") @Size(max=100) String sessionId) {}
    private final com.crystalpower.website.service.BillingHistoryService history;
    private final com.crystalpower.website.service.BillingLedgerService ledger;
    private final com.crystalpower.website.service.BillingInvoiceStore invoices;
    private final com.crystalpower.website.service.BillingInvoiceService invoiceImport;
    private final BillingDraftService billing;
    private final com.crystalpower.website.service.BillingWithdrawalService withdrawal;
    public TeamBillingController(BillingDraftService billing,com.crystalpower.website.service.BillingWithdrawalService withdrawal,com.crystalpower.website.service.BillingHistoryService history,com.crystalpower.website.service.BillingLedgerService ledger,com.crystalpower.website.service.BillingInvoiceStore invoices,com.crystalpower.website.service.BillingInvoiceService invoiceImport) { this.billing = billing;this.withdrawal=withdrawal;this.history=history;this.ledger=ledger;this.invoices=invoices;this.invoiceImport=invoiceImport; }
    public record Revision(@Min(0) int expectedVersion) {}
    @GetMapping("/{id}/invoices") public Object invoices(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@RequestParam(defaultValue="JOBS") String kind,@RequestParam(required=false) String after){return invoices.page(auth,request,id,kind,after);}
    @PostMapping("/{id}/invoices/{invoice}/restart") public Object restartInvoice(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@PathVariable String invoice,@Valid @RequestBody Revision input){return invoices.restart(auth,request,id,invoice,input.expectedVersion());}
    @PostMapping("/{id}/invoices/{invoice}/continue") public Object continueInvoice(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@PathVariable String invoice,@Valid @RequestBody Revision input){return invoiceImport.continuePage(auth,request,id,invoice,input.expectedVersion());}
    @GetMapping("/{id}/records") public Object records(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@RequestParam(defaultValue="PAYMENTS") String kind,@RequestParam(required=false) String after){return ledger.page(auth,request,id,kind,after);}
    @GetMapping("/{id}/history") public Object history(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@RequestParam(required=false) String before){return history.page(auth,request,id,before);}
    @GetMapping public Object list(Authentication auth, @PathVariable UUID request) { return billing.list(auth, request); }
    public record RefundRecovery(@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Size(max=50) java.util.List<@jakarta.validation.constraints.NotNull UUID> billIds) {}
    @PostMapping("/refund-form-recovery") public Object recoverRefundForms(Authentication auth,@PathVariable UUID request,@Valid @RequestBody RefundRecovery input) { return billing.recoverRefundForms(auth,request,input.billIds()); }
    @GetMapping("/page") public Object page(Authentication auth,@PathVariable UUID request,@RequestParam(required=false) String before) { return billing.page(auth,request,before); }
    @GetMapping("/settings") public Object settings(Authentication auth,@PathVariable UUID request) { return billing.settings(auth,request); }
    @PostMapping("/{id}/issue") public Object issue(Authentication auth,@PathVariable UUID request,@PathVariable UUID id) { return billing.issue(auth,request,id); }
    @PostMapping("/{id}/withdraw") public Object withdraw(Authentication auth,@PathVariable UUID request,@PathVariable UUID id) { withdrawal.withdraw(auth,request,id); return Map.of("success",true); }
    @PostMapping("/{id}/reconcile") public Object reconcile(Authentication auth,@PathVariable UUID request,@PathVariable UUID id,@Valid @RequestBody Reconcile input) { return billing.reconcile(auth,request,id,input.sessionId()); }
    @PostMapping public Object create(Authentication auth, @PathVariable UUID request, @Valid @RequestBody Create body) { return billing.create(auth, request, body.submissionKey(), body.purpose(), body.title(), body.amountPence().longValueExact(), body.terms()); }
    @PostMapping("/{id}/cancel") public Object cancel(Authentication auth, @PathVariable UUID request, @PathVariable UUID id) { billing.cancel(auth, request, id); return Map.of("success", true); }
}
