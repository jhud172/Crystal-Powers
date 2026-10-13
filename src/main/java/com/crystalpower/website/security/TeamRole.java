package com.crystalpower.website.security;

import java.util.EnumSet;
import java.util.Set;

/** Trusted role definitions; public activation never accepts a role or permissions. */
public enum TeamRole {
    ADMIN(EnumSet.allOf(TeamPermission.class)),
    MODERATOR(EnumSet.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES,
            TeamPermission.UPLOAD_FILES, TeamPermission.REVIEW_UPLOADS, TeamPermission.EDIT_UPLOADS,TeamPermission.MANAGE_MESSAGES)),
    SUPPORT(EnumSet.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES,
            TeamPermission.UPLOAD_FILES, TeamPermission.READ_SUPPORT, TeamPermission.REPLY_SUPPORT, TeamPermission.UPDATE_TRACKING)),
    MEMBER(EnumSet.of(TeamPermission.READ_CHANNELS, TeamPermission.SEND_MESSAGES, TeamPermission.UPLOAD_FILES));

    private final Set<TeamPermission> permissions;
    TeamRole(Set<TeamPermission> permissions) { this.permissions = Set.copyOf(permissions); }
    public Set<TeamPermission> permissions() { return permissions; }
}
