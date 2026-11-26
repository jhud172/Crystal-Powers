package com.crystalpower.website;

import com.crystalpower.website.service.EmailTransport;
import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.codec.binary.Base32;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.ResultActions;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
        "app.docks.email-enabled=true",
        "app.owner.setup-token=synthetic-docks-test-owner-setup-not-a-secret",
        "spring.datasource.url=${crystal.test.database-url:jdbc:h2:mem:crystal-docks-journey;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1}"
})
@AutoConfigureMockMvc
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class DocksCustomerJourneyTests {
    private static final String OWNER_AUTH = "/api/admin/auth";
    private static final String OWNER_SUPPORT = "/api/admin/docks/support-reports";
    private static final String DOCKS = "/api/docks";
    private static final String REPORTS = DOCKS + "/reports";
    private static final String SUPPORT = REPORTS + "/support-access";
    private static final String LOG = DOCKS + "/diagnostic-log";
    private static final String RESEARCH = DOCKS + "/research";

    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @MockitoBean EmailTransport mail;
    private final AtomicReference<EmailTransport.Message> delivered = new AtomicReference<>();
    private MockHttpSession owner;
    private JsonNode ownerCsrf;

    @BeforeAll
    void signInFixtureOwner() throws Exception {
        var credentials = Map.of("email", "docks-audit-owner@example.invalid",
                "password", "Synthetic-Docks-Audit-Password-2026");
        var setup = http.perform(body(post(OWNER_AUTH + "/setup").with(csrf()), Map.of(
                "token", "synthetic-docks-test-owner-setup-not-a-secret",
                "email", credentials.get("email"), "password", credentials.get("password"))))
                .andExpect(status().isOk()).andReturn();
        var enrolment = (MockHttpSession) setup.getRequest().getSession(false);
        String secret = response(http.perform(get(OWNER_AUTH + "/enrolment").session(enrolment))
                .andExpect(status().isOk())).get("secret").asText();
        var generator = new TimeBasedOneTimePasswordGenerator();
        var key = new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm());
        String totp = generator.generateOneTimePasswordString(key, Instant.now());
        var enrolmentResult = response(http.perform(body(post(OWNER_AUTH + "/verify").session(enrolment).with(csrf()),
                Map.of("code", totp))).andExpect(status().isOk()));
        http.perform(post(OWNER_AUTH + "/logout").session(enrolment).with(csrf())).andExpect(status().isOk());

        var login = http.perform(body(post(OWNER_AUTH + "/login").with(csrf()), credentials))
                .andExpect(status().isOk()).andExpect(jsonPath("$.mfaRequired").value(true)).andReturn();
        owner = (MockHttpSession) login.getRequest().getSession(false);
        http.perform(body(post(OWNER_SUPPORT).session(owner).with(csrf()), Map.of("reference", UUID.randomUUID())))
                .andExpect(status().isUnauthorized());
        String recoveryCode = enrolmentResult.get("recoveryCodes").get(0).asText();
        http.perform(body(post(OWNER_AUTH + "/verify").session(owner).with(csrf()), Map.of("code", recoveryCode)))
                .andExpect(status().isOk());
        ownerCsrf = response(http.perform(get(OWNER_AUTH + "/csrf").session(owner)).andExpect(status().isOk()));
    }

    @BeforeEach
    void captureEmail() {
        when(mail.configured()).thenReturn(true);
        doAnswer(invocation -> {
            delivered.set(invocation.getArgument(0));
            return null;
        }).when(mail).send(any(EmailTransport.Message.class));
    }

    @Test
    void enrolledCustomerControlsReportsSupportLogsAndResearchIndependently() throws Exception {
        http.perform(get(DOCKS + "/auth/email")).andExpect(status().isOk()).andExpect(jsonPath("$.enabled").value(true));
        String customer = signIn();
        String other = signIn();
        UUID installation = UUID.randomUUID();
        String entitlement = DOCKS + "/entitlement?installationId=" + installation;
        asCustomer(get(entitlement), customer).andExpect(status().isNotFound());
        asCustomer(body(post(DOCKS + "/devices"), Map.of("installationId", installation, "label", "Pilot PC")), customer)
                .andExpect(status().isOk());
        asCustomer(get(entitlement), customer).andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(false));
        asCustomer(body(post(DOCKS + "/trial"), Map.of("installationId", installation)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(true));
        asCustomer(get(entitlement), other).andExpect(status().isNotFound());

        var checkedAt = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        var summary = Map.of("installationId", installation, "checkedAt", checkedAt, "cpuPercent", 28, "memoryPercent", 47);
        asCustomer(body(put(REPORTS + "/latest"), summary), customer).andExpect(status().isConflict());
        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", true)), customer).andExpect(status().isNoContent());
        asCustomer(body(put(REPORTS + "/latest"), summary), customer).andExpect(status().isNoContent());
        asCustomer(get(REPORTS), other).andExpect(status().isOk()).andExpect(jsonPath("$.reports").isEmpty());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"))
                .andExpect(jsonPath("$.reports[0].memoryPercent").value(47));

        var grant = response(asCustomer(post(SUPPORT), customer).andExpect(status().isOk()));
        String reference = grant.get("reference").asText();
        asCustomer(get("/api/admin/docks/configuration"), customer).andExpect(status().isUnauthorized());
        http.perform(get("/api/admin/docks/configuration").session(owner))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(content().json("""
                        {"emailSignIn":true,"googleSignIn":false,"testBilling":true,"checkoutPlans":0,
                         "subscriptionPortal":false,"onlineExplanations":false,"windowsVersion":null}
                        """, false))
                .andExpect(jsonPath("$.onlineAiBudget.monthUtc").isNotEmpty())
                .andExpect(jsonPath("$.onlineAiBudget.reservedPence").value(0))
                .andExpect(jsonPath("$.onlineAiBudget.remainingPence").isEmpty())
                .andExpect(jsonPath("$.onlineAiBudget.key").doesNotExist());
        asCustomer(body(post(OWNER_SUPPORT).with(csrf()), Map.of("reference", reference)), customer)
                .andExpect(status().isUnauthorized());
        http.perform(body(post(OWNER_SUPPORT).session(owner), Map.of("reference", reference)))
                .andExpect(status().isForbidden());
        http.perform(body(asOwner(post(OWNER_SUPPORT)), Map.of("reference", reference)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"))
                .andExpect(jsonPath("$.reports[0].deviceId").doesNotExist());
        asCustomer(get(SUPPORT), customer).andExpect(status().isOk()).andExpect(jsonPath("$.activity[0].action").value("VIEWED"));

        var readings = Map.of("cpuPercent", 28, "memoryPercent", 47, "logicalProcessors", 4,
                "installedApps", 12, "driveStatus", "HEALTHY");
        var diagnostic = Map.of("installationId", installation, "checkedAt", checkedAt, "readings", readings, "approved", true);
        var log = response(asCustomer(body(post(LOG), diagnostic), customer).andExpect(status().isOk()));
        String logReference = log.get("reference").asText();
        http.perform(body(asOwner(post(OWNER_SUPPORT)), Map.of("reference", logReference)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.diagnosticLog.readings.installedApps").value(12));
        asCustomer(get(LOG), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.activity[0].action").value("VIEWED"));
        asCustomer(get(LOG), other).andExpect(status().isOk())
                .andExpect(jsonPath("$.grant").isEmpty()).andExpect(jsonPath("$.activity").isEmpty());
        asCustomer(delete(LOG), customer).andExpect(status().isNoContent());
        http.perform(body(asOwner(post(OWNER_SUPPORT)), Map.of("reference", logReference)))
                .andExpect(status().isNotFound());

        var bands = Map.of("cpuBand", "MEDIUM", "memoryBand", "MEDIUM");
        asCustomer(body(put(RESEARCH + "/contribution"), bands), customer).andExpect(status().isConflict());
        asCustomer(body(put(RESEARCH + "/preference"), Map.of("enabled", true)), customer).andExpect(status().isOk());
        asCustomer(body(put(RESEARCH + "/contribution"), bands), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.submittedAt").isNotEmpty());
        asCustomer(body(put(RESEARCH + "/preference"), Map.of("enabled", false)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.submittedAt").isEmpty());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports[0].deviceLabel").value("Pilot PC"));

        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", false)), customer).andExpect(status().isNoContent());
        http.perform(body(asOwner(post(OWNER_SUPPORT)), Map.of("reference", reference)))
                .andExpect(status().isNotFound());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports").isEmpty());
        asCustomer(post(DOCKS + "/auth/sign-out"), customer).andExpect(status().isNoContent());
        asCustomer(get(REPORTS), customer).andExpect(status().isUnauthorized());
    }

    @Test
    void ownerKeyCanBeTransferredButCannotCrossAccountsOrSurviveRevocation() throws Exception {
        String customer = signIn();
        String other = signIn();
        UUID first = UUID.randomUUID();
        UUID replacement = UUID.randomUUID();
        UUID otherInstallation = UUID.randomUUID();
        String firstId = enrol(customer, first, "First PC");
        enrol(customer, replacement, "Replacement PC");
        enrol(other, otherInstallation, "Other account PC");

        String keys = "/api/admin/docks/access-keys";
        var issue = Map.of("durationDays", 30, "deviceLimit", 1);
        asCustomer(body(post(keys).with(csrf()), issue), customer).andExpect(status().isUnauthorized());
        http.perform(body(post(keys).session(owner), issue)).andExpect(status().isForbidden());
        var issued = response(http.perform(body(asOwner(post(keys)), issue))
                .andExpect(status().isCreated()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.key.expiresAt").isEmpty()));
        String code = issued.get("code").asText();
        String keyPath = keys + "/" + issued.get("key").get("id").asText();
        http.perform(get(keys).session(owner))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].code").doesNotExist());

        asCustomer(get(entitlement(first)), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.canRepair").value(false));
        redeem(customer, first, code).andExpect(status().isNoContent());
        var redeemed = response(asCustomer(get(entitlement(first)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(true)));
        var expiry = OffsetDateTime.parse(redeemed.get("accessKeyExpiresAt").asText());
        redeem(other, otherInstallation, code).andExpect(status().isUnprocessableEntity());
        redeem(customer, replacement, code).andExpect(status().isConflict());

        String oldDevice = DOCKS + "/devices/" + firstId;
        http.perform(get(DOCKS + "/devices")).andExpect(status().isUnauthorized());
        asCustomer(get(DOCKS + "/devices"), customer).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$[0].id").value(firstId))
                .andExpect(jsonPath("$[0].enrolledAt").isNotEmpty());
        asCustomer(get(DOCKS + "/devices"), other).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Other account PC"));
        var checked = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        var readings = Map.of("memoryPercent", 47, "logicalProcessors", 4, "installedApps", 12, "driveStatus", "HEALTHY");
        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", true)), customer).andExpect(status().isNoContent());
        asCustomer(body(put(REPORTS + "/latest"),
                Map.of("installationId", first, "checkedAt", checked, "memoryPercent", 47)), customer).andExpect(status().isNoContent());
        asCustomer(body(post(LOG), Map.of("installationId", first, "checkedAt", checked,
                "readings", readings, "approved", true)), customer).andExpect(status().isOk());
        asCustomer(delete(oldDevice), other).andExpect(status().isNotFound());
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports[0].deviceId").value(firstId));
        asCustomer(get(entitlement(first)), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.canRepair").value(true));
        asCustomer(delete(oldDevice), customer).andExpect(status().isNoContent());
        asCustomer(get(DOCKS + "/devices"), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].label").value("Replacement PC")).andExpect(jsonPath("$.length()").value(1));
        asCustomer(get(REPORTS), customer).andExpect(status().isOk()).andExpect(jsonPath("$.reports").isEmpty());
        asCustomer(get(LOG), customer).andExpect(status().isOk()).andExpect(jsonPath("$.grant").isEmpty());
        asCustomer(get(entitlement(first)), customer).andExpect(status().isNotFound());
        redeem(customer, replacement, code).andExpect(status().isNoContent());
        asCustomer(get(entitlement(replacement)), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.accessKeyExpiresAt").value(redeemed.get("accessKeyExpiresAt").asText()));

        http.perform(body(asOwner(post(keyPath + "/state")),
                Map.of("state", "SUSPENDED"))).andExpect(status().isNoContent());
        asCustomer(get(entitlement(replacement)), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.canRepair").value(false));
        http.perform(body(asOwner(post(keyPath + "/state")),
                Map.of("state", "ACTIVE"))).andExpect(status().isNoContent());
        http.perform(body(asOwner(post(keyPath + "/extend")),
                Map.of("days", 7))).andExpect(status().isNoContent());
        var extended = response(asCustomer(get(entitlement(replacement)), customer)
                .andExpect(status().isOk()).andExpect(jsonPath("$.canRepair").value(true)));
        assertEquals(expiry.plusDays(7).toInstant(),
                OffsetDateTime.parse(extended.get("accessKeyExpiresAt").asText()).toInstant());

        http.perform(body(asOwner(post(keyPath + "/state")),
                Map.of("state", "REVOKED"))).andExpect(status().isNoContent());
        asCustomer(get(entitlement(replacement)), customer).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.canRepair").value(false));
        redeem(customer, replacement, code).andExpect(status().isUnprocessableEntity());
        http.perform(body(asOwner(post(keyPath + "/state")),
                Map.of("state", "ACTIVE"))).andExpect(status().isConflict());
    }

    @Test
    void aCustomerCanRemoveOnlyTheirReviewedSummary() throws Exception {
        String customer = signIn();
        String other = signIn();
        UUID first = UUID.randomUUID();
        UUID second = UUID.randomUUID();
        String firstDevice = enrol(customer, first, "First PC");
        enrol(customer, second, "Second PC");
        asCustomer(body(put(REPORTS + "/preference"), Map.of("enabled", true)), customer)
                .andExpect(status().isNoContent());
        OffsetDateTime firstCheck = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(4).withNano(0);
        OffsetDateTime nextCheck = firstCheck.plusMinutes(1);
        asCustomer(body(put(REPORTS + "/latest"),
                Map.of("installationId", first, "checkedAt", firstCheck, "cpuPercent", 21)), customer)
                .andExpect(status().isNoContent());
        asCustomer(body(put(REPORTS + "/latest"),
                Map.of("installationId", second, "checkedAt", firstCheck, "cpuPercent", 34)), customer)
                .andExpect(status().isNoContent());
        asCustomer(body(put(REPORTS + "/latest"),
                Map.of("installationId", first, "checkedAt", nextCheck, "cpuPercent", 27)), customer)
                .andExpect(status().isNoContent());

        var view = response(asCustomer(get(REPORTS), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.reports[0].deviceId").value(firstDevice)));
        String latest = view.get("reports").get(0).get("checkedAt").asText();
        asCustomer(post(SUPPORT), customer).andExpect(status().isOk());
        String path = REPORTS + "/devices/" + firstDevice;
        http.perform(delete(path).param("checkedAt", latest)).andExpect(status().isUnauthorized());
        asCustomer(delete(path).param("checkedAt", latest), other).andExpect(status().isNotFound());
        asCustomer(delete(path).param("checkedAt", firstCheck.toString()), customer).andExpect(status().isNotFound());
        asCustomer(get(SUPPORT), customer).andExpect(status().isOk()).andExpect(jsonPath("$.grant").isNotEmpty());

        asCustomer(delete(path).param("checkedAt", latest), customer).andExpect(status().isNoContent())
                .andExpect(header().string("Cache-Control", "no-store"));
        asCustomer(get(REPORTS), customer).andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.reports.length()").value(1))
                .andExpect(jsonPath("$.reports[0].deviceLabel").value("Second PC"));
        asCustomer(get(SUPPORT), customer).andExpect(status().isOk()).andExpect(jsonPath("$.grant").isEmpty());
        asCustomer(get(DOCKS + "/devices"), customer).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    private String enrol(String customer, UUID installation, String label) throws Exception {
        return response(asCustomer(body(post(DOCKS + "/devices"),
                Map.of("installationId", installation, "label", label)), customer)
                .andExpect(status().isOk())).get("id").asText();
    }

    private ResultActions redeem(String customer, UUID installation, String code) throws Exception {
        return asCustomer(body(post(DOCKS + "/access-key/redeem"),
                Map.of("installationId", installation, "code", code)), customer);
    }

    private String entitlement(UUID installation) {
        return DOCKS + "/entitlement?installationId=" + installation;
    }

    private String signIn() throws Exception {
        var email = "pilot-" + UUID.randomUUID() + "@example.invalid";
        delivered.set(null);
        http.perform(body(post(DOCKS + "/auth/email/request"), Map.of("email", email))).andExpect(status().isAccepted());
        var match = Pattern.compile("<strong>([A-Za-z0-9_-]{43})</strong>").matcher(delivered.get().html());
        assertTrue(match.find(), "The captured fixture email contains a sign-in code");
        var code = Map.of("code", match.group(1));
        String token = response(http.perform(body(post(DOCKS + "/auth/email/exchange"), code)).andExpect(status().isOk()))
                .get("accessToken").asText();
        http.perform(body(post(DOCKS + "/auth/email/exchange"), code)).andExpect(status().isUnauthorized());
        return token;
    }

    private MockHttpServletRequestBuilder asOwner(MockHttpServletRequestBuilder request) {
        return request.session(owner).header(ownerCsrf.get("headerName").asText(), ownerCsrf.get("token").asText());
    }

    private ResultActions asCustomer(MockHttpServletRequestBuilder request, String token) throws Exception {
        return http.perform(request.header("Authorization", "Bearer " + token));
    }

    private MockHttpServletRequestBuilder body(MockHttpServletRequestBuilder request, Object value) throws Exception {
        return request.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(value));
    }

    private JsonNode response(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsByteArray());
    }
}
