package com.crystalpower.website.security;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import org.apache.commons.codec.binary.Base32;
import org.springframework.stereotype.Component;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.OptionalLong;

@Component
public class TotpService {
    private final TimeBasedOneTimePasswordGenerator generator = new TimeBasedOneTimePasswordGenerator();
    private final SecureRandom random = new SecureRandom();

    public String createSecret() {
        byte[] bytes = new byte[20];
        random.nextBytes(bytes);
        return new Base32().encodeAsString(bytes).replace("=", "");
    }

    public OptionalLong verify(String secret, String supplied, long lastAcceptedStep, Instant now) {
        if (supplied == null || !supplied.matches("[0-9]{6}")) return OptionalLong.empty();
        var key = new SecretKeySpec(new Base32().decode(secret), generator.getAlgorithm());
        long current = now.getEpochSecond() / 30;
        try {
            for (long step = current - 1; step <= current + 1; step++) {
                if (step <= lastAcceptedStep) continue;
                String expected = generator.generateOneTimePasswordString(key, Instant.ofEpochSecond(step * 30));
                if (MessageDigest.isEqual(expected.getBytes(StandardCharsets.US_ASCII), supplied.getBytes(StandardCharsets.US_ASCII))) return OptionalLong.of(step);
            }
        } catch (Exception exception) { throw new IllegalStateException("Authenticator verification failed", exception); }
        return OptionalLong.empty();
    }
}
