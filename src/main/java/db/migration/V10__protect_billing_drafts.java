package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Billing records never inherit public browser access on a hosted database. */
public class V10__protect_billing_drafts extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        if (!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        try (var statement = connection.createStatement()) {
            statement.execute("ALTER TABLE public.billing_payment_request ENABLE ROW LEVEL SECURITY");
            statement.execute("REVOKE ALL ON public.billing_payment_request FROM PUBLIC");
            for (String role : new String[]{"anon", "authenticated"}) {
                boolean exists;
                try (var result = statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname = '" + role + "'")) { exists = result.next(); }
                if (exists) statement.execute("REVOKE ALL ON public.billing_payment_request FROM " + role);
            }
        }
    }
}
