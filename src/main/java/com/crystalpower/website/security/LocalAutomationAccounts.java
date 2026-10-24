package com.crystalpower.website.security;

import com.crystalpower.website.repository.TeamIdentityRepository.Member;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.util.Set;

/** Reserved automation identities fail closed outside a loopback local H2 runtime. */
@Component
public class LocalAutomationAccounts {
    public static final String EMAIL = "codex@local.crystal.invalid";
    private final Environment environment;
    public LocalAutomationAccounts(Environment environment) { this.environment = environment; }
    public boolean allowed(Member member) {
        if (!member.email().toLowerCase(java.util.Locale.ROOT).endsWith("@local.crystal.invalid")) return true;
        try {
            var host = URI.create(environment.getProperty("app.public-url", "")).getHost();
            return environment.acceptsProfiles(Profiles.of("local"))
                    && environment.getProperty("spring.datasource.url", "").startsWith("jdbc:h2:file:")
                    && Set.of("127.0.0.1", "localhost", "[::1]", "::1").contains(host == null ? "" : host)
                    && Set.of("127.0.0.1", "::1").contains(environment.getProperty("server.address", ""));
        } catch (IllegalArgumentException invalid) { return false; }
    }
}
