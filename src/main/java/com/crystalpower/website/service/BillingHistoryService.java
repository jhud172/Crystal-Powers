package com.crystalpower.website.service;

import com.crystalpower.website.repository.*;
import com.crystalpower.website.security.TeamPermission;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@Service
public class BillingHistoryService {
    public record Page(List<BillingHistoryRepository.Observation> items,String nextCursor,boolean liveMode) {}
    private final TeamAccessService access;
    private final BillingRepository bills;
    private final BillingFlowRepository flow;
    private final BillingHistoryRepository history;
    private final StripeGateway stripe;
    private final SupportRepository requests;
    public BillingHistoryService(TeamAccessService access,BillingRepository bills,BillingFlowRepository flow,BillingHistoryRepository history,StripeGateway stripe,SupportRepository requests) { this.access=access;this.bills=bills;this.flow=flow;this.history=history;this.stripe=stripe;this.requests=requests; }
    @Transactional public Page page(Authentication auth,UUID request,UUID bill,String before) {
        var actor=access.resolve(auth);actor.require(TeamPermission.READ_SUPPORT);requests.request(actor.workspaceId(),request,false).orElseThrow(BillingHistoryService::missing);var draft=bills.draft(bill).orElseThrow(BillingHistoryService::missing);
        if(!draft.workspaceId().equals(actor.workspaceId()) || !draft.requestId().equals(request))throw missing();
        var intent=flow.intent(bill,false).orElseThrow(BillingHistoryService::missing);if(intent.liveMode()!=stripe.liveMode())throw missing();Long cursor=null;
        if(before!=null){try{if(!before.matches("[1-9][0-9]{0,18}"))throw new IllegalArgumentException();cursor=Long.parseLong(before);}catch(IllegalArgumentException invalid){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"This billing history cursor is invalid.");}if(!history.cursor(bill,intent.liveMode(),cursor))throw missing();}
        var rows=history.page(bill,intent.liveMode(),cursor);boolean more=rows.size()>50;var items=more ? rows.subList(0,50) : rows;return new Page(items,more ? items.get(items.size()-1).id() : null,intent.liveMode());
    }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND,"This billing history is unavailable."); }
}
