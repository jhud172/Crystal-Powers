# Crystal Docks Stripe sandbox

The Docks reports page exposes a test checkout when the server has a Stripe test connection and configured recurring price IDs. The default configuration leaves Docks billing disabled. Existing Crystal Powers invoice and customer portal routes are independent.

Configure the isolated staging environment with `DOCKS_STRIPE_TEST_ENABLED=true`, `STRIPE_LIVE_MODE=false`, a test Stripe secret, the existing billing webhook's test signing secret, and the staging origin in the existing billing settings. Configure up to four active recurring GBP Stripe test Prices, one for each combination of monthly/annual and one-device/household. The variables are listed in `.env.example`. Confirm the recurring interval and amount in Stripe before offering a Price ID to testers.

Sign in to `/docks/reports`, select a test plan, prepare the checkout and open the returned Stripe-hosted page. Use Stripe test payment details. The account's open checkout is reused for the same plan. A different plan can start when the previous one expires. The Stripe return routes only navigate back to reports.

Point a dedicated Stripe test webhook at `/api/docks/billing/stripe/webhook` and set its signing secret as `DOCKS_STRIPE_WEBHOOK_SECRET`. Select `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Set the endpoint API version to match `StripeGateway.API_VERSION` (`2026-09-30.endive`). The reports page shows the test subscription status after the signed event is processed and the customer signs in again.

On isolated staging only, set `DOCKS_STRIPE_TEST_ENTITLEMENTS=true` to exercise repair access with test customers and devices. A verified paid subscription assigns a seat on an enrolled device's first entitlement check while seats are available. One-device plans cover one device and household plans cover up to five devices across the paying account and its invited adults. Removing a device frees its seat. Subscription cancellation or expiry ends that basis for repair access. Trial and access-key eligibility still apply independently.

The paying adult creates an invitation under Household plan on the reports page and asks the recipient to sign in with the invited email address. Invitations expire after seven days if unaccepted. The recipient sees the sender's email and can accept or decline. Removing a member or leaving releases that member's seats. Each adult keeps their own devices and reports.

## Live integration and release checks

The live integration remains disabled by default. Flyway migration `V102__docks_stripe_mode_isolation.sql` classifies previous test checkouts as test records and preserves existing test memberships. Live Premium and household seats read only live records. A successful checkout redirect grants no access. A signed event triggers retrieval and validation of the Stripe subscription and its paid invoice.

Verify the four distinct recurring GBP Prices for the two Docks products in Stripe. The configured live checkout checks the selected price and its billing interval before creating the session. Configure a dedicated Docks customer portal for invoices, payment method changes and cancellation at the end of the paid period. Keep portal plan changes disabled until plan changes and seat transfers are implemented and verified. Set `DOCKS_STRIPE_LIVE_PORTAL` to that configuration ID. Live mode also requires the existing Stripe live connection and the dedicated Docks webhook signing secret.

Keep `DOCKS_STRIPE_LIVE_ENABLED=false` until the sandbox and HTTPS pilot exercise payment, automatic renewal, failed payment, cancellation, refunds, fraud and dispute handling, account and device limits, and the portal. Confirm pricing and tax treatment before live checkout. [Stripe go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

On staging, verify payment, renewal, failure, cancellation, duplicate event delivery, household acceptance and seat transfer. The desktop app must point to that staging environment for the checks. Customer billing management and live billing still require implementation and verification.
