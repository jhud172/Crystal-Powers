package com.crystalpower.website.service;

import com.crystalpower.website.repository.BillingFlowRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BillingEventStore {
    private final BillingFlowRepository flow;
    public BillingEventStore(BillingFlowRepository flow) { this.flow=flow; }
    @Transactional public void completeRefund(BillingFlowRepository.Event expected) {
        var current=flow.event(expected.id(),true).orElseThrow();if(!current.type().equals(expected.type()) || !current.objectId().equals(expected.objectId()) || current.liveMode()!=expected.liveMode() || current.created()!=expected.created())throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,"This refund event changed and requires review.");
        if(!current.state().equals("DONE"))flow.eventDone(expected.id());
    }
    @Transactional public void failure(String id) { flow.eventFailure(id); }
    @Transactional public void accept(String id,String type,String object,long created,boolean liveMode) { var existing=flow.event(id,false); if(existing.isEmpty()) flow.event(id,type,object,created,liveMode); else if(!existing.get().type().equals(type) || !existing.get().objectId().equals(object) || existing.get().liveMode()!=liveMode || existing.get().created()!=created) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"This payment event conflicts with its saved reference."); }
}
