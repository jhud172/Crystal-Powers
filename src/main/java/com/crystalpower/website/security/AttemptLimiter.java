package com.crystalpower.website.security;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;

/** Bounded limiter; keys use direct peer addresses, never untrusted forwarded headers. */
@Component
public class AttemptLimiter {
    private record Window(long until, int attempts) {}
    private final Map<String, Window> attempts = new HashMap<>();
    private final Clock clock;
    public AttemptLimiter() { this(Clock.systemUTC()); }
    AttemptLimiter(Clock clock) { this.clock = clock; }

    public synchronized void check(String key, int maximum, long seconds) {
        long now = clock.instant().getEpochSecond();
        attempts.entrySet().removeIf(entry -> entry.getValue().until() <= now);
        Window window = attempts.get(key);
        if (window == null) {
            if (attempts.size() >= 10000) throw limited();
            window = new Window(now + seconds, 0);
        }
        if (window.attempts() >= maximum) throw limited();
        attempts.put(key, new Window(window.until(), window.attempts() + 1));
    }
    private static ResponseStatusException limited() {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please wait before trying again.");
    }
}
