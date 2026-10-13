package com.crystalpower.website.security;

import com.crystalpower.website.service.TeamAuthenticationService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class TeamSessionFilter extends OncePerRequestFilter {
    private final TeamAuthenticationService teams;
    public TeamSessionFilter(TeamAuthenticationService teams) { this.teams = teams; }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/team/")) {
            response.setHeader("Cache-Control", "no-store"); response.setHeader("X-Robots-Tag", "noindex, nofollow");
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.getPrincipal() instanceof TeamPrincipal principal) {
                try {
                    if (!teams.valid(principal)) {
                        SecurityContextHolder.clearContext(); var session = request.getSession(false); if (session != null) session.invalidate();
                        response.setStatus(401); response.setContentType("application/json"); response.getWriter().write("{\"success\":false,\"message\":\"Your team session has ended. Sign in again.\"}"); return;
                    }
                } catch (org.springframework.dao.DataAccessException failure) {
                    response.setStatus(503); response.setContentType("application/json"); response.getWriter().write("{\"success\":false,\"message\":\"The team workspace is temporarily unavailable.\"}"); return;
                }
            }
        }
        chain.doFilter(request, response);
    }
}
