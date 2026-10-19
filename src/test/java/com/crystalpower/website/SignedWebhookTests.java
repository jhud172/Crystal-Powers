package com.crystalpower.website;

import com.crystalpower.website.repository.BillingFlowRepository;
import com.crystalpower.website.service.StripeGateway;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real signature implementation, security filters, controller and inbox. No provider network operation. */
@SpringBootTest(properties={
    "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-signed-webhooks;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1}",
    "app.billing.enabled=false", "app.billing.live-mode=false",
    "app.billing.stripe-secret=sk_test_SyntheticLocalOnly",
    "app.billing.stripe-webhook-secret=whsec_SyntheticLocalOnly",
    "app.public-url=http://127.0.0.1:8084"
})
@AutoConfigureMockMvc
@Transactional
class SignedWebhookTests {
    private static final String SECRET="whsec_SyntheticLocalOnly",PATH="/api/billing/stripe/webhook";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired BillingFlowRepository events;
    @Autowired DataSource dataSource;
    private JdbcTemplate jdbc;

    @BeforeEach void guardDatabase() throws Exception {
        try(var connection=dataSource.getConnection()){
            if(connection.getMetaData().getDatabaseProductName().equals("PostgreSQL"))
                assertThat(connection.getMetaData().getURL()).matches("jdbc:postgresql://127\\.0\\.0\\.1:55432/crystal_rebuild_test[a-z0-9_]*");
            else assertThat(connection.getMetaData().getURL()).startsWith("jdbc:h2:mem:crystal-signed-webhooks");
        }
        jdbc=new JdbcTemplate(dataSource);
    }

    @Test void exactUtf8BytesAreAuthenticatedWithoutCsrfAndDuplicateReceiptDoesNotReprocess() throws Exception {
        var event=event();event.put("description","Synthetic crème and £25.00");
        byte[] bytes=json.writeValueAsBytes(event);String signature=sign(bytes,Instant.now().getEpochSecond(),SECRET);
        for(int i=0;i<2;i++)mvc.perform(post(PATH).contentType("application/json").header("Stripe-Signature",signature).content(bytes))
            .andExpect(status().isOk()).andExpect(jsonPath("$.received").value(true));
        assertThat(events.event(event.path("id").asText(),false).orElseThrow().state()).isEqualTo("DONE");
        assertThat(jdbc.queryForObject("SELECT attempts FROM billing_stripe_event WHERE event_id=?",Integer.class,event.path("id").asText())).isEqualTo(1);
        // enabled=false deliberately still accepts authenticated reconciliation for existing operations.
    }

    @Test void rotatingSignaturesCanIncludeAnOldKeyWhileOnlyTheMatchingV1Authenticates() throws Exception {
        var event=event();byte[] bytes=json.writeValueAsBytes(event);long now=Instant.now().getEpochSecond();
        String signature=sign(bytes,now,SECRET)+",v1="+"0".repeat(64);
        mvc.perform(post(PATH).contentType("application/json").header("Stripe-Signature",signature).content(bytes)).andExpect(status().isOk());
        assertThat(events.event(event.path("id").asText(),false)).isPresent();
    }

    @ParameterizedTest
    @ValueSource(strings={"missing","wrong-secret","changed-bytes","stale","future","duplicate-time","mode","version","event-id","trailing","negative-created","fraction-created","overflow-created","numeric-object","oversize"})
    void invalidIngressCannotCreateOrAcknowledgeAnInboxRecord(String scenario) throws Exception {
        var event=event();String originalId=event.path("id").asText();long now=Instant.now().getEpochSecond();
        switch(scenario){
            case "mode"->event.put("livemode",true);
            case "version"->event.put("api_version","unsupported-local-version");
            case "event-id"->event.put("id","evt_"+"x".repeat(101));
            case "negative-created"->event.put("created",-1);
            case "fraction-created"->event.put("created",1.5);
            case "overflow-created"->event.put("created",new java.math.BigInteger("18446744073709551616"));
            case "numeric-object"->((ObjectNode)event.path("data").path("object")).put("id",123);
            default->{ }
        }
        byte[] bytes=json.writeValueAsBytes(event);
        if(scenario.equals("trailing"))bytes=(new String(bytes,StandardCharsets.UTF_8)+" {}").getBytes(StandardCharsets.UTF_8);
        if(scenario.equals("oversize"))bytes=new byte[262145];
        long timestamp=scenario.equals("stale")?now-1000:scenario.equals("future")?now+1000:now;
        String signature=sign(bytes,timestamp,scenario.equals("wrong-secret")?"whsec_DifferentSyntheticOnly":SECRET);
        if(scenario.equals("changed-bytes"))bytes=(new String(bytes,StandardCharsets.UTF_8)+" ").getBytes(StandardCharsets.UTF_8);
        if(scenario.equals("duplicate-time"))signature+=",t="+timestamp;
        var request=post(PATH).contentType("application/json").content(bytes);
        if(!scenario.equals("missing"))request.header("Stripe-Signature",signature);
        mvc.perform(request).andExpect(status().is(scenario.equals("oversize")?413:400));
        assertThat(events.event(originalId,false)).isEmpty();
        assertThat(events.event(event.path("id").asText(),false)).isEmpty();
    }

    private ObjectNode event(){
        var result=json.createObjectNode().put("id","evt_"+UUID.randomUUID().toString().replace("-","")).put("type","customer.updated")
            .put("created",Instant.now().getEpochSecond()).put("livemode",false).put("api_version",StripeGateway.API_VERSION);
        result.putObject("data").putObject("object").put("id","cus_SyntheticUnrelated");return result;
    }
    private static String sign(byte[] body,long timestamp,String secret) throws Exception {
        Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
        mac.update((timestamp+".").getBytes(StandardCharsets.UTF_8));return "t="+timestamp+",v1="+HexFormat.of().formatHex(mac.doFinal(body));
    }
}
