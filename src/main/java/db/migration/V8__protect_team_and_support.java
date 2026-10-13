package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.util.ArrayList;

/** Extend the hosted access boundary without rewriting an applied migration. */
public class V8__protect_team_and_support extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        if (!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        String[] tables = {"team_workspace", "team_account", "team_invitation", "team_audit", "team_channel", "team_message", "support_request", "support_message", "support_event", "support_attachment"};
        var roles = new ArrayList<String>(); roles.add("PUBLIC");
        try (var statement = connection.createStatement()) {
            for (String role : new String[]{"anon", "authenticated"}) {
                try (var result = statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname = '" + role + "'")) { if (result.next()) roles.add(role); }
            }
            for (String table : tables) {
                statement.execute("ALTER TABLE public." + table + " ENABLE ROW LEVEL SECURITY");
                for (String role : roles) statement.execute("REVOKE ALL ON public." + table + " FROM " + role);
            }
            String sequence;
            try (var result = statement.executeQuery("SELECT pg_get_serial_sequence('public.team_message', 'id')")) { sequence = result.next() ? result.getString(1) : null; }
            if (sequence != null) {
                if (!sequence.matches("public\\.[a-z0-9_]+")) throw new IllegalStateException("Unexpected team message sequence identifier");
                for (String role : roles) statement.execute("REVOKE ALL ON SEQUENCE " + sequence + " FROM " + role);
            }
        }
    }
}
