package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.RecoveryRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OwnerRecoveryPilotTests {
    @Test
    void pilotUsesItsDedicatedSenderOnlyForAnMfaEnrolledOwner() {
        var environment = new MockEnvironment();
        environment.setActiveProfiles("docks-pilot");
        var generalMail = mock(EmailTransport.class);
        var pilotMail = mock(EmailTransport.class);
        when(generalMail.forDocksPilot("fixture-sender-key", "fixture@example.invalid")).thenReturn(pilotMail);
        var owners = mock(OwnerRepository.class);
        var resets = mock(RecoveryRepository.class);
        var recovery = new OwnerRecoveryService(owners, resets, mock(OwnerService.class), mock(PasswordEncoder.class),
                generalMail, new DocksPilotAccess(environment), "https://pilot.example.invalid",
                "fixture-sender-key", "fixture@example.invalid");

        var owner = mock(OwnerRepository.Owner.class);
        when(owner.id()).thenReturn(UUID.randomUUID());
        when(owner.email()).thenReturn("owner@example.invalid");
        when(owners.byEmail(owner.email())).thenReturn(Optional.of(owner));
        when(owners.lock(owner.id())).thenReturn(Optional.of(owner));
        recovery.request(owner.email());
        verifyNoInteractions(pilotMail, resets);

        when(owner.mfaEnabled()).thenReturn(true);
        recovery.request(owner.email());
        var sent = ArgumentCaptor.forClass(EmailTransport.Message.class);
        verify(pilotMail).send(sent.capture());
        verify(generalMail, never()).send(any(EmailTransport.Message.class));
        assertThat(sent.getValue().to()).isEqualTo(owner.email());
        assertThat(sent.getValue().html()).contains("https://pilot.example.invalid/admin/reset#");
    }
}
