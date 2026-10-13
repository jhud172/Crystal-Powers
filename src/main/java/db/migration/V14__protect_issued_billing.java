package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.util.ArrayList;

public class V14__protect_issued_billing extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection=context.getConnection();
        if(!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL")) return;
        try(var statement=connection.createStatement()) {
            var roles=new ArrayList<String>(); roles.add("PUBLIC");
            for(String role:new String[]{"anon","authenticated"}) { try(var result=statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='"+role+"'")) { if(result.next()) roles.add(role); } }
            for(String table:new String[]{"billing_customer","billing_intent","billing_checkout_attempt","billing_stripe_event"}) {
                statement.execute("ALTER TABLE public."+table+" ENABLE ROW LEVEL SECURITY");
                for(String role:roles) statement.execute("REVOKE ALL ON public."+table+" FROM "+role);
            }
        }
    }
}
