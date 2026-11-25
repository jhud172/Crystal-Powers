package com.crystalpower.website.service;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

@Component
public class DocksPilotAccess {
    private final boolean restricted;
    private final Set<String> addresses;

    public DocksPilotAccess(Environment environment) {
        restricted = environment.acceptsProfiles(Profiles.of("docks-pilot"));
        addresses = restricted
                ? Arrays.stream(environment.getProperty("DOCKS_PILOT_ALLOWED_EMAILS", "").split(","))
                    .map(DocksEmailSignIn::normaliseEmail)
                    .filter(address -> address.matches("[^@\\s,]+@[^@\\s,]+"))
                    .collect(Collectors.toUnmodifiableSet())
                : Set.of();
    }

    boolean restricted() { return restricted; }
    boolean available() { return !restricted || !addresses.isEmpty(); }

    boolean allows(String email) {
        return !restricted || email != null && addresses.contains(DocksEmailSignIn.normaliseEmail(email));
    }

    boolean allows(GoogleDocksProvider.Identity identity) {
        return !restricted || identity.authoritativeEmail() && allows(identity.email());
    }
}
