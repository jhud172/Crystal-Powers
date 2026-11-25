# Crystal Docks Stripe sandbox

The Docks reports page exposes a test checkout only when the server has a valid Stripe test connection and configured recurring price IDs. Existing Crystal Powers invoice and customer portal routes are independent.

Configure the isolated staging environment with `DOCKS_STRIPE_TEST_ENABLED=true`, `STRIPE_LIVE_MODE=false`, a test Stripe secret and test webhook signing secret in the existing billing settings, and the staging origin in the existing public URL setting. Configure up to four active recurring GBP Stripe test Prices, one for each combination of monthly/annual and one-device/household. The variables are listed in `.env.example`. Confirm the recurring interval and amount in the Stripe Dashboard before offering a Price ID to testers.

Sign in to `/docks/reports`, select a test plan, prepare the checkout and open the returned Stripe-hosted page. Use Stripe test payment details. The account's open checkout is reused for the same plan. A different plan can start when the previous one expires. The Stripe return routes only navigate back to reports. Completing this test checkout does not change the account's Premium access.

Provider event reconciliation, subscriptions and household seat allocation must pass end-to-end staging checks before the production billing path is enabled.
