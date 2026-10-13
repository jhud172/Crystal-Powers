package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V40__protect_invoice_allocation_jobs extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection=context.getConnection();if(!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL"))return;
        try(var statement=connection.createStatement()) {
            for(String table:new String[]{"billing_payment_mutex","billing_invoice_sync","billing_invoice_allocation"}) {
                statement.execute("ALTER TABLE public."+table+" ENABLE ROW LEVEL SECURITY");statement.execute("REVOKE ALL ON public."+table+" FROM PUBLIC");
                for(String role:new String[]{"anon","authenticated"}){boolean exists;try(var result=statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='"+role+"'")){exists=result.next();}if(exists)statement.execute("REVOKE ALL ON public."+table+" FROM "+role);}
            }
        }
    }
}
