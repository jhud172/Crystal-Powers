package db.migration;

import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V105__protect_docks_database extends BaseJavaMigration {
    private static final List<String> TABLES = List.of(
            "docks_account", "docks_identity", "docks_device",
            "docks_email_challenge", "docks_email_rate", "docks_email_gate", "docks_session",
            "docks_trial", "docks_access_key", "docks_access_key_device", "docks_access_key_audit",
            "docks_report_consent", "docks_device_report", "docks_report_support_grant", "docks_report_support_audit",
            "docks_subscription_checkout", "docks_subscription_status", "docks_subscription_event",
            "docks_subscription_seat", "docks_household_invitation", "docks_subscription_payment_risk", "docks_stripe_delivery",
            "docks_google_challenge", "docks_google_ticket", "docks_research_consent", "docks_research_contribution",
            "docks_ai_budget_gate", "docks_ai_budget", "docks_ai_allowance", "docks_support_diagnostic_log");

    @Override
    public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        if (!"PostgreSQL".equals(connection.getMetaData().getDatabaseProductName())) return;
        try (var statement = connection.createStatement()) {
            var roles = new ArrayList<String>();
            roles.add("PUBLIC");
            try (var available = statement.executeQuery("""
                    SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')
                    """)) {
                while (available.next()) roles.add(available.getString(1));
            }
            String revoked = String.join(", ", roles);
            for (String table : TABLES) {
                statement.execute("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY");
                statement.execute("REVOKE ALL ON public." + table + " FROM " + revoked);
            }
        }
    }
}
