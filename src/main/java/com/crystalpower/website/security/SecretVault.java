package com.crystalpower.website.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class SecretVault {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SecretVault(@Value("${app.security.encryption-key:}") String configured, Environment environment) throws Exception {
        String encoded = configured;
        if (encoded.isBlank() && environment.acceptsProfiles(Profiles.of("local"))) {
            Path localKey = Path.of(".codex-runtime", "security", "owner.key");
            Files.createDirectories(localKey.getParent());
            if (!Files.exists(localKey)) {
                byte[] bytes = new byte[32];
                random.nextBytes(bytes);
                Files.writeString(localKey, Base64.getEncoder().encodeToString(bytes));
            }
            encoded = Files.readString(localKey).trim();
        }
        if (encoded.isBlank()) throw new IllegalStateException("APP_ENCRYPTION_KEY must contain a base64-encoded 32-byte key.");
        byte[] bytes = Base64.getDecoder().decode(encoded);
        if (bytes.length != 32) throw new IllegalStateException("APP_ENCRYPTION_KEY must decode to 32 bytes.");
        this.key = new SecretKeySpec(bytes, "AES");
    }

    public String encrypt(String secret) {
        try {
            byte[] nonce = new byte[12];
            random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
        } catch (Exception exception) { throw new IllegalStateException("Secret encryption failed", exception); }
    }

    public String decrypt(String encoded) {
        try {
            ByteBuffer buffer = ByteBuffer.wrap(Base64.getDecoder().decode(encoded));
            byte[] nonce = new byte[12];
            buffer.get(nonce);
            byte[] ciphertext = new byte[buffer.remaining()];
            buffer.get(ciphertext);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (Exception exception) { throw new IllegalStateException("Secret decryption failed", exception); }
    }
}
