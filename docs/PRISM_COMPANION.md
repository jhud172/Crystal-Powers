# Prism studio companion

## Ownership and operation

The public layout mounts `features/companion/Companion.tsx` on the homepage, About, Services, Support, Contact and portfolio routes. Private routes and special/error pages do not mount it. Tour state, controls and chat are isolated from existing page components. The existing theme context now exposes its setter.

Five manual chapters introduce James, the logo room, appearance, illustrative services and chat. A native modal dialog provides focus containment. Skip appears after three seconds; Escape and the keyboard skip link work immediately. The browser-local `crystal_prism_visit_v1` marker records started/completed/skipped state. Interrupted tours do not automatically restart. Clearing browser storage or using another browser can show the introduction again. No cross-device identification is attempted.

The model and Blender source recipe are original: `assets/blender/build_prism_companion.py`, `scenes/prism-companion.blend`, public `models/prism-companion.glb`. Run Blender in background mode using the recipe. Matching PNG and finite animated WebP artwork support smaller screens. The WebP uses rendered frames under ignored `.codex-runtime/prism-frames` (encode seven frames at 140ms/frame). Reduced motion uses a still portrait. Desktop rendering uses one demand-rendered scene and stops after short gestures; existing experience ownership pauses other interactive stages.

## Configuration and cost

No new dependencies. `VITE_PRISM_TOUR_ENABLED=false` disables automatic introduction at frontend build time; replay and chat remain available.

AI is disabled by default. Runtime settings:

- `PRISM_AI_ENABLED`: false by default.
- `PRISM_OPENAI_API_KEY`: dedicated server-side credential, never a frontend variable or tracked file.
- `PRISM_MODEL`: gpt-4.1-nano; other models fail closed until their pricing and limits are reviewed in code.
- `PRISM_PRICING_VERIFIED`: false by default; enable only after checking provider prices and deployment privacy disclosures.
- `PRISM_MONTHLY_BUDGET_PENCE`: 500 by default; zero disables paid requests.
- `PRISM_INPUT_USD_PER_MILLION`: 0.10 minimum.
- `PRISM_OUTPUT_USD_PER_MILLION`: 0.40 minimum.
- `PRISM_GBP_PER_USD_CEILING`: 1.0 minimum; choose a conservative exchange-rate ceiling, including any applicable billing uplift.

The budget is an application allowance, not a guarantee of the provider invoice or charges from other applications. Before each request the database atomically reserves a conservative upper bound using UTF-8 request bytes, 300 maximum output tokens, configured prices, exchange ceiling and a 100% margin, rounded up to a penny. Reservations are never refunded, even on uncertain failures. Limits persist across restarts and concurrent workers; months use UTC. No automated retries. Migrations add the ledger and revoke public hosted-database access.

## Chat contract and privacy

POST `/api/assistant/chat` requires the existing CSRF token. Body: message (1–1200 characters), history (up to six user/assistant turns of 1200 characters), page (allowlisted public path). Reply: answer, sources [{label, href}], availability. States: prepared, available, disabled, unconfigured, budget_exhausted, unavailable. Peer requests are limited to 12/minute; each HTTP session permits one pending request. Direct peer IP is used, never untrusted forwarding headers.

Prepared questions make no provider calls. Approved public facts are maintained in AssistantService; project summaries come only from the published-project query. Match relevant passages locally and send at most four. Sources are server-owned public links; answers render as text. Private data and action tools are never supplied. Review the fact collection when public biography/services change.

Conversation exists in browser memory and is cleared when the companion unmounts, including entering private routes. No conversation content is stored in the database or application logs. OpenAI receives free-text messages and bounded history with `store:false`; this does not disable default provider abuse-monitoring retention. Before launch, update the operator-approved privacy JSON's providers, retention and browser-storage sections to explain OpenAI processing, the tour marker, memory-only history and clear controls. Do not replace the existing eight-section privacy contract or invent operator details.

## Verification and rollout

Build: `npm --prefix frontend run build`. Backend: set SKIP_FRONTEND_BUILD=1 then run Gradle test bootJar offline. Browser verifier: `scripts/verify-companion-browser.cjs` uses the existing Playwright installation and a built preview on loopback port 4175; its public GET fixtures are explicitly synthetic. Screenshots/report: `.codex-runtime/qa/prism-companion`.

Keep paid chat disabled until dedicated credentials, reviewed pricing/privacy and a controlled live grounded-answer evaluation pass. Evaluate service facts, unknown prices, injection attempts and recently unpublished projects. Mocked tests and disabled-provider fallbacks do not establish live answer quality. No production deployment is implied by local checks.

Rollback: disable automatic tour at build time and PRISM_AI_ENABLED at runtime; to remove the UI, remove the public Companion mount. Preserve the additive budget tables so already-reserved usage is not lost.

### Local evidence — 24 October 2026

- Frontend TypeScript/Vite production build passed. Existing Three.js chunk warning remains (about 1,007 kB minified). Main JS rose from about 143 kB to about 153 kB; CSS from 193 kB to 198 kB. Concurrent unrelated changes mean these are whole-checkout measurements, not an isolated feature benchmark.
- Original GLB is 140,020 bytes and contains Dock, Wave, Point, Nod and Thinking clips. Blender source and matching compact artwork were generated locally.
- Built frontend browser verifier: 14 passing checks, zero uncaught page errors; desktop, 360/390/768 reduced-motion reflow, themes, skip/replay, blocked storage and model-load failure.
- Packaged real-HTTP browser smoke passed session/CSRF, a prepared answer and disabled-provider fallback. No provider call was made.
- Initial full test run exposed a concurrent migration-number collision; Prism now uses V64 and its hosted-database protection V65. A subsequent shared-output run lost its Gradle result file during concurrent work; isolated output is used for the final run.
- Still required before enabling live AI: dedicated credential, operator-reviewed privacy content, current pricing check, real answer-quality evaluation. Physical-device/assistive-technology testing, provider outage tests and broad GPU/thermal benchmarking are not established by these local checks.

Final isolated Gradle test/package run: 15 suites, 263 tests, 0 failures, 0 errors, 0 skipped; BUILD SUCCESSFUL. Final output is under `.codex-runtime/prism-build`. Separate desktop rendering check: one modal canvas, zero additional draws during a one-second settled sample, keyboard focus remained inside the dialog. This is a narrow idle-rendering check, not a frame-rate or thermal benchmark.
