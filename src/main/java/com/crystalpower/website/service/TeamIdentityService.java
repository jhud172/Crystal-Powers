package com.crystalpower.website.service;

import com.crystalpower.website.repository.OwnerRepository;
import com.crystalpower.website.repository.TeamIdentityRepository;
import com.crystalpower.website.repository.TeamIdentityRepository.Member;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import java.time.Instant;


import java.util.HexFormat;
import java.util.List;

import java.util.UUID;

@Service
public class TeamIdentityService {
    public record Created(Member member, String invitationPath, Instant expiresAt) {}
    private final TeamIdentityRepository teams;
    private final OwnerRepository owners;
    private final PasswordEncoder passwords;

    public TeamIdentityService(TeamIdentityRepository teams, OwnerRepository owners, PasswordEncoder passwords) { this.teams = teams; this.owners = owners; this.passwords = passwords; }
    @Transactional
    public List<Member> members(UUID owner) { return teams.members(workspace(owner)); }
    @Transactional
    public UUID workspaceId(UUID owner) { return workspace(owner); }
    @Transactional
    public void activate(String token, String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a password of at most 72 UTF-8 bytes.");
        String digest = hash(token);
        var candidate = teams.invitation(digest).orElseThrow(TeamIdentityService::invalidInvitation);
        var target = teams.credentials(candidate.accountId(),false).orElseThrow(TeamIdentityService::invalidInvitation);
        teams.lockWorkspace(target.member().workspaceId());
        var account = teams.credentials(candidate.accountId(),true).orElseThrow(TeamIdentityService::invalidInvitation);
        var invitation = teams.lockInvitation(digest).orElseThrow(TeamIdentityService::invalidInvitation);
        if(!invitation.accountId().equals(account.member().id()) || !account.member().state().equals("INVITED")) throw invalidInvitation();
        if (!invitation.expiresAt().isAfter(Instant.now())) throw invalidInvitation();
        if (teams.activate(invitation.accountId(), passwords.encode(password)) != 1) throw invalidInvitation();
        teams.consume(digest);
        teams.auditMember(invitation.accountId(), "TEAM_ACCOUNT_ACTIVATED");
    }
    private UUID workspace(UUID owner) {
        owners.lock(owner).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in."));
        return teams.workspace(owner).orElseGet(() -> teams.createWorkspace(owner));
    }
    private static ResponseStatusException invalidInvitation() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "This invitation is unavailable or expired. Ask your admin for a new invitation."); }
    private static String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException impossible) { throw new IllegalStateException("SHA-256 unavailable", impossible); }
    }
}
