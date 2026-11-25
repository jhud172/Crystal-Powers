package com.crystalpower.website.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import com.crystalpower.website.service.OwnerService;
import com.crystalpower.website.service.TeamAuthenticationService;
import com.crystalpower.website.service.ClientAccessService;

@Configuration
public class SecurityConfiguration {
    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(12); }

    @Bean
    HttpSessionSecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    HttpSessionCsrfTokenRepository csrfTokenRepository() { return new HttpSessionCsrfTokenRepository(); }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
            HttpSessionSecurityContextRepository contexts, HttpSessionCsrfTokenRepository csrf, OwnerService owners, TeamAuthenticationService teams, ClientAccessService clients) throws Exception {
        http.authorizeHttpRequests(authorise -> authorise
                .requestMatchers("/api/admin/auth/**").permitAll()
                .requestMatchers("/api/team/auth/**").permitAll()
                .requestMatchers("/api/client/auth/**").permitAll()
                .requestMatchers("/api/client/**").hasRole("CLIENT")
                .requestMatchers(HttpMethod.POST,"/api/billing/stripe/webhook").permitAll()
                .requestMatchers("/api/admin/**").hasRole("OWNER")
                .requestMatchers("/api/team/**").hasAnyRole("OWNER", "TEAM")
                .requestMatchers(HttpMethod.POST, "/api/docks/auth/email/request",
                        "/api/docks/auth/email/exchange", "/api/docks/auth/sign-out",
                        "/api/docks/devices", "/api/docks/trial", "/api/docks/access-key/redeem").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/devices", "/api/docks/entitlement").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/docks/devices/{id}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/reports", "/api/docks/reports/support-access").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/docks/reports", "/api/docks/reports/support-access").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/reports/support-access").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/billing/plans").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/billing/checkout", "/api/docks/billing/stripe/webhook").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/household").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/household/invitations", "/api/docks/household/invitations/{id}/accept").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/docks/household/invitations/{id}").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/docks/reports/preference", "/api/docks/reports/latest").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/research").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/diagnostic-log").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/diagnostic-log").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/docks/diagnostic-log").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/explanations/online").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/releases/windows-x64",
                        "/api/docks/releases/windows-x64/{version}/download").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/explanations/online").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/docks/auth/google", "/api/docks/auth/google/callback").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/docks/auth/google/start", "/api/docks/auth/google/exchange",
                        "/api/docks/auth/google/desktop-code", "/api/docks/auth/google/desktop-exchange").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/docks/research/preference", "/api/docks/research/contribution").permitAll()
                .requestMatchers("/api/docks", "/api/docks/**").denyAll()
                .requestMatchers(HttpMethod.GET, "/**").permitAll()
                .requestMatchers(HttpMethod.HEAD, "/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/contact", "/api/services", "/api/assistant/chat").permitAll()
                .anyRequest().denyAll())
            .securityContext(context -> context.securityContextRepository(contexts))
            .addFilterAfter(new OwnerSessionFilter(owners), SecurityContextHolderFilter.class)
            .addFilterAfter(new TeamSessionFilter(teams), OwnerSessionFilter.class)
            .addFilterAfter(new ClientSessionFilter(clients), TeamSessionFilter.class)
            .csrf(config -> config.csrfTokenRepository(csrf)
                    .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                    // Preserve existing anonymous form contracts; owner APIs always require CSRF.
                    .ignoringRequestMatchers("/api/contact", "/api/services", "/api/billing/stripe/webhook",
                            "/api/docks/auth/email/request", "/api/docks/auth/email/exchange",
                            "/api/docks/auth/sign-out", "/api/docks/devices", "/api/docks/trial",
                            "/api/docks/access-key/redeem", "/api/docks/devices/{id}",
                            "/api/docks/reports", "/api/docks/reports/preference", "/api/docks/reports/latest",
                            "/api/docks/reports/support-access",
                            "/api/docks/research/preference", "/api/docks/research/contribution",
                            "/api/docks/diagnostic-log",
                            "/api/docks/explanations/online",
                            "/api/docks/auth/google/start", "/api/docks/auth/google/exchange",
                            "/api/docks/auth/google/desktop-code", "/api/docks/auth/google/desktop-exchange",
                            "/api/docks/billing/checkout", "/api/docks/billing/stripe/webhook",
                            "/api/docks/household/invitations", "/api/docks/household/invitations/{id}/accept",
                            "/api/docks/household/invitations/{id}"))
            .formLogin(config -> config.disable())
            .httpBasic(config -> config.disable())
            .logout(config -> config.disable())
            .exceptionHandling(errors -> errors
                    .authenticationEntryPoint((request, response, exception) -> {
                        response.setStatus(401);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"success\":false,\"message\":\"Please sign in.\"}");
                    })
                    .accessDeniedHandler((request, response, exception) -> {
                        response.setStatus(403);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"success\":false,\"message\":\"This request is not permitted. Refresh and try again.\"}");
                    }))
            .headers(headers -> headers
                    // GLTFLoader fetches embedded model textures through local blob URLs before decoding them.
                    .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"))
                    .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)));
        return http.build();
    }
}
