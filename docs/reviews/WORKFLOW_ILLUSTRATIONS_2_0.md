# Crystal Powers 2.0 — page-specific workflow illustrations

## Implementation brief

Objective: complete ABOUT-05, SERV-10 and SUP-05 with lightweight, original DOM illustrations that explain the page's job. The current Studio already has the original Aurora artefact and interactive collaboration stages; Services has a connected brief builder; Support has three enquiry pathways and preparation guidance. Preserve these journeys and add useful visual explanation, rather than another WebGL scene or a pretend client interface.

Studio: a layered workspace view connects brief, interface and implementation with review. Services: a responsive illustrative interface changes with the existing Website/App/System selection and explains an example use case; it does not imply every feature is included in a package. Support: a request-to-review-to-agreement diagram explains the next steps without a fabricated ticket, completion status, guaranteed response time or new support promise.

Ownership: small feature components under `features/studio/`, `features/services/` and `features/support/`; shared illustration styling under `styles/pages/workflow-illustrations.css`; route files compose them. Semantic theme tokens, deliberate cut/line geometry, normal-flow captions and bounded responsive layouts. Illustrative interface chrome is decorative and not keyboard-focusable; descriptions and meaningful workflow lists remain normal HTML. No timers, motion, canvas, image/model imports, dependency, account, price, API/data, metadata or enquiry contract change.

Verification: current source/Vite browser checks at 320/390/768/1024/1440/1920 px, all five appearances, existing service switching/brief state, keyboard/heading semantics, system/app reduced motion, enlarged-text reflow, no canvas/API writes/console errors, desktop/mobile visual review. Run TypeScript/frontend build and relevant enquiry/Studio regression; a fresh packaged runtime/direct route check verifies inclusion. Physical-device/zoom/screen-reader and full release acceptance remain separate.

Rollback: remove the three route compositions and associated imports/styles/components; no stored data migration. Complete the named deliverables only after source, rendering and relevant journey evidence pass.

## Current local evidence

All three compositions are implemented on their public routes. Final packaged `verify-illustrations-browser.cjs`: **340 passing checks**, five appearances/six widths including three service selections, representative text contrast, native selection and support navigation, preserved brief selection, labelled example/plan boundaries and synthetic enlarged text. No API write/page error/canvas. Source Studio 43/enquiry 151 and packaged shell 169/static delivery 51 refresh. Frontend 662 modules, bootJar and 43 H2 tests pass; no dependency installation. Desktop/mobile visual review covers workspace, support and all service examples; screenshot-only fixed-header hiding is recorded in progress. Actual checks retain the header. Physical/hosted/screen-reader/full-page release gates remain open.
