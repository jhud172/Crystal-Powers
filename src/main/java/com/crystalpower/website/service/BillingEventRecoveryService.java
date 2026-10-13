package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingFlowRepository;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingEventRecoveryService {
    public record Page(List<BillingFlowRepository.PendingEvent> events,String nextCursor,BillingFlowRepository.EventTotals totals,long serverTime) {}
    private final BillingEventProcessor processor;
    private final BillingEventStore store;
    private final BillingFlowRepository flow;
    private final TeamAccessService access;
    private final StripeGateway stripe;
    private final RefundWebhookService refundEvents;
    public BillingEventRecoveryService(BillingEventProcessor processor,BillingEventStore store,BillingFlowRepository flow,TeamAccessService access,StripeGateway stripe,RefundWebhookService refundEvents) { this.processor=processor;this.store=store;this.flow=flow;this.access=access;this.stripe=stripe;this.refundEvents=refundEvents; }
    public void process(String id) {
        try { var event=flow.event(id,false).orElseThrow();if(BillingEventProcessor.refundEvent(event.type()))refundEvents.process(id);else processor.process(id); }
        catch(RuntimeException failure) { try { store.failure(id); } catch(RuntimeException unavailable) { /* The committed inbox remains pending when the database is unavailable. */ } throw failure; }
    }
    @Transactional(readOnly=true)
    public Page list(Authentication auth,String filter,String after) {
        access.resolve(auth).require(TeamPermission.MANAGE_BILLING);
        if(!List.of("ALL","DUE","WAITING","REVIEW").contains(filter))throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Choose a supported event filter.");
        long now=Instant.now().getEpochSecond();
        var cursor=after==null ? null : flow.eventCursor(stripe.liveMode(),after).orElseThrow(()->new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"This event cursor is unavailable. Refresh the queue."));
        var result=flow.pendingEvents(stripe.liveMode(),filter,cursor,now);boolean more=result.size()>50;
        var events=more ? result.subList(0,50) : result;
        return new Page(events,more ? events.get(events.size()-1).id() : null,flow.eventTotals(stripe.liveMode(),now),now);
    }
    public void retry(Authentication auth,String id) { access.resolve(auth).require(TeamPermission.MANAGE_BILLING); var event=flow.event(id,false).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"This pending billing event is unavailable.")); if(event.liveMode()!=stripe.liveMode()) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"This pending billing event is unavailable."); stripe.requireConnected(); process(id); }
    public void recoverDue() { if(!stripe.connected()) return; for(String id:flow.dueEvents(stripe.liveMode(),Instant.now().getEpochSecond())) { try { process(id); } catch(RuntimeException failure) { /* Backoff and the admin queue retain the failed event without logging private payloads. */ } } }
}
