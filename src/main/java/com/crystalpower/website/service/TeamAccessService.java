package com.crystalpower.website.service;

import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.security.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.Set;
import java.util.UUID;

/** Resolves live capability grants; a team admin is never promoted to the protected owner. */
@Service
public class TeamAccessService {
    public record Actor(UUID workspaceId, UUID ownerId, UUID memberId, String name, Set<TeamPermission> permissions) {
        public void require(TeamPermission permission) { if (!permissions.contains(permission)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your role does not allow this action."); }
        public boolean audience(String audience) {
            return switch (audience) {
                case "TEAM" -> permissions.contains(TeamPermission.READ_CHANNELS);
                case "SUPPORT" -> permissions.contains(TeamPermission.READ_SUPPORT);
                case "MODERATION" -> permissions.contains(TeamPermission.REVIEW_UPLOADS);
                case "ADMIN" -> permissions.contains(TeamPermission.MANAGE_MEMBERS);
                default -> false;
            };
        }
    }
    private final TeamIdentityService identities;
    private final TeamIdentityRepository repository;
    private final TeamRoleResolver roles;
    public TeamAccessService(TeamIdentityService identities, TeamIdentityRepository repository, TeamRoleResolver roles) { this.identities = identities; this.repository = repository; this.roles = roles; }
    public Actor resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
        if (authentication.getPrincipal() instanceof OwnerPrincipal owner) return new Actor(identities.workspaceId(owner.id()), owner.id(), null, "James", TeamRole.ADMIN.permissions());
        if (authentication.getPrincipal() instanceof TeamPrincipal principal) {
            var current = repository.credentials(principal.id(), false).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again."));
            var member = current.member();
            if (!member.state().equals("ACTIVE") || !current.mfaEnabled() || member.credentialsVersion() != principal.credentialsVersion() || !member.workspaceId().equals(principal.workspaceId())) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in again.");
            return new Actor(member.workspaceId(), null, member.id(), member.displayName(), roles.permissions(member));
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in.");
    }
}
