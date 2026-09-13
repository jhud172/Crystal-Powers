package com.crystalpower.website.security;

import com.crystalpower.website.service.OwnerService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class OwnerSessionFilter extends OncePerRequestFilter {
    private final OwnerService owners;
    public OwnerSessionFilter(OwnerService owners) { this.owners = owners; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws ServletException, IOException {
        if (request.getRequestURI().startsWith("/api/admin/")) {
            response.setHeader("Cache-Control", "no-store");
            response.setHeader("X-Robots-Tag", "noindex, nofollow");
            var authentication = SecurityContextHolder.getContext().getAuthentication();
            boolean invalid = false;
            if (authentication != null && authentication.getPrincipal() instanceof OwnerPrincipal owner) {
                try { invalid = !owners.valid(owner); }
                catch (org.springframework.dao.DataAccessException exception) {
                    response.setStatus(503); response.setContentType("application/json");
                    response.getWriter().write("{\"success\":false,\"message\":\"The owner studio is temporarily unavailable. Your changes have not been confirmed.\"}"); return;
                }
            }
            if (invalid) {
                SecurityContextHolder.clearContext();
                var session = request.getSession(false);
                if (session != null) session.invalidate();
                response.setStatus(401);
                response.setContentType("application/json");
                response.getWriter().write("{\"success\":false,\"message\":\"Your session has expired. Please sign in again.\"}");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
