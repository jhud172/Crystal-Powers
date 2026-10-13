package com.crystalpower.website.security;

import com.crystalpower.website.service.ClientAccessService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

public class ClientSessionFilter extends OncePerRequestFilter {
    private final ClientAccessService clients;
    public ClientSessionFilter(ClientAccessService clients) { this.clients=clients; }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if(request.getRequestURI().startsWith("/api/client/")) {
            response.setHeader("Cache-Control","no-store"); response.setHeader("X-Robots-Tag","noindex, nofollow");
            var auth=SecurityContextHolder.getContext().getAuthentication();
            if(auth!=null && auth.getPrincipal() instanceof ClientPrincipal principal) {
                try {
                    if(!clients.valid(principal)) {
                        SecurityContextHolder.clearContext(); var session=request.getSession(false); if(session!=null) session.invalidate();
                        response.setStatus(401); response.setContentType("application/json"); response.getWriter().write("{\"success\":false,\"message\":\"Your client session has ended. Sign in again.\"}"); return;
                    }
                } catch(org.springframework.dao.DataAccessException failure) { response.setStatus(503); response.setContentType("application/json"); response.getWriter().write("{\"success\":false,\"message\":\"The client workspace is temporarily unavailable.\"}"); return; }
            }
        }
        chain.doFilter(request,response);
    }
}
