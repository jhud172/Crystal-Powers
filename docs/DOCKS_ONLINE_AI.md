# Crystal Docks online explanations

Online explanations are disabled by default. The desktop user reviews and approves the processor and memory readings each time. The website verifies the device belongs to the signed-in account and has Premium access before sending either percentage to OpenAI. The provider receives two readings and a fixed explanation instruction. Report sync and diagnostic research have separate settings.

Enablement requires a dedicated provider project credential in `DOCKS_AI_OPENAI_KEY`, an account request limit in `DOCKS_AI_ACCOUNT_MONTHLY_LIMIT`, and a shared budget and per-call reservation in integer GBP pence. Set `DOCKS_AI_PRICING_VERIFIED` and `DOCKS_AI_ENABLED` after verifying that the reserve covers the maximum cost of the fixed GPT-6 Luna prompt and 240 output tokens, with room for exchange rates and applicable tax. Configure identical caps across website instances. Set `DOCKS_AI_ENABLED=false` to stop new requests.

Both caps reset at the UTC month boundary. The database reserves capacity before the provider call. Failed and timed-out requests also consume a reservation because the provider may have processed them. The provider receives a request with response storage disabled. Verify the provider project's retention policy separately before enabling this in production.

Pilot with a dedicated key and a small budget. Confirm an eligible and an ineligible account, cancellation at the desktop confirmation, provider success and timeout, both cap responses and continued access to checks, reports and repairs during an outage.

The executable website passed a loopback smoke test against a disposable PostgreSQL 17 database. Flyway applied migrations through V100. The test exercised anonymous, missing-approval and unenrolled-device requests. An enrolled trial fixture returned HTTP 429 at both caps. No provider calls were made.
