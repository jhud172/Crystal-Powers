package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Supabase's browser-facing roles must never bypass the application's owner/publication checks. */
public class V3__protect_hosted_database extends BaseJavaMigration {
    @Override
    public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        if (!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        String[] tables = {"admin_account", "recovery_code", "password_reset", "project", "project_revision", "project_media", "admin_audit"};
        try (var statement = connection.createStatement()) {
            for (String table : tables) {
                statement.execute("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY");
                statement.execute("REVOKE ALL ON public." + table + " FROM PUBLIC");
            }
            for (String role : new String[]{"anon", "authenticated"}) {
                boolean exists;
                try (var result = statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname = '" + role + "'")) { exists = result.next(); }
                if (exists) {
                    for (String table : tables) statement.execute("REVOKE ALL ON public." + table + " FROM " + role);
                    statement.execute("REVOKE ALL ON public.flyway_schema_history FROM " + role);
                }
            }
            statement.execute("REVOKE ALL ON public.flyway_schema_history FROM PUBLIC");
        }
    }
}
