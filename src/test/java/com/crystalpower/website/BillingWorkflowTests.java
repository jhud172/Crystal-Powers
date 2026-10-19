package com.crystalpower.website;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.spec.SecretKeySpec;
import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real local service/repository/HTTP contracts; Stripe IO is explicitly synthetic, never a real charge. */
@SpringBootTest(properties={
    "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-billing-tests;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1}",
    "app.owner.setup-token=synthetic-billing-logic-setup-2026"
})
@AutoConfigureMockMvc
@Transactional
class BillingWorkflowTests {
    private static final String PASSWORD="Synthetic-billing-client-password-2026";
    @Autowired DataSource dataSource;
    @Autowired OwnerService owners;
    @Autowired TeamIdentityService identities;
    @Autowired ClientAccessService clients;
    @Autowired SupportRepository requests;
    @Autowired BillingRepository bills;
    @Autowired BillingFlowRepository flow;
    @Autowired BillingDraftService drafts;
    @Autowired BillingCheckoutStore checkoutStore;
    @Autowired BillingCheckoutService checkout;
    @Autowired BillingEventStore eventStore;
    @Autowired BillingEventProcessor eventProcessor;
    @Autowired BillingEventRecoveryService eventRecovery;
    @Autowired BillingLedgerService ledger;
    @Autowired RefundDraftService refunds;
    @Autowired BillingLedgerRepository ledgerRows;
    @Autowired BillingInvoiceRepository invoiceRows;
    @Autowired BillingInvoiceStore invoiceStore;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean StripeGateway stripe;
    private Authentication root,client;
    private ClientPrincipal principal;
    private UUID workspace,request;
    private JdbcTemplate jdbc;

    @BeforeEach void syntheticFixture() throws Exception {
        try(var connection=dataSource.getConnection()){
            String product=connection.getMetaData().getDatabaseProductName();
            if(product.equals("PostgreSQL")){
                assertThat(connection.getMetaData().getURL()).matches("jdbc:postgresql://127\\.0\\.0\\.1:55432/crystal_rebuild_test[a-z0-9_]*");
                assertThat(org.springframework.transaction.support.TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
                new JdbcTemplate(dataSource).execute("TRUNCATE TABLE public.admin_account CASCADE");
            }else assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:crystal-billing-tests");
        }
        jdbc=new JdbcTemplate(dataSource);
        var owner=owners.setup("synthetic-billing-logic-setup-2026","billing-root@example.invalid",PASSWORD);
        var generator=new TimeBasedOneTimePasswordGenerator();
        String proof=generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(owners.enrolmentSecret(owner.id())),generator.getAlgorithm()),Instant.now());
        root=token(owners.verify(owner.id(),owner.credentialsVersion(),proof).principal(),"OWNER");
        workspace=identities.workspaceId(owner.id());
        request=request("billing-client@example.invalid");
        var invitation=clients.provision(root,request);clients.activate(invitation.invitationToken(),PASSWORD);
        principal=clients.login(invitation.email(),PASSWORD);client=token(principal,"CLIENT");
        when(stripe.configured()).thenReturn(true);when(stripe.connected()).thenReturn(true);when(stripe.liveMode()).thenReturn(false);
        when(stripe.createCustomer(any(UUID.class),anyString(),anyString())).thenReturn("cus_synthetic");
    }

    @Test void draftsKeepExactGbpIntentAndIssuedAmountsCannotBeCancelledOrReused() {
        UUID key=UUID.randomUUID();
        var deposit=drafts.create(root,request,key,"DEPOSIT","  Agreed deposit  ",45000,"  Synthetic agreed deposit terms  ");
        assertThat(drafts.create(root,request,key,"DEPOSIT","Agreed deposit",45000,"Synthetic agreed deposit terms").id()).isEqualTo(deposit.id());
        rejected(409,()->drafts.create(root,request,key,"DEPOSIT","Changed amount",46000,"Synthetic agreed deposit terms"));
        rejected(400,()->drafts.create(root,request,UUID.randomUUID(),"FULL","Invalid amount",0,"Synthetic agreed terms"));
        var issued=drafts.issue(root,request,deposit.id());
        assertThat(issued.issued()).isTrue();assertThat(issued.amountPence()).isEqualTo(45000);assertThat(issued.currency()).isEqualTo("GBP");
        rejected(409,()->drafts.cancel(root,request,deposit.id()));
        assertThat(bills.draft(deposit.id()).orElseThrow().amountPence()).isEqualTo(45000);
        assertThat(checkoutStore.page(client,null).bills()).singleElement().satisfies(bill->{assertThat(bill.id()).isEqualTo(deposit.id());assertThat(bill.paymentState()).isEqualTo("ISSUED");});
    }

    @Test void recurringCheckoutRequiresConsentAndReusesTheReservedAttempt() {
        var bill=issued("MONTHLY");
        rejected(400,()->checkoutStore.prepare(client,bill,false));
        assertThat(flow.latest(bill)).isEmpty();assertThat(flow.intent(bill,false).orElseThrow().acceptedAt()).isNull();
        var first=checkoutStore.prepare(client,bill,true);
        assertThat(flow.intent(bill,false).orElseThrow().acceptedAt()).isNotNull();
        rejected(409,()->checkoutStore.prepare(client,bill,true));
        checkoutStore.release(first.attempt().id());
        assertThat(checkoutStore.prepare(client,bill,true).attempt().id()).isEqualTo(first.attempt().id());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_checkout_attempt WHERE bill_id=?",Integer.class,bill)).isEqualTo(1);
        flow.payment(bill,true);rejected(409,()->checkoutStore.prepare(client,bill,true));
    }

    @Test void foreignClientCannotReadOrOpenAnotherClientsBillOrUseItsPageAnchor() {
        var own=issued("FULL");UUID otherRequest=request("other-billing-client@example.invalid");
        var invitation=clients.provision(root,otherRequest);clients.activate(invitation.invitationToken(),PASSWORD);
        var foreign=drafts.create(root,otherRequest,UUID.randomUUID(),"BALANCE","Other client balance",30000,"Synthetic agreed balance terms");
        drafts.issue(root,otherRequest,foreign.id());
        assertThat(checkoutStore.page(client,null).bills()).extracting(BillingCheckoutStore.Bill::id).containsExactly(own);
        rejected(404,()->checkoutStore.prepare(client,foreign.id(),true));
        rejected(404,()->checkoutStore.page(client,foreign.id().toString()));
        rejected(404,()->checkoutStore.invoicePage(client,foreign.id(),null));
        rejected(404,()->checkoutStore.receiptPage(client,foreign.id(),null));
        assertThat(flow.latest(foreign.id())).isEmpty();
    }

    @Test void withdrawalBlocksCheckoutAndDoesNotPretendToRefundOrCancelASubscription() {
        var bill=issued("DEPOSIT");var plan=drafts.beginWithdrawal(root,request,bill);
        assertThat(plan.done()).isFalse();assertThat(plan.sessionId()).isNull();
        rejected(409,()->checkoutStore.prepare(client,bill,true));
        assertThat(drafts.finishWithdrawal(root,request,bill)).isTrue();
        assertThat(drafts.beginWithdrawal(root,request,bill).done()).isTrue();
        var intent=flow.intent(bill,false).orElseThrow();
        assertThat(intent.withdrawnAt()).isNotNull();assertThat(intent.paymentState()).isEqualTo("ISSUED");assertThat(intent.subscriptionId()).isNull();
        assertThat(flow.latest(bill)).isEmpty();
    }

    @Test void providerResultIsRetainedButCheckoutUrlIsRefusedAfterClientSuspension() {
        var bill=issued("FULL");
        when(stripe.checkout(eq(bill),any(UUID.class),anyLong(),anyString(),anyString(),eq(false),anyLong())).thenAnswer(call->{
            clients.suspend(root,request,principal.credentialsVersion());
            return new StripeGateway.Checkout("cs_test_synthetic","https://checkout.stripe.com/c/pay/synthetic",call.getArgument(6,Long.class));
        });
        rejected(401,()->checkout.checkout(client,bill,true));
        var retained=flow.latest(bill).orElseThrow();assertThat(retained.sessionId()).isEqualTo("cs_test_synthetic");assertThat(retained.state()).isEqualTo("OPEN");assertThat(retained.leaseUntil()).isZero();
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("ISSUED");
        assertThat(clients.valid(principal)).isFalse();
    }

    @Test void portalUrlIsRefusedAfterRevocationDuringProviderIo() {
        var bill=issued("MONTHLY");flow.customer(principal.id(),false,"cus_synthetic");
        when(stripe.customerPortal(eq("cus_synthetic"),any(UUID.class))).thenAnswer(call->{clients.suspend(root,request,principal.credentialsVersion());return "https://billing.stripe.com/p/session/synthetic";});
        rejected(401,()->checkout.portal(client,bill));
        assertThat(flow.intent(bill,false).orElseThrow().subscriptionId()).isNull();
    }

    @Test void httpRejectsFractionalPenceAndClientUseOfStaffBillingEndpoints() throws Exception {
        String path="/api/team/support/requests/"+request+"/billing";
        var body=Map.of("submissionKey",UUID.randomUUID(),"purpose","FULL","title","Synthetic exact amount","amountPence",1.5,"terms","Synthetic agreed terms");
        mvc.perform(post(path).with(authentication(root)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body))).andExpect(status().isBadRequest());
        mvc.perform(get(path).with(authentication(client))).andExpect(status().isForbidden());
        assertThat(bills.list(workspace,request)).isEmpty();
    }

    @Test void eventReferencesAreImmutableAndUnrelatedEventsAreIdempotentlyAcknowledged() {
        String id="evt_syntheticUnrelated";
        eventStore.accept(id,"customer.updated","cus_synthetic",100,false);
        eventStore.accept(id,"customer.updated","cus_synthetic",100,false);
        rejected(400,()->eventStore.accept(id,"customer.deleted","cus_synthetic",100,false));
        rejected(400,()->eventStore.accept(id,"customer.updated","cus_other",100,false));
        rejected(400,()->eventStore.accept(id,"customer.updated","cus_synthetic",101,false));
        rejected(400,()->eventStore.accept(id,"customer.updated","cus_synthetic",100,true));
        eventProcessor.process(id);eventProcessor.process(id);
        assertThat(flow.event(id,false).orElseThrow().state()).isEqualTo("DONE");
        assertThat(jdbc.queryForObject("SELECT attempts FROM billing_stripe_event WHERE event_id=?",Integer.class,id)).isEqualTo(1);
        assertThat(bills.list(workspace,request)).isEmpty();
        verify(stripe,never()).session(anyString());
    }

    @Test void failedEventsBackOffThenRequireReviewWithoutChangingBillingState() {
        var bill=issued("FULL");String id="evt_syntheticUnavailable";
        eventStore.accept(id,"checkout.session.completed","cs_test_synthetic",100,false);
        when(stripe.session("cs_test_synthetic")).thenThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"Synthetic transport unavailable"));
        long start=Instant.now().getEpochSecond();
        for(int i=0;i<10;i++)rejected(503,()->eventRecovery.process(id));
        var queue=eventRecovery.list(root,"REVIEW",null);
        assertThat(queue.events()).singleElement().satisfies(event->{assertThat(event.id()).isEqualTo(id);assertThat(event.attempts()).isEqualTo(10);assertThat(event.retryAfter()).isBetween(start+3600,Instant.now().getEpochSecond()+3600);});
        assertThat(flow.dueEvents(false,Long.MAX_VALUE)).doesNotContain(id);
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("ISSUED");
        assertThat(flow.event(id,false).orElseThrow().state()).isEqualTo("PENDING");
        assertThat(queue.totals().review()).isEqualTo(1);
        verify(stripe,times(10)).session("cs_test_synthetic");
    }

    @Test void eventModeMismatchStaysPendingAndCannotFetchAProviderResource() {
        eventStore.accept("evt_syntheticLive","checkout.session.completed","cs_live_synthetic",100,true);
        rejected(400,()->eventRecovery.process("evt_syntheticLive"));
        assertThat(flow.event("evt_syntheticLive",false).orElseThrow().state()).isEqualTo("PENDING");
        assertThat(eventRecovery.list(root,"ALL",null).events()).isEmpty();
        verify(stripe,never()).session(anyString());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"id","object","amount","payment-status","missing-payment"})
    void malformedCheckoutCannotChangeSavedAttemptOrFinancialState(String field) {
        UUID bill=issued("FULL");var plan=checkoutStore.prepare(client,bill,true);
        flow.customer(principal.id(),false,"cus_synthetic");
        var session=session(bill,plan.attempt().id(),"complete","paid");
        switch(field){case "id"->session.put("id","cs_test_other");case "object"->session.put("object","customer");case "amount"->session.put("amount_total",2500.5);case "payment-status"->session.put("payment_status","unexpected");case "missing-payment"->session.remove("payment_intent");default->throw new AssertionError();}
        when(stripe.session("cs_test_synthetic")).thenReturn(session);
        rejected(503,()->checkoutStore.reconcileSession(bill,"cs_test_synthetic"));
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("ISSUED");
        assertThat(flow.latest(bill).orElseThrow().sessionId()).isNull();
        verify(stripe,never()).paymentIntent(anyString());
    }

    @Test void verifiedSettlementIsRepeatableAndLaterUnpaidObservationDoesNotUndoPayment() {
        UUID bill=issued("FULL");var plan=checkoutStore.prepare(client,bill,true);
        flow.customer(principal.id(),false,"cus_synthetic");
        var session=session(bill,plan.attempt().id(),"complete","paid");
        when(stripe.session("cs_test_synthetic")).thenReturn(session);
        paymentFixtures();
        checkoutStore.reconcileSession(bill,"cs_test_synthetic");checkoutStore.reconcileSession(bill,"cs_test_synthetic");
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("PAID");
        session.put("payment_status","unpaid");
        checkoutStore.reconcileSession(bill,"cs_test_synthetic");
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("PAID");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_provider_payment WHERE payment_id='pi_synthetic'",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_link WHERE bill_id=?",Integer.class,bill)).isEqualTo(1);
        assertThat(flow.latest(bill).orElseThrow().state()).isEqualTo("COMPLETE");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"id","object","quantity","unit-amount","interval-count","cancel-flag","period-end"})
    void malformedSubscriptionCannotOverwriteVerifiedState(String field) {
        UUID bill=issued("MONTHLY");flow.accept(bill);flow.customer(principal.id(),false,"cus_synthetic");
        flow.subscription(bill,"sub_synthetic","active",false,2000000000L,null,null,null);
        var subscription=subscription(bill);var item=(com.fasterxml.jackson.databind.node.ObjectNode)subscription.path("items").path("data").get(0);
        switch(field){case "id"->subscription.put("id","sub_other");case "object"->subscription.put("object","customer");case "quantity"->item.put("quantity",1.5);case "unit-amount"->((com.fasterxml.jackson.databind.node.ObjectNode)item.path("price")).put("unit_amount",2500.5);case "interval-count"->((com.fasterxml.jackson.databind.node.ObjectNode)item.path("price").path("recurring")).put("interval_count",1.5);case "cancel-flag"->subscription.put("cancel_at_period_end","true");case "period-end"->item.put("current_period_end",-1);default->throw new AssertionError();}
        when(stripe.subscription("sub_synthetic")).thenReturn(subscription);
        rejected(503,()->checkoutStore.reconcileSubscription(bill,"sub_synthetic"));
        var saved=flow.intent(bill,false).orElseThrow();
        assertThat(saved.subscriptionState()).isEqualTo("active");assertThat(saved.cancelAtPeriodEnd()).isFalse();assertThat(saved.periodEnd()).isEqualTo(2000000000L);
    }

    @Test void subscriptionCancellationAndRenewalRefreshCurrentProviderState() {
        UUID bill=issued("MONTHLY");flow.accept(bill);flow.customer(principal.id(),false,"cus_synthetic");
        flow.subscription(bill,"sub_synthetic","active",false,2000000000L,null,null,null);
        var subscription=subscription(bill);when(stripe.subscription("sub_synthetic")).thenReturn(subscription);
        subscription.put("cancel_at_period_end",true);checkoutStore.reconcileSubscription(bill,"sub_synthetic");
        assertThat(flow.intent(bill,false).orElseThrow().cancelAtPeriodEnd()).isTrue();
        subscription.put("cancel_at_period_end",false);
        ((com.fasterxml.jackson.databind.node.ObjectNode)subscription.path("items").path("data").get(0)).put("current_period_end",2003000000L);
        checkoutStore.reconcileSubscription(bill,"sub_synthetic");
        var saved=flow.intent(bill,false).orElseThrow();assertThat(saved.cancelAtPeriodEnd()).isFalse();assertThat(saved.periodEnd()).isEqualTo(2003000000L);
        assertThat(saved.paymentState()).isEqualTo("ISSUED"); // A renewal snapshot is not a new collection.
    }

    @Test void refundProposalKeepsExactIntentAndRequiresExplicitCurrentConfirmation() {
        UUID bill=issued("FULL");flow.customer(principal.id(),false,"cus_synthetic");paymentFixtures();
        ledger.payment(bill,"pi_synthetic","CHECKOUT:cs_test_synthetic",null,-1);
        UUID key=UUID.randomUUID();var draft=refunds.propose(root,request,bill,key,"pi_synthetic",1000,"requested_by_customer","Synthetic agreed partial refund");
        assertThat(refunds.propose(root,request,bill,key,"pi_synthetic",1000,"requested_by_customer","Synthetic agreed partial refund").id()).isEqualTo(draft.id());
        rejected(409,()->refunds.propose(root,request,bill,key,"pi_synthetic",1001,"requested_by_customer","Synthetic agreed partial refund"));
        rejected(409,()->refunds.propose(root,request,bill,UUID.randomUUID(),"pi_synthetic",2501,"requested_by_customer","Beyond captured amount"));
        rejected(409,()->refunds.prepareExecution(root,request,bill,draft.id(),draft.version(),false,false,false));
        assertThat(refunds.detail(root,request,bill,draft.id()).state()).isEqualTo("DRAFT");
        var plan=refunds.prepareExecution(root,request,bill,draft.id(),draft.version(),true,false,false);
        assertThat(plan.amountPence()).isEqualTo(1000);assertThat(plan.chargeId()).isEqualTo("ch_synthetic");
        assertThat(refunds.detail(root,request,bill,draft.id()).state()).isEqualTo("RUNNING");
        verify(stripe,never()).createRefund(any());
    }

    @Test void nullableFinancialBindingsRemainRepeatableWithoutChangingTheirOwnership() {
        UUID bill=issued("FULL");
        ledgerRows.payment("pi_pending","PAYMENT_INTENT",null,false,"processing",2500,0,null,0,0,false);
        ledgerRows.payment("pi_pending","PAYMENT_INTENT",null,false,"processing",2500,0,null,0,0,false);
        assertThat(ledgerRows.receipt("pi_pending",null,false,null)).isEqualTo(1);
        assertThat(ledgerRows.receipt("pi_pending","ch_other",false,"https://pay.stripe.com/receipts/synthetic")).isZero();
        ledgerRows.link(bill,"pi_pending","SYNTHETIC:pending",null,0);
        ledgerRows.link(bill,"pi_pending","SYNTHETIC:pending",null,0);
        invoiceRows.enqueue(bill,"in_nullable","synthetic-v1");
        invoiceRows.allocation("inpay_nullable","in_nullable","payment_record",null,"open",2500,null);
        invoiceRows.allocation("inpay_nullable","in_nullable","payment_record",null,"canceled",2500,null);
        assertThat(ledgerRows.payments(bill,false,null)).hasSize(1);
        assertThat(invoiceRows.allocations(bill,null)).singleElement().satisfies(row->{assertThat(row.reference()).isNull();assertThat(row.state()).isEqualTo("canceled");});
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_payment_link WHERE bill_id=?",Integer.class,bill)).isEqualTo(1);
    }

    @Test void invoiceWorkerLeasesRejectOverlapAndStaleCompletionAndFinishAnEmptyFinalPage() {
        UUID bill=issued("MONTHLY");flow.accept(bill);flow.customer(principal.id(),false,"cus_synthetic");
        flow.subscription(bill,"sub_synthetic","active",false,2000000000L,null,null,null);
        invoiceRows.enqueue(bill,"in_worker","synthetic-v1");
        var first=invoiceStore.beginSystem("in_worker",bill,0);
        rejected(409,()->invoiceStore.beginSystem("in_worker",bill,0));
        invoiceStore.fail(first);var failed=invoiceRows.job("in_worker",false).orElseThrow();
        assertThat(failed.state()).isEqualTo("ERROR");assertThat(failed.failures()).isEqualTo(1);
        rejected(409,()->invoiceStore.beginSystem("in_worker",bill,failed.version()));
        invoiceStore.restart(root,request,bill,"in_worker",failed.version());
        var restarted=invoiceRows.job("in_worker",false).orElseThrow();var second=invoiceStore.beginSystem("in_worker",bill,restarted.version());
        var page=json.createObjectNode().put("object","list").put("has_more",false);page.putArray("data");
        rejected(409,()->invoiceStore.finishSystem(first,page));
        invoiceStore.fail(first); // An expired owner's failure cannot steal the new lease.
        assertThat(invoiceRows.job("in_worker",false).orElseThrow().token()).isEqualTo(second.token());
        assertThat(invoiceStore.finishSystem(second,page).state()).isEqualTo("DONE");
        rejected(409,()->invoiceStore.finishSystem(second,page));
        assertThat(invoiceRows.allocations(bill,null)).isEmpty();
        assertThat(invoiceRows.due(false)).isEmpty();
    }

    private com.fasterxml.jackson.databind.node.ObjectNode session(UUID bill,UUID attempt,String status,String paymentStatus){
        var value=json.createObjectNode();value.put("id","cs_test_synthetic").put("object","checkout.session").put("client_reference_id",bill.toString()).put("customer","cus_synthetic").put("currency","gbp").put("amount_total",2500).put("mode","payment").put("status",status).put("payment_status",paymentStatus).put("payment_intent","pi_synthetic");
        value.putObject("metadata").put("billing_request_id",bill.toString()).put("checkout_attempt_id",attempt.toString());return value;
    }
    private com.fasterxml.jackson.databind.node.ObjectNode subscription(UUID bill){
        var value=json.createObjectNode();value.put("id","sub_synthetic").put("object","subscription").put("customer","cus_synthetic").put("status","active").put("cancel_at_period_end",false);
        value.putObject("metadata").put("billing_request_id",bill.toString());var item=value.putObject("items").putArray("data").addObject();item.put("quantity",1).put("current_period_end",2000000000L);var price=item.putObject("price").put("unit_amount",2500).put("currency","gbp");price.putObject("recurring").put("interval","month").put("interval_count",1);return value;
    }
    private void paymentFixtures(){
        var pi=json.createObjectNode();pi.put("id","pi_synthetic").put("object","payment_intent").put("customer","cus_synthetic").put("currency","gbp").put("amount",2500).put("amount_received",2500).put("status","succeeded").put("latest_charge","ch_synthetic");
        var charge=json.createObjectNode();charge.put("id","ch_synthetic").put("object","charge").put("payment_intent","pi_synthetic").put("customer","cus_synthetic").put("currency","gbp").put("amount",2500).put("amount_captured",2500).put("amount_refunded",0).put("status","succeeded").put("disputed",false);
        when(stripe.paymentIntent("pi_synthetic")).thenReturn(pi);when(stripe.charge("ch_synthetic")).thenReturn(charge);
    }

    private UUID issued(String purpose){var draft=drafts.create(root,request,UUID.randomUUID(),purpose,"Synthetic agreed payment",2500,"Synthetic scope and cancellation terms");drafts.issue(root,request,draft.id());return draft.id();}
    private UUID request(String email){return requests.create(UUID.randomUUID(),UUID.randomUUID().toString(),workspace,"Synthetic billing client",email,"website","Synthetic billing request","isolated test","{}").id();}
    private static Authentication token(Object principal,String role){return UsernamePasswordAuthenticationToken.authenticated(principal,null,List.of(new SimpleGrantedAuthority("ROLE_"+role)));}
    private static void rejected(int status,Runnable action){assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,failure->assertThat(failure.getStatusCode().value()).isEqualTo(status));}
}
