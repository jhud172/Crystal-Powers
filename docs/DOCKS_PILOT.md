# Crystal Docks HTTPS pilot

`render-docks-pilot.yaml` defines a standalone free Render web service and a new PostgreSQL 17 database in Frankfurt. It uses the website's existing Dockerfile and Docks integration branch. Configure the Blueprint to create new resources and keep automatic sync off. The database denies external connections and grants the service its own connection settings. Render generates the application encryption key. Media uses temporary local storage. The pilot starts with outbound mail, paid billing and online AI disabled.

Use only synthetic accounts and test provider credentials. Configure a separate Google OAuth client, the Stripe sandbox webhook and test Prices, and a controlled mail sender before those tests. Verify the actual HTTPS origin after deployment before registering callbacks. The Docks pilot profile adds a search-engine exclusion header. Treat the endpoint as publicly reachable.

Free Render PostgreSQL expires after 30 days and the free web service sleeps when idle. [Render free services](https://render.com/docs/free)

## Database access

Docks uses the server's PostgreSQL role and application authorisation. Migration `V105__protect_docks_database.java` enables row-level security for its existing tables and revokes direct table access from `PUBLIC`, `anon`, `authenticated` and `service_role` when those API roles are present. The application's table owner continues to serve authorised requests. Keep new Docks tables out of the hosted Data API by applying the same protections. [Supabase Data API hardening](https://supabase.com/docs/guides/database/hardening-data-api)
