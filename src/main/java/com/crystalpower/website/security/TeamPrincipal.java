package com.crystalpower.website.security;

import java.io.Serializable;
import java.util.UUID;

public record TeamPrincipal(UUID id, UUID workspaceId, String email, String displayName, TeamRole role, int credentialsVersion) implements Serializable {}
