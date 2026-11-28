package com.crystalpower.website.service;

import com.crystalpower.website.security.ClientPrincipal;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProductAccountLinks {
    public static final String BROWSER_GRANT = ProductAccountLinks.class.getName() + ".browserGrant";
    private final DocksEmailSignIn docks;
    private final JdbcTemplate db;

    public ProductAccountLinks(DocksEmailSignIn docks, JdbcTemplate db) {
        this.docks = docks;
        this.db = db;
    }

    public Optional<ClientPrincipal> client(String grant) {
        return docks.browserAccount(grant).flatMap(account -> db.query("""
                SELECT c.id, c.workspace_id, c.display_name, c.credentials_version
                FROM docks_client_link link JOIN client_account c ON c.id = link.client_account_id
                WHERE link.docks_account_id = ? AND c.state = 'ACTIVE'
                  AND c.credentials_version = link.client_credentials_version
                """, (row, i) -> new ClientPrincipal(row.getObject("id", UUID.class),
                row.getObject("workspace_id", UUID.class), row.getString("display_name"),
                row.getInt("credentials_version")), account).stream().findFirst());
    }

    public boolean valid(String grant, ClientPrincipal principal) {
        return client(grant).filter(current -> current.id().equals(principal.id())
                && current.workspaceId().equals(principal.workspaceId())
                && current.credentialsVersion() == principal.credentialsVersion()).isPresent();
    }

    @Transactional
    public void link(String grant, ClientPrincipal client) {
        UUID account = account(grant);
        db.queryForObject("SELECT id FROM docks_account WHERE id = ? FOR UPDATE", UUID.class, account);
        int refreshed = db.update("""
                UPDATE docks_client_link SET client_credentials_version = ?
                WHERE docks_account_id = ? AND client_account_id = ?
                """, client.credentialsVersion(), account, client.id());
        if (refreshed != 0) return;
        try {
            db.update("""
                    INSERT INTO docks_client_link(docks_account_id, client_account_id, client_credentials_version)
                    VALUES (?, ?, ?)
                    """, account, client.id(), client.credentialsVersion());
        } catch (DuplicateKeyException conflict) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "One of these accounts already has a workspace link.");
        }
    }

    public void unlink(String grant) {
        db.update("DELETE FROM docks_client_link WHERE docks_account_id = ?", account(grant));
    }

    private UUID account(String grant) {
        return docks.browserAccount(grant).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in to the product dashboard again."));
    }
}
