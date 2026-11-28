package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V112__docks_client_product_links extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        try (var statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE docks_client_link (
                        docks_account_id UUID PRIMARY KEY REFERENCES docks_account(id) ON DELETE CASCADE,
                        client_account_id UUID NOT NULL UNIQUE REFERENCES client_account(id) ON DELETE CASCADE,
                        client_credentials_version INTEGER NOT NULL
                    )
                    """);
            if (!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
            statement.execute("ALTER TABLE docks_client_link ENABLE ROW LEVEL SECURITY");
            statement.execute("REVOKE ALL ON docks_client_link FROM PUBLIC");
            for (String role : new String[]{"anon", "authenticated", "service_role"}) {
                boolean present;
                try (var result = statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='" + role + "'")) {
                    present = result.next();
                }
                if (present) statement.execute("REVOKE ALL ON docks_client_link FROM " + role);
            }
        }
    }
}
