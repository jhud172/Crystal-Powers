# Crystal Docks Stripe sandbox

The Docks reports page exposes a test checkout when the server has a Stripe test connection and configured recurring price IDs. The default configuration leaves Docks billing disabled. Existing Crystal Powers invoice and customer portal routes are independent.

Configure isolated staging with `DOCKS_STRIPE_TEST_ENABLED=true`, `STRIPE_LIVE_MODE=false`, the test API key in `STRIPE_SECRET_KEY`, and the staging origin in `PUBLIC_URL`. Use the Docks endpoint's signing secret in `DOCKS_STRIPE_WEBHOOK_SECRET`. The separate invoice webhook has its own configuration. Configure up to four active recurring GBP Stripe test Prices, one for each combination of monthly/annual and one-device/household. The variables are listed in `.env.example`. Confirm the recurring interval and amount in Stripe before offering a Price ID to testers.

Sign in to `/docks/reports`, select a test plan, prepare the checkout and open the returned Stripe-hosted page. Use Stripe test payment details. The account's open checkout is reused for the same plan. A different plan can start when the previous one expires. The Stripe return routes only navigate back to reports.

Configure the sandbox's Docks-specific customer portal and set `DOCKS_STRIPE_TEST_PORTAL` to its configuration ID. Checkout and the customer portal open in a separate tab. Once the first signed payment event has been processed, return to the original reports tab and choose **Check subscription status**. If that tab has closed or the session has expired, sign in again. Use **Manage test subscription** to verify payment updates, invoice history and cancellation at the end of the period. The server verifies the billed account and requires a sandbox response before offering the link.

Point a dedicated Stripe test webhook at `/api/docks/billing/stripe/webhook` and set its signing secret as `DOCKS_STRIPE_WEBHOOK_SECRET`. Select these events.

- `checkout.session.completed`, `checkout.session.async_payment_succeeded`
- `customer.subscription.updated`, `customer.subscription.deleted`
- `invoice.paid`, `invoice.payment_failed`
- `charge.refunded`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`
- `radar.early_fraud_warning.created`

Set the endpoint API version to match `StripeGateway.API_VERSION` (`2026-09-30.endive`). The reports page shows the test subscription status after the signed event is processed and the customer signs in again.

On isolated staging only, set `DOCKS_STRIPE_TEST_ENTITLEMENTS=true` to exercise repair access with test customers and devices. A verified paid subscription assigns a seat on an enrolled device's first entitlement check while seats are available. One-device plans cover one device and household plans cover up to five devices across the paying account and its invited adults. Removing a device frees its seat. Subscription cancellation or expiry ends that basis for repair access. Trial and access-key eligibility still apply independently.

The paying adult creates an invitation under Household plan on the reports page and asks the recipient to sign in with the invited email address. Invitations expire after seven days if unaccepted. The recipient sees the sender's email and can accept or decline. Removing a member or leaving releases that member's seats. Each adult keeps their own devices and reports.

## Live integration and release checks

The live integration remains disabled by default. Flyway migration `V102__docks_stripe_mode_isolation.sql` classifies previous test checkouts as test records and preserves existing test memberships. Live Premium and household seats read only live records. A successful checkout redirect grants no access. A signed event triggers retrieval and validation of the Stripe subscription and its paid invoice.

Verify the four distinct recurring GBP Prices for the two Docks products in Stripe. The configured live checkout checks the selected price and its billing interval before creating the session. Configure a dedicated Docks customer portal for invoices, payment method changes and cancellation at the end of the paid period. Keep portal plan changes disabled until plan changes and seat transfers are implemented and verified. Set `DOCKS_STRIPE_LIVE_PORTAL` to that configuration ID. Live mode also requires the existing Stripe live connection and the dedicated Docks webhook signing secret.

The risk handler follows the charge's payment intent to paid Stripe invoice payments, then verifies the affected Docks subscription. A full refund, open or lost dispute, or actionable fraud warning puts the affected period under payment review. Partial refunds appear in owner review. A won or closed warning dispute can restore access if the invoice remains paid and there are no other holds. A later verified paid invoice can grant access for its own period. Trial and key access are evaluated separately.

Use **Account security → Crystal Docks payment review** to find the charge, invoice and subscription in Stripe. Docks records provider outcomes and the resulting access decision. Refunds and disputes are handled in Stripe. Pilot the webhook with a restricted key that can read Charges, Invoice Payments, Invoices, Subscriptions, Disputes and Early Fraud Warnings. [Stripe subscription risk events](https://docs.stripe.com/billing/subscriptions/webhooks#refund-events)

## Recover a delivery

The webhook acknowledges delivery after signature validation and durable storage of the event references. The worker retrieves current Stripe records in the background. Event IDs are deduplicated and the queue retains identifiers and timing, without the original payment payload. A failed attempt backs off automatically. After eight failures the delivery moves to **Needs review**. Completed queue entries are eligible for cleanup after 30 days.

Open **Account security → Crystal Docks payment review → Stripe delivery queue**. Match the event ID in Stripe and correct the cause of failure. Choose **Retry** to make the item eligible for processing again. The queue records the latest manual retry and its owner. Use Stripe Workbench to resend a delivery that never reached Crystal Powers. [Stripe webhook delivery and retries](https://docs.stripe.com/webhooks#event-delivery-behaviors)

Migration `V104__docks_stripe_event_queue.sql` passed in an isolated PostgreSQL run with signed receipt, deduplication and background completion. Local tests covered provider failure, restart, competing workers and manual retry. Include a deliberate transient failure during the Stripe HTTPS pilot and verify that access reconciles after recovery.

On 26 November 2026, Stripe Workbench resent the paid household Checkout event to the same staging endpoint. Workbench recorded HTTP 200 for both the original delivery and the manual replay. The staging database blocks external connections, so this check verified HTTPS receipt. The local queue test separately verified one processing run for a duplicate event ID.

Keep `DOCKS_STRIPE_LIVE_ENABLED=false` until the sandbox and HTTPS pilot exercise payment, automatic renewal, failed payment, cancellation, refunds, fraud and dispute handling, account and device limits, and the portal. Confirm pricing and tax treatment before live checkout. [Stripe go-live checklist](https://docs.stripe.com/get-started/checklist/go-live)

On staging, verify payment, renewal, failure, cancellation, duplicate event delivery, household acceptance and seat transfer. For desktop checks, build the staging MSIX with the Crystal Docks packaging script and pass the staging host as -PilotHost. Use the customer portal in the signed-in reports page. Verify the hosted test journeys before enabling the live catalogue.

## Local provider verification

Stripe CLI's claimable sandbox works with a loopback website origin, `STRIPE_LIVE_MODE=false` and `BILLING_ENABLED=false`. The Docks test toggle and test entitlement toggle still apply. Put the temporary test key and the CLI listener's signing secret in the local process environment. Forward only test events to `/api/docks/billing/stripe/webhook`. Claimable keys use their sandbox's pinned API version. Continue to use the standard provider configuration for hosted staging.

The local packaged website used its SMTP transport with a loopback fixture to enrol test accounts. It created and reused an actual Stripe Checkout session and configured all four sandbox price options. Test subscriptions created through Stripe's API supplied the paid invoices. Stripe CLI forwarded signed events to the local webhook. Verified outcomes included the single-device limit, a real Stripe sandbox portal session, access until cancellation, five seats across two household accounts, seat reassignment after removing an adult, and lost repair access on a full refund. The test used synthetic recipients and prices. Interactive Checkout completion, test-clock renewal, other payment failures and staging credentials still require verification. Stripe denied anonymous sandbox use of test clocks.

The signed local lifecycle fixture also checks an unpaid renewal, a past-due subscription and recovery on the same enrolled device. An old paid event cannot restore access while Stripe reports a failed renewal. A delayed failure cannot withdraw access after the refreshed subscription shows a verified paid period. The fixture simulates provider reads.

A Chrome run used the packaged loopback website, a disposable account and Stripe's hosted Checkout in an unclaimed sandbox. The Stripe back link returned to the signed-out reports page with cancellation guidance. A fresh entitlement read confirmed that the enrolled device still had Free access. Stripe did not complete the test-card submission and reported a generic retry error. The Stripe API confirmed that the sessions remained open and unpaid. Verify successful Checkout, the signed webhook and the resulting entitlement together in the dedicated staging sandbox. [Stripe test cards](https://docs.stripe.com/testing)

On 26 November 2026, the hosted pilot used the Crystal Powers Stripe test account and a £1 monthly single-device test price. Resend delivered the staging sign-in code. Stripe Checkout completed with a test card, the provider reported a paid test session, the reports page showed the subscription as paid, and the enrolled Windows pilot reported the paid Premium entitlement. The public billing mode remained disabled.

The test subscription was then scheduled to cancel at the end of its paid period. Stripe reported the same paid-through date and no pending webhook deliveries for the subscription update. Refreshing the staging reports page still showed the subscription as paid through 26 December 2026.

An immediate cancellation of the same test subscription also generated a `customer.subscription.deleted` event with no pending webhook deliveries. The staging reports page showed the cancellation, and a fresh online check in the enrolled Windows pilot no longer showed a paid entitlement. The pilot declined the trial and completed a Free device check, saving it locally.

The hosted pilot then exposed all four verified sandbox prices. Stripe Checkout accepted a test card for the £2 monthly household plan, and reports showed the household subscription as paid through 26 December 2026. Six synthetic devices on the paying account tested the seat limit over HTTPS. Five received paid repair access, and removing one assigned device freed a seat for the sixth. The test removed all six devices, verified the original device list and signed out. Hosted renewal, actual end-of-period revocation, invitation acceptance and seat sharing across two adults, and live catalogue checks remain open.

Stripe created a test clock in this sandbox. Use a separate disposable customer whose subscription can be advanced without changing the household checkout evidence. Run renewal, failed renewal and cancellation at the period boundary against a linked staging subscription. Local regression tests separately cover renewal, a failed invoice, recovery, paid-through expiry, concurrent seat allocation and report ownership. [Stripe subscription simulations](https://docs.stripe.com/billing/testing/test-clocks/simulate-subscriptions)
