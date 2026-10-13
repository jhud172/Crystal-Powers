package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

public class V27__protect_team_role_profiles extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection=context.getConnection();if(!connection.getMetaData().getDatabaseProductName().equals("PostgreSQL"))return;
        try(var statement=connection.createStatement()) {
            statement.execute("ALTER TABLE public.team_role_profile ENABLE ROW LEVEL SECURITY");statement.execute("REVOKE ALL ON public.team_role_profile FROM PUBLIC");
            for(String role:new String[]{"anon","authenticated"}){boolean exists;try(var result=statement.executeQuery("SELECT 1 FROM pg_roles WHERE rolname='"+role+"'")){exists=result.next();}if(exists)statement.execute("REVOKE ALL ON public.team_role_profile FROM "+role);}
        }
    }
}
