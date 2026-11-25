# Crystal Docks Stripe sandbox

The Docks reports page exposes a test checkout only when the server has a valid Stripe test connection and configured recurring price IDs. Existing Crystal Powers invoice and customer portal routes are independent.

Configure the isolated staging environment with `DOCKS_STRIPE_TEST_ENABLED=true`, `STRIPE_LIVE_MODE=false`, a test Stripe secret, the existing billing webhook's test signing secret, and the staging origin in the existing billing settings. Configure up to four active recurring GBP Stripe test Prices, one for each combination of monthly/annual and one-device/household. The variables are listed in `.env.example`. Confirm the recurring interval and amount in Stripe before offering a Price ID to testers.

Sign in to `/docks/reports`, select a test plan, prepare the checkout and open the returned Stripe-hosted page. Use Stripe test payment details. The account's open checkout is reused for the same plan. A different plan can start when the previous one expires. The Stripe return routes only navigate back to reports.

Point a dedicated Stripe test webhook at `/api/docks/billing/stripe/webhook` and set its signing secret as `DOCKS_STRIPE_WEBHOOK_SECRET`. Select `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` and `invoice.payment_failed`. Set the endpoint API version to match `StripeGateway.API_VERSION` (`2026-09-30.endive`). The reports page shows the test subscription status after the signed event is processed and the customer signs in again.

On isolated staging only, set `DOCKS_STRIPE_TEST_ENTITLEMENTS=true` to exercise repair access with test customers and devices. A verified paid subscription assigns a seat on an enrolled device's first entitlement check while seats are available. One-device plans cover one device and household plans cover up to five devices enrolled by the purchasing account. Removing a device frees its seat. Subscription cancellation or expiry ends that basis for repair access. Trial and access-key eligibility still apply independently.

On staging, verify payment, renewal, failure, cancellation, duplicate event delivery and seat transfer. The desktop app must point to that staging environment for the checks. Cross-account household membership, customer billing management and live billing still require implementation and verification.
