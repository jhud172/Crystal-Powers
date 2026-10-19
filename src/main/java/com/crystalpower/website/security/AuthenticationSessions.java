package com.crystalpower.website.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import java.util.function.Supplier;

/** Publish credential results only into the live session that began their work. */
public final class AuthenticationSessions {
    private AuthenticationSessions() {}

    public static <T> T inSession(HttpServletRequest request, HttpSession expected, Supplier<T> action) {
        try {
            synchronized (expected) {
                if (request.getSession(false) != expected) throw ended();
                expected.getCreationTime();
                return action.get();
            }
        } catch (IllegalStateException expired) { throw ended(); }
    }

    /** Preserve the configured repository while forbidding implicit session creation during publication. */
    public static HttpServletRequest existingSessionRequest(HttpServletRequest request, HttpSession expected) {
        return new HttpServletRequestWrapper(request) {
            @Override public HttpSession getSession(boolean create) {
                var current = super.getSession(false);
                if (current != expected) throw ended();
                return current;
            }
            @Override public HttpSession getSession() { return getSession(false); }
        };
    }

    public static void endSession(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session != null) synchronized (session) {
            try { session.invalidate(); } catch (IllegalStateException alreadyEnded) { /* Idempotent logout. */ }
        }
        SecurityContextHolder.clearContext();
    }

    public static ResponseStatusException ended() {
        SecurityContextHolder.clearContext();
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in again to continue.");
    }
}
