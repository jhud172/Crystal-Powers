package com.crystalpower.website.api;

import com.crystalpower.website.service.ClientAccessService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team/support/requests/{request}/client-access")
public class TeamClientController {
    public record Version(@Min(0) int expectedVersion) {}
    public record Provision(@NotNull Boolean expectedLinked,@Min(0) Integer expectedVersion) {}
    private final ClientAccessService clients;
    public TeamClientController(ClientAccessService clients) { this.clients=clients; }
    @GetMapping public Object status(Authentication auth,@PathVariable UUID request) { var account=clients.status(auth,request); return account==null ? Map.of("linked",false) : Map.of("linked",true,"account",account); }
    @PostMapping public Object provision(Authentication auth,@PathVariable UUID request,@Valid @RequestBody(required=false) Provision input) { return input==null ? clients.provision(auth,request) : clients.provision(auth,request,input.expectedLinked(),input.expectedVersion()); }
    @PostMapping("/recover") public Object recover(Authentication auth,@PathVariable UUID request,@Valid @RequestBody Version version) { return clients.reset(auth,request,version.expectedVersion()); }
    @PostMapping("/suspend") public Object suspend(Authentication auth,@PathVariable UUID request,@Valid @RequestBody Version version) { clients.suspend(auth,request,version.expectedVersion()); return Map.of("success",true); }
}
