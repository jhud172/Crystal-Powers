package com.crystalpower.website.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.web.server.ResponseStatusException;

class DocksStripeDeliveryQueueTests {
    @Test
    void queueSurvivesFailureAndRestartAndSerializesClaimsAcrossWorkers() throws Exception {
        var database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2)
                .addScript("classpath:db/migration/V104__docks_stripe_event_queue.sql").build();
        var threads = Executors.newFixedThreadPool(2);
        var started = new CountDownLatch(1);
        var resume = new CountDownLatch(1);
        try {
            var db = new JdbcTemplate(database);
            var stripe = mock(StripeGateway.class);
            when(stripe.connected()).thenReturn(true);
            var mode = new DocksBillingMode(stripe, true, true, false, "whsec_Fixture");
            var events = mock(DocksStripeEvents.class);
            var clock = Clock.fixed(Instant.ofEpochSecond(1800000000), ZoneOffset.UTC);
            var delivery = new DocksStripeEvents.Delivery("evt_Fixture", "invoice.paid", false,
                    new DocksStripeEvents.Reference("sub_Fixture", UUID.randomUUID(), null), null);
            byte[] body = {1};
            when(events.authenticate(body, "fixture")).thenReturn(Optional.of(delivery));
            var initial = new DocksStripeDeliveryQueue(db, events, mode, clock);
            initial.receive(body, "fixture");
            initial.receive(body, "fixture");
            verify(events, never()).process(any());
            assertEquals(1, initial.pending().size());
            var conflicting = new DocksStripeEvents.Delivery(delivery.id(), "invoice.payment_failed", false,
                    delivery.subscription(), null);
            when(events.authenticate(body, "conflicting")).thenReturn(Optional.of(conflicting));
            assertEquals(400, assertThrows(ResponseStatusException.class,
                    () -> initial.receive(body, "conflicting")).getStatusCode().value());

            doThrow(new IllegalStateException("temporary provider outage")).when(events).process(delivery);
            initial.recoverDue();
            initial.recoverDue();
            verify(events, times(1)).process(delivery);
            assertEquals(1800000030L, initial.pending().get(0).nextAttemptEpoch());
            var later = Clock.offset(clock, java.time.Duration.ofSeconds(31));
            var restarted = new DocksStripeDeliveryQueue(db, events, mode, later);
            var competitor = new DocksStripeDeliveryQueue(db, events, mode, later);
            doAnswer(call -> {
                started.countDown();
                assertTrue(resume.await(5, TimeUnit.SECONDS));
                return null;
            }).when(events).process(delivery);
            var processing = threads.submit(restarted::recoverDue);
            assertTrue(started.await(5, TimeUnit.SECONDS));
            assertEquals("processing", restarted.pending().get(0).state());
            assertThrows(ResponseStatusException.class, () -> competitor.retry(delivery.id(), UUID.randomUUID()));
            threads.submit(competitor::recoverDue).get(5, TimeUnit.SECONDS);
            resume.countDown();
            processing.get(5, TimeUnit.SECONDS);
            assertTrue(restarted.pending().isEmpty());
            verify(events, times(2)).process(delivery);
            competitor.receive(body, "fixture");
            competitor.recoverDue();
            verify(events, times(2)).process(delivery);

            db.update("UPDATE docks_stripe_delivery SET attempts = 8, finished_at_epoch = NULL WHERE event_id = ?",
                    delivery.id());
            assertEquals("review", restarted.pending().get(0).state());
            UUID owner = UUID.randomUUID();
            restarted.retry(delivery.id(), owner);
            assertEquals(owner, db.queryForObject("SELECT retried_by FROM docks_stripe_delivery WHERE event_id = ?",
                    UUID.class, delivery.id()));
            assertEquals(0, restarted.pending().get(0).attempts());
            restarted.recoverDue();
            assertTrue(restarted.pending().isEmpty());
        } finally {
            resume.countDown();
            threads.shutdownNow();
            database.shutdown();
        }
    }
}
