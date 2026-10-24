package com.crystalpower.website;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.*;
import com.crystalpower.website.service.*;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.spec.SecretKeySpec;
import javax.sql.DataSource;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Committed disposable business fixtures: store/result/ledger transactions are real; Stripe transport is synthetic. */
@SpringBootTest(properties={
    "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-financial-recovery;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000}",
    "app.owner.setup-token=synthetic-financial-recovery-setup-2026",
    "crystal.billing.refunds-enabled=true"
})
@org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
class FinancialRecoveryTests {
    private static final String PASSWORD="Synthetic-financial-recovery-password-2026";
    @Autowired DataSource dataSource;
    @Autowired OwnerService owners;
    @Autowired TeamIdentityService identities;
    @Autowired ClientAccessService clients;
    @Autowired SupportRepository support;
    @Autowired BillingDraftService billing;
    @Autowired BillingFlowRepository flow;
    @Autowired BillingLedgerRepository ledgerRows;
    @Autowired BillingLedgerService ledger;
    @Autowired BillingInvoiceRepository invoices;
    @Autowired BillingInvoiceStore invoiceStore;
    @Autowired RefundDraftService refunds;
    @Autowired RefundRepository refundRows;
    @Autowired RefundResultStore results;
    @Autowired RefundExecutionService execution;
    @Autowired BillingEventStore eventStore;
    @Autowired BillingEventRecoveryService recovery;
    @Autowired ObjectMapper json;
    @Autowired org.springframework.test.web.servlet.MockMvc mvc;
    @Autowired TeamChannelService channels;
    @Autowired TeamGroupService groups;
    @Autowired TeamProjectService projects;
    @MockitoBean StripeGateway stripe;
    private JdbcTemplate jdbc;
    private boolean postgres;
    private Authentication root;
    private UUID workspace,request,bill;
    private ClientPrincipal client;
    private ObjectNode pi,charge;

    @BeforeEach void committedFixture() throws Exception {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        try(var connection=dataSource.getConnection()){
            postgres=connection.getMetaData().getDatabaseProductName().equals("PostgreSQL");
            if(postgres)assertThat(connection.getMetaData().getURL()).matches("jdbc:postgresql://127\\.0\\.0\\.1:(55432|55447)/crystal_rebuild_test[a-z0-9_]*");
            else assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:crystal-financial-recovery");
        }
        jdbc=new JdbcTemplate(dataSource);cleanup();
        var owner=owners.setup("synthetic-financial-recovery-setup-2026","financial-root@example.invalid",PASSWORD);
        var generator=new TimeBasedOneTimePasswordGenerator();
        String proof=generator.generateOneTimePasswordString(new SecretKeySpec(new Base32().decode(owners.enrolmentSecret(owner.id())),generator.getAlgorithm()),Instant.now());
        root=UsernamePasswordAuthenticationToken.authenticated(owners.verify(owner.id(),owner.credentialsVersion(),proof).principal(),null,List.of(new SimpleGrantedAuthority("ROLE_OWNER")));
        workspace=identities.workspaceId(owner.id());
        request=support.create(UUID.randomUUID(),UUID.randomUUID().toString(),workspace,"Synthetic recovery client","recovery-client@example.invalid","website","Synthetic recovery fixture","isolated local test","{}").id();
        var invitation=clients.provision(root,request);clients.activate(invitation.invitationToken(),PASSWORD);client=clients.login(invitation.email(),PASSWORD);
        when(stripe.connected()).thenReturn(true);when(stripe.configured()).thenReturn(true);when(stripe.liveMode()).thenReturn(false);
        bill=issued(request,"FULL");flow.customer(client.id(),false,"cus_Synthetic");
        pi=json.createObjectNode().put("id","pi_Synthetic").put("object","payment_intent").put("customer","cus_Synthetic").put("currency","gbp").put("amount",2500).put("amount_received",2500).put("status","succeeded").put("latest_charge","ch_Synthetic");
        charge=json.createObjectNode().put("id","ch_Synthetic").put("object","charge").put("payment_intent","pi_Synthetic").put("customer","cus_Synthetic").put("currency","gbp").put("amount",2500).put("amount_captured",2500).put("amount_refunded",0).put("status","succeeded").put("disputed",false);
        when(stripe.paymentIntent("pi_Synthetic")).thenReturn(pi);when(stripe.charge("ch_Synthetic")).thenReturn(charge);
    }

    @AfterEach void cleanup(){
        if(jdbc==null)return;
        if(postgres){jdbc.execute("TRUNCATE TABLE public.admin_account CASCADE");jdbc.execute("TRUNCATE TABLE public.billing_stripe_event,public.billing_payment_mutex");jdbc.execute("TRUNCATE TABLE public.billing_provider_payment CASCADE");}
        else{
            jdbc.execute("SET REFERENTIAL_INTEGRITY FALSE");
            try{for(String table:jdbc.queryForList("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",String.class))if(!table.equals("flyway_schema_history"))jdbc.execute("TRUNCATE TABLE \""+table.replace("\"","\"\"")+"\"");}
            finally{jdbc.execute("SET REFERENTIAL_INTEGRITY TRUE");}
        }
    }

    @Test void providerSubmissionSeesCommittedConfirmationAndSuccessfulWebhookReplayIsIdempotent(){
        var draft=proposal();var resource=refund(draft.id(),"re_Synthetic","succeeded");when(stripe.refund("re_Synthetic")).thenReturn(resource);
        when(stripe.createRefund(any())).thenAnswer(call->{
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            assertThat(refundRows.byId(draft.id()).orElseThrow().state()).isEqualTo("RUNNING");
            charge.put("amount_refunded",1000);return "re_Synthetic";
        });
        execution.confirm(root,request,bill,draft.id(),draft.version(),true,false,false);
        var saved=refundRows.byId(draft.id()).orElseThrow();assertThat(saved.state()).isEqualTo("SUCCEEDED");assertThat(saved.ledgerReconciled()).isTrue();
        assertThat(saved.providerId()).isEqualTo("re_Synthetic");
        eventStore.accept("evt_RefundReplay","refund.updated","re_Synthetic",100,false);recovery.process("evt_RefundReplay");recovery.process("evt_RefundReplay");
        assertThat(flow.event("evt_RefundReplay",false).orElseThrow().state()).isEqualTo("DONE");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_provider_adjustment",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT attempts FROM billing_stripe_event WHERE event_id='evt_RefundReplay'",Integer.class)).isEqualTo(1);
        rejected(409,()->execution.confirm(root,request,bill,draft.id(),saved.version(),true,false,false));
        verify(stripe,times(1)).createRefund(any());
    }

    @Test void providerTimeoutRetainsTheConfirmedOperationAndReadOnlyRecoveryNeverSubmitsAgain(){
        var draft=proposal();when(stripe.createRefund(any())).thenThrow(new IllegalStateException("Synthetic timeout after request"));
        rejected(503,()->execution.confirm(root,request,bill,draft.id(),draft.version(),true,false,false));
        var uncertain=refundRows.byId(draft.id()).orElseThrow();assertThat(uncertain.state()).isEqualTo("RECONCILE_REQUIRED");assertThat(refundRows.execution(draft.id()).orElseThrow().firstSubmissionAt()).isNotNull();
        charge.put("amount_refunded",1000);when(stripe.refund("re_Recovered")).thenReturn(refund(draft.id(),"re_Recovered","succeeded"));
        execution.reconcile(root,request,bill,draft.id(),uncertain.version(),"re_Recovered");
        assertThat(refundRows.byId(draft.id()).orElseThrow().ledgerReconciled()).isTrue();
        verify(stripe,times(1)).createRefund(any());
    }

    @Test void ledgerFailureDoesNotRollBackAProviderConfirmedRefundAndCanBeRetriedReadOnly(){
        var draft=proposal();
        when(stripe.createRefund(any())).thenAnswer(call->{charge.put("amount_refunded",1000);return "re_LedgerRetry";});when(stripe.refund("re_LedgerRetry")).thenReturn(refund(draft.id(),"re_LedgerRetry","succeeded"));
        when(stripe.paymentIntent("pi_Synthetic")).thenThrow(new IllegalStateException("Synthetic ledger transport outage"));
        rejected(503,()->execution.confirm(root,request,bill,draft.id(),draft.version(),true,false,false));
        var saved=refundRows.byId(draft.id()).orElseThrow();assertThat(saved.state()).isEqualTo("SUCCEEDED");assertThat(saved.providerId()).isEqualTo("re_LedgerRetry");assertThat(saved.ledgerReconciled()).isFalse();
        doReturn(pi).when(stripe).paymentIntent("pi_Synthetic");
        execution.reconcile(root,request,bill,draft.id(),saved.version(),"re_LedgerRetry");
        assertThat(refundRows.byId(draft.id()).orElseThrow().ledgerReconciled()).isTrue();verify(stripe,times(1)).createRefund(any());
    }

    @ParameterizedTest @ValueSource(strings={"amount","currency","metadata","charge","customer"})
    void invalidRefundResultsKeepTheCandidateAndRequireReview(String field){
        var draft=proposal();var resource=refund(draft.id(),"re_Unverified","succeeded");
        switch(field){case "amount"->resource.put("amount",1001);case "currency"->resource.put("currency","usd");case "metadata"->((ObjectNode)resource.path("metadata")).put("crystal_refund_id",UUID.randomUUID().toString());case "charge"->resource.put("charge","ch_Foreign");case "customer"->resource.put("customer","cus_Foreign");default->throw new AssertionError();}
        when(stripe.createRefund(any())).thenReturn("re_Unverified");when(stripe.refund("re_Unverified")).thenReturn(resource);
        rejected(503,()->execution.confirm(root,request,bill,draft.id(),draft.version(),true,false,false));
        var saved=refundRows.byId(draft.id()).orElseThrow();assertThat(saved.state()).isEqualTo("RECONCILE_REQUIRED");assertThat(saved.providerId()).isNull();assertThat(saved.candidateProviderId()).isEqualTo("re_Unverified");assertThat(saved.ledgerReconciled()).isFalse();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_provider_adjustment",Integer.class)).isZero();
        verify(stripe,times(1)).createRefund(any());
    }

    @Test void aDifferentRefundCannotReplaceTheRecordedCandidateEvenWithMatchingMetadata(){
        var draft=proposal();var plan=refunds.prepareExecution(root,request,bill,draft.id(),draft.version(),true,false,false);
        refunds.candidate(plan,"re_Original");refunds.uncertain(plan);
        var current=refundRows.byId(draft.id()).orElseThrow();when(stripe.refund("re_Different")).thenReturn(refund(draft.id(),"re_Different","succeeded"));
        rejected(409,()->execution.reconcile(root,request,bill,draft.id(),current.version(),"re_Different"));
        rejected(409,()->results.observe(plan,"re_Different"));
        eventStore.accept("evt_CandidateMismatch","refund.updated","re_Different",100,false);
        rejected(409,()->recovery.process("evt_CandidateMismatch"));
        assertThat(flow.event("evt_CandidateMismatch",false).orElseThrow().state()).isEqualTo("PENDING");
        assertThat(refundRows.byId(draft.id()).orElseThrow().candidateProviderId()).isEqualTo("re_Original");verify(stripe,never()).createRefund(any());
    }

    @Test void customerlessLegacyChargeRefundUsesItsVerifiedInvoiceAndDoesNotInventACustomer(){
        legacyPayment();
        var draft=refunds.propose(root,request,bill,UUID.randomUUID(),"ch_Legacy",1000,"requested_by_customer","Synthetic legacy refund");
        var resource=refund(draft.id(),"re_Legacy","succeeded");resource.remove("payment_intent");resource.put("charge","ch_Legacy");when(stripe.refund("re_Legacy")).thenReturn(resource);
        when(stripe.createRefund(any())).thenAnswer(call->{RefundDraftService.ExecutionPlan plan=call.getArgument(0);assertThat(plan.customer()).isEqualTo("cus_Synthetic");charge.put("amount_refunded",1000);return "re_Legacy";});
        execution.confirm(root,request,bill,draft.id(),draft.version(),true,false,false);
        assertThat(refundRows.byId(draft.id()).orElseThrow().ledgerReconciled()).isTrue();
        assertThat(jdbc.queryForObject("SELECT customer_id FROM billing_provider_payment WHERE payment_id='ch_Legacy'",String.class)).isNull();
    }

    @Test void legacyRefundRefusesAnInvoiceWhoseVerifiedCustomerChanged(){
        var invoice=legacyPayment();invoice.put("customer","cus_Foreign");
        rejected(409,()->refunds.propose(root,request,bill,UUID.randomUUID(),"ch_Legacy",1000,"requested_by_customer","Synthetic invalid binding"));
        assertThat(refundRows.page(bill,false,null)).isEmpty();verify(stripe,never()).createRefund(any());
    }

    @Test void malformedSecondAllocationRollsBackTheFirstPaymentAndCursorThenAllowsAnExplicitRetry(){
        var lease=invoiceLease();var page=allocationPage(true);var first=allocation("inpay_First",1000);page.withArray("data").add(first);
        var invalid=allocation("inpay_Second",1500);invalid.put("invoice","in_Foreign");page.withArray("data").add(invalid);
        rejected(409,()->invoiceStore.finishSystem(lease,page));
        assertThat(invoices.allocations(bill,null)).isEmpty();assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_provider_payment",Integer.class)).isZero();assertThat(invoices.job("in_Allocations",false).orElseThrow().cursor()).isNull();
        page.withArray("data").remove(1);assertThat(invoiceStore.finishSystem(lease,page).state()).isEqualTo("PENDING");
        var saved=invoices.job("in_Allocations",false).orElseThrow();var next=invoiceStore.beginSystem("in_Allocations",bill,saved.version());
        var last=allocationPage(false);last.withArray("data").add(allocation("inpay_Second",1500));assertThat(invoiceStore.finishSystem(next,last).state()).isEqualTo("DONE");
        assertThat(invoices.allocations(bill,null)).hasSize(2);assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_provider_payment",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT SUM(allocated_pence) FROM billing_payment_link WHERE bill_id=?",Long.class,bill)).isEqualTo(2500);
    }

    @ParameterizedTest @ValueSource(strings={"missing-data","non-list","non-boolean","too-many","duplicate"})
    void malformedAllocationPagesCannotAdvanceTheCommittedLease(String field){
        var lease=invoiceLease();var page=allocationPage(false);
        switch(field){case "missing-data"->page.remove("data");case "non-list"->page.put("object","invoice");case "non-boolean"->page.put("has_more","false");case "too-many"->{for(int i=0;i<3;i++)page.withArray("data").add(allocation("inpay_Row"+i,500));}case "duplicate"->{page.withArray("data").add(allocation("inpay_Same",500));page.withArray("data").add(allocation("inpay_Same",500));}default->throw new AssertionError();}
        rejected(409,()->invoiceStore.finishSystem(lease,page));assertThat(invoices.allocations(bill,null)).isEmpty();
        var job=invoices.job("in_Allocations",false).orElseThrow();assertThat(job.state()).isEqualTo("RUNNING");assertThat(job.token()).isEqualTo(lease.token());assertThat(job.cursor()).isNull();
    }

    @Test void sharedChargeRefundConfirmationsArbitrateAcrossRealCommittedTransactions() throws Exception {
        ledger.payment(bill,"pi_Synthetic","CHECKOUT:synthetic",null,-1);UUID secondBill=issued(request,"BALANCE");ledger.payment(secondBill,"pi_Synthetic","CHECKOUT:second",null,-1);
        var one=refunds.propose(root,request,bill,UUID.randomUUID(),"pi_Synthetic",1000,"requested_by_customer","Synthetic first shared refund");
        var two=refunds.propose(root,request,secondBill,UUID.randomUUID(),"pi_Synthetic",1000,"requested_by_customer","Synthetic second shared refund");
        rejected(409,()->refunds.prepareExecution(root,request,bill,one.id(),one.version(),true,false,false));
        var gate=new CountDownLatch(1);var ready=new CountDownLatch(2);var executor=Executors.newFixedThreadPool(2);
        try{
            var a=executor.submit(()->confirmation(gate,ready,bill,one));var b=executor.submit(()->confirmation(gate,ready,secondBill,two));
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();gate.countDown();
            assertThat(List.of(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }finally{gate.countDown();executor.shutdownNow();}
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM billing_refund_request WHERE state='RUNNING'",Integer.class)).isEqualTo(1);
        verify(stripe,never()).createRefund(any());
    }

    @Test void newlyQueuedInvoicesUseTheSameDatabaseDueBoundaryAsTheWorkerQueue(){
        invoiceLease();
        for(int i=0;i<25;i++){
            String id="in_Immediate"+i;invoices.enqueue(bill,id,"synthetic-ready");
            assertThat(invoices.dueNow(id,0)).isTrue();
            assertThat(invoiceStore.beginSystem(id,bill,0).invoice()).isEqualTo(id);
        }
        invoices.enqueue(bill,"in_Future","synthetic-future");
        jdbc.update("UPDATE billing_invoice_sync SET retry_after=? WHERE invoice_id=?",java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).plusMinutes(5),"in_Future");
        assertThat(invoices.dueNow("in_Future",0)).isFalse();rejected(409,()->invoiceStore.beginSystem("in_Future",bill,0));
    }

    @ParameterizedTest
    @ValueSource(strings={"events","invoice-jobs","allocations","payments","adjustments","history","unread","groups","group","eligible","mentions","recipients","settings","channel-settings","projects","project-overview","project-page","project","project-detail","revisions","revision-page","uploads"})
    void ownerReadEndpointsAllowAuthorityLocksOutsideAnyTestTransaction(String kind) throws Exception {
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        String billingPath="/api/team/support/requests/"+request+"/billing/"+bill;
        String path=switch(kind){
            case "events"->"/api/team/billing/events";
            case "invoice-jobs"->{invoices.enqueue(bill,"in_OwnerRead","synthetic-owner-read");yield billingPath+"/invoices?kind=JOBS";}
            case "allocations"->billingPath+"/invoices?kind=ALLOCATIONS";
            case "payments"->{ledger.payment(bill,"pi_Synthetic","OWNER_READ",null,-1);yield billingPath+"/records?kind=PAYMENTS";}
            case "adjustments"->billingPath+"/records?kind=ADJUSTMENTS";
            case "history"->billingPath+"/history";
            case "unread"->"/api/team/unread";
            case "groups"->"/api/team/groups";
            case "group"->{var group=groups.save(root,null,0,"Synthetic owner read group","",false,List.of());yield "/api/team/groups/"+group.id();}
            case "eligible"->"/api/team/groups/eligible-members";
            case "mentions"->"/api/team/mentions";
            case "settings"->"/api/team/settings";
            case "uploads"->"/api/team/uploads/queue";
            case "recipients","channel-settings"->{var channel=channels.create(root,"owner-read","Synthetic read transaction","Recovery","TEAM",null);yield kind.equals("recipients") ? "/api/team/channels/"+channel.id()+"/mention-recipients" : "/api/team/settings/channels/"+channel.id();}
            case "projects"->"/api/team/projects";
            case "project-overview"->"/api/team/projects/overview";
            case "project-page"->"/api/team/projects/page";
            default->{var content=new com.crystalpower.website.dto.ProjectContent("Synthetic owner read project",com.crystalpower.website.dto.ProjectContent.Category.WEBSITE,"Synthetic private fixture","Overview","Approach","Outcome","",List.of("Synthetic"),com.crystalpower.website.dto.ProjectContent.Device.laptop,null,"",List.of());var project=projects.create(root,UUID.randomUUID(),"synthetic-owner-read",content);String projectPath="/api/team/projects/"+project.id();yield switch(kind){case "project"->projectPath;case "project-detail"->projectPath+"/overview";case "revisions"->projectPath+"/revisions";case "revision-page"->projectPath+"/revisions/page";default->throw new AssertionError(kind);};}
        };
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path)
                .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication(root)))
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk())
            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.content().contentTypeCompatibleWith(org.springframework.http.MediaType.APPLICATION_JSON));
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        assertThat(flow.intent(bill,false).orElseThrow().paymentState()).isEqualTo("ISSUED");
    }

    private int confirmation(CountDownLatch gate,CountDownLatch ready,UUID target,RefundDraftService.View proposal) throws Exception {
        ready.countDown();assertThat(gate.await(5,TimeUnit.SECONDS)).isTrue();
        try{refunds.prepareExecution(root,request,target,proposal.id(),proposal.version(),true,true,false);return 200;}catch(ResponseStatusException failure){return failure.getStatusCode().value();}
    }
    private UUID issued(UUID target,String purpose){var value=billing.create(root,target,UUID.randomUUID(),purpose,"Synthetic agreed recovery payment",2500,"Synthetic local scope and cancellation terms");billing.issue(root,target,value.id());return value.id();}
    private RefundDraftService.View proposal(){ledger.payment(bill,"pi_Synthetic","CHECKOUT:synthetic",null,-1);return refunds.propose(root,request,bill,UUID.randomUUID(),"pi_Synthetic",1000,"requested_by_customer","Synthetic partial refund");}
    private ObjectNode refund(UUID proposal,String id,String state){var value=json.createObjectNode().put("id",id).put("object","refund").put("charge","ch_Synthetic").put("payment_intent","pi_Synthetic").put("currency","gbp").put("amount",1000).put("reason","requested_by_customer").put("status",state);value.putObject("metadata").put("crystal_refund_id",proposal.toString());return value;}
    private ObjectNode invoice(){var value=json.createObjectNode().put("id","in_Allocations").put("object","invoice").put("currency","gbp").put("customer","cus_Synthetic");value.putObject("parent").putObject("subscription_details").put("subscription","sub_Synthetic");return value;}
    private ObjectNode legacyPayment(){bill=issued(request,"MONTHLY");flow.accept(bill);flow.subscription(bill,"sub_Synthetic","active",false,2000000000L,null,null,null);var invoice=invoice();when(stripe.invoice("in_Allocations")).thenReturn(invoice);charge.put("id","ch_Legacy");charge.remove("payment_intent");charge.remove("customer");when(stripe.charge("ch_Legacy")).thenReturn(charge);ledger.legacyCharge(bill,"ch_Legacy","INVOICE_PAYMENT:inpay_Legacy","in_Allocations",2500);return invoice;}
    private BillingInvoiceStore.Lease invoiceLease(){bill=issued(request,"MONTHLY");flow.accept(bill);flow.subscription(bill,"sub_Synthetic","active",false,2000000000L,null,null,null);invoices.enqueue(bill,"in_Allocations","synthetic-invoice-v1");var job=invoices.job("in_Allocations",false).orElseThrow();assertThat(job.version()).isZero();assertThat(job.state()).isEqualTo("PENDING");try{return invoiceStore.beginSystem("in_Allocations",bill,0);}catch(ResponseStatusException failure){throw new AssertionError("Synthetic invoice lease refused: "+job+"; app="+java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC)+"; database="+jdbc.queryForObject("SELECT CURRENT_TIMESTAMP",java.time.OffsetDateTime.class),failure);}}
    private ObjectNode allocationPage(boolean more){var value=json.createObjectNode().put("object","list").put("has_more",more);value.putArray("data");return value;}
    private ObjectNode allocation(String id,long amount){var value=json.createObjectNode().put("id",id).put("object","invoice_payment").put("invoice","in_Allocations").put("livemode",false).put("currency","gbp").put("status","paid").put("amount_requested",amount).put("amount_paid",amount);value.putObject("payment").put("type","payment_intent").put("payment_intent","pi_Synthetic");return value;}
    private static void rejected(int status,Runnable action){assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class,failure->assertThat(failure.getStatusCode().value()).isEqualTo(status));}
}
