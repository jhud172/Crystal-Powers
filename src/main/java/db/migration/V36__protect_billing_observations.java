package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V36__protect_billing_observations extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection=context.getConnection();if(!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL"))return;
        try(var statement=connection.createStatement()) {
            statement.execute("ALTER TABLE public.billing_observation ENABLE ROW LEVEL SECURITY");statement.execute("REVOKE ALL ON public.billing_observation FROM PUBLIC");statement.execute("REVOKE ALL ON SEQUENCE public.billing_observation_id_seq FROM PUBLIC");
            for(String role:new String[]{"anon","authenticated"}){boolean exists;try(var result=statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='"+role+"'")){exists=result.next();}if(exists){statement.execute("REVOKE ALL ON public.billing_observation FROM "+role);statement.execute("REVOKE ALL ON SEQUENCE public.billing_observation_id_seq FROM "+role);}}
        }
    }
}
