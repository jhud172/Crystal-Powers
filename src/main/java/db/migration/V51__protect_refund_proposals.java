package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V51__protect_refund_proposals extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection=context.getConnection();if(!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL"))return;
        try(var statement=connection.createStatement()){
            statement.execute("ALTER TABLE public.billing_refund_request ENABLE ROW LEVEL SECURITY");
            statement.execute("REVOKE ALL ON public.billing_refund_request FROM PUBLIC");
            for(String role:new String[]{"anon","authenticated"}){
                boolean exists;try(var result=statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='"+role+"'")){exists=result.next();}
                if(exists)statement.execute("REVOKE ALL ON public.billing_refund_request FROM "+role);
            }
        }
    }
}
