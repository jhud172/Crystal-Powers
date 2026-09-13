package com.crystalpower.website.security;

import java.io.Serializable;
import java.util.UUID;

public record OwnerPrincipal(UUID id, String email, int credentialsVersion) implements Serializable {}
