# Crystal Docks online explanations

Online explanations are disabled by default. The desktop user reviews and approves the processor and memory readings each time. The website verifies the device belongs to the signed-in account and has Premium access before sending either percentage to OpenAI. The provider receives two readings and a fixed explanation instruction. Report sync and diagnostic research have separate settings.

The desktop shows the customer's remaining monthly requests and next reset before asking for approval. The preview carries only the enrolment reference. It does not claim a Premium seat, reserve a request or send scan readings. Submitting the approved request checks entitlement and available capacity again.

Enablement requires a dedicated provider project credential in `DOCKS_AI_OPENAI_KEY`, an account request limit in `DOCKS_AI_ACCOUNT_MONTHLY_LIMIT`, and a shared budget and per-call reservation in integer GBP pence. Set `DOCKS_AI_PRICING_VERIFIED` and `DOCKS_AI_ENABLED` after verifying that the reserve covers the maximum cost of the fixed GPT-6 Luna prompt and 240 output tokens, with room for exchange rates and applicable tax. Configure identical caps across website instances. Set `DOCKS_AI_ENABLED=false` to stop new requests.

For budget planning, OpenAI lists Standard GPT-6 Luna at US$0.10 per million input tokens and US$0.50 per million output tokens. At an illustrative 1,000 input tokens and the configured maximum of 240 output tokens, the model charge is about US$0.00022 per request, US$0.0066 for 30 requests or US$0.22 for 1,000, before any tax and currency conversion. A proposed £10 shared monthly reservation cap, 1p reserved per request and 30 requests per account would allow up to 1,000 attempts across the service. Those values are a planning example and require approval before setting them. [OpenAI GPT-6 Luna pricing](https://developers.openai.com/api/docs/models/gpt-6-luna)

Both caps reset at the UTC month boundary. The database reserves capacity before the provider call. Failed and timed-out requests also consume a reservation because the provider may have processed them. The provider receives a request with response storage disabled. Verify the provider project's retention policy separately before enabling this in production.

In **Owner Studio → Account security → Crystal Docks release configuration**, check the current UTC month's reserved and remaining allowance and the per-request and per-account limits. The reserved amount is based on the configured estimate for each call. Compare it with actual charges in the provider's dashboard. The owner view can still show reservations when online AI is switched off. Invalid or incomplete caps make online explanations unavailable.

Pilot with a dedicated key and a small budget. Confirm an eligible and an ineligible account, cancellation at the desktop confirmation, provider success and timeout, both cap responses and continued access to checks, reports and repairs during an outage.

The executable website passed a loopback smoke test against a disposable PostgreSQL 17 database. Flyway applied migrations through V100. The test exercised anonymous, missing-approval and unenrolled-device requests. An enrolled trial fixture returned HTTP 429 at both caps. No provider calls were made.

On 26 November 2026 the hosted pilot returned HTTP 401 for an anonymous online explanation request. The signed-in availability and preview both reported unavailable, and an approved synthetic request returned HTTP 503. The check revoked its test session. No provider call was made.
