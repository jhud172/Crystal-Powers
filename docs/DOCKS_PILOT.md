# Crystal Docks HTTPS pilot

`render-docks-pilot.yaml` defines a standalone free Render web service and a new PostgreSQL 17 database in Frankfurt. It uses the website's existing Dockerfile and Docks integration branch. Configure the Blueprint to create new resources and keep automatic sync off. The database denies external connections and grants the service its own connection settings. Render generates the application encryption key. Media uses temporary local storage. The pilot starts with outbound mail, paid billing and online AI disabled.

Use only synthetic accounts and test provider credentials. Configure a separate Google OAuth client, the Stripe sandbox webhook and test Prices, and a controlled mail sender before those tests. Verify the actual HTTPS origin after deployment before registering callbacks. The Docks pilot profile adds a search-engine exclusion header. Treat the endpoint as publicly reachable.

Free Render PostgreSQL expires after 30 days and the free web service sleeps when idle. [Render free services](https://render.com/docs/free)

The free pilot deployed commit `6dad3d0` on 25 November 2026. Render applied 84 migrations through V105. An HTTPS browser run verified the mobile reports sign-in screen, denied anonymous report reads, checked indexing exclusion and confirmed Google sign-in and the download feed were disabled. Provider journeys still need their pilot credentials and end-to-end verification. [Pilot reports](https://crystal-docks-pilot-xpyl.onrender.com/docks/reports)

The Crystal Powers Stripe test environment has a dedicated Docks portal configuration for invoice history, payment method updates and cancellation at period end. Stripe issued a session for a synthetic customer and confirmed its test mode, customer, portal configuration and return URL. Pilot deploy `5420718` serves the sandbox portal code and rejects anonymous portal requests. Staging still needs a restricted sandbox API key, the Docks webhook signing secret and the test catalogue. The dedicated Google account reached the first-time Google Cloud terms screen. The staging OAuth client and mail sender remain pending.

Pilot deploy `b4a8d01` applied account deletion migrations V106 and V107. The deployed reports bundle includes the account deletion controls. A signed-out mobile browser opened the product page, navigated to private reports by keyboard and returned to the product page. The service returned an empty release feed, a 404 for an unpublished download and a 401 for an anonymous report request. The product page retains the pilot's indexing exclusion. [Pilot download page](https://crystal-docks-pilot-xpyl.onrender.com/docks)

## Database access

Docks uses the server's PostgreSQL role and application authorisation. Migration `V105__protect_docks_database.java` enables row-level security for its existing tables and revokes direct table access from `PUBLIC`, `anon`, `authenticated` and `service_role` when those API roles are present. The application's table owner continues to serve authorised requests. Keep new Docks tables out of the hosted Data API by applying the same protections. [Supabase Data API hardening](https://supabase.com/docs/guides/database/hardening-data-api)

The PostgreSQL 17 test granted the three hosted API roles default table privileges before Flyway ran. All 30 Docks tables had row-level security afterwards and none of the three roles retained direct table grants. The signed webhook smoke still passed using the application's database connection.
