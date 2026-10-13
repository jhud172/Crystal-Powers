package com.crystalpower.website.security;

import java.io.Serializable;
import java.util.UUID;

public record ClientPrincipal(UUID id, UUID workspaceId, String displayName, int credentialsVersion) implements Serializable {}
