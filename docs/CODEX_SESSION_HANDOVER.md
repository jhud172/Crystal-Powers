# Codex Session Handover

Date: 2026-06-23  
Branch: `main`  
Scope: Repository onboarding and verification only. No functional or visual implementation changes were made.

## 1. Current Repository Architecture

Crystal Powers is a React SPA with a Spring Boot backend.

- `frontend/` contains the public website: React 19, Vite 6, TypeScript, Tailwind CSS, Three.js, React Three Fiber, Drei.
- `src/main/java/com/crystalpower/website/` contains the backend: Spring Boot controllers, validation DTOs, upload validation, email delivery, SPA fallback, and legacy redirects.
- `src/main/resources/static/` is populated from `frontend/dist` during production builds.
- `src/main/resources/templates/` still contains old Thymeleaf template files, but current Spring controllers forward public page routes to `index.html` or redirect legacy `.html` routes.
- `docs/` contains project guidance, audits, memory notes, and structure documentation.

There is no root `package.json`. The only npm package is `frontend/package.json`.

## 2. Current Branch And Git Status

- Branch: `main`
- Tracking: `origin/main`
- Initial status before this handover: clean
- Status after verification and handover creation: one new untracked/modified documentation file expected: `docs/CODEX_SESSION_HANDOVER.md`
- Recent commits:
  - `bc005bb` Merge pull request #3 from `jhud172/copilot/audit-crystal-powers-repo`
  - `7255e7f` Merge pull request #2 from `jhud172/copilot/create-advanced-experience-architecture`
  - `21be578` Address code review: remove duplicate material config, use createElement for SectionHeading
  - `c772369` Create reusable advanced-experience component architecture
  - `2de0869` docs: add agent.md, content.md, memory.md, skills.md
  - `1213f06` feat: add interaction foundation - scrollReveal, cursorAura, tilt, hooks, docs

Ignored/generated files exist locally, including `.env`, `.gradle/`, `build/`, `target/`, `frontend/dist/`, `frontend/node_modules/`, and TypeScript build info files.

## 3. Current Frontend And Backend Responsibilities

React owns:

- Public page rendering
- Client routing
- Layout, navigation, footer
- Theme switching
- Form UI state
- Portfolio and services display data
- Three.js hero rendering
- Scroll reveal, cursor aura, and tilt lifecycle initialisation through `Layout.tsx`

Spring Boot owns:

- `POST /api/contact`
- `POST /api/services`
- Jakarta validation for contact/service forms
- Upload validation for services references
- Email delivery through `InquiryEmailService`
- Legacy `.html` redirects
- SPA fallback and production hosting

## 4. Current Route List

React route configuration in `frontend/src/app/App.tsx`:

- `/` -> `Home`
- `/home` -> redirects to `/`
- `/about` -> `About`
- `/services` -> `Services`
- `/portfolio` -> `Portfolio`
- `/portfolio/:slug` -> `PortfolioProject`
- `/support` -> `Support`
- `/contact` -> `Contact`
- `*` -> `NotFound`

Spring SPA forwarding in `SpaController.java` includes the expected public routes and a generic extensionless fallback for unknown client routes. Vite preview returned HTTP 200 for all expected public routes and `/definitely-not-real`.

## 5. Current Dependency List

Installed/requested dependencies present:

- `three@0.184.0`
- `@react-three/fiber@9.6.1`
- `@react-three/drei@10.7.7`

Requested advanced-animation dependencies not installed:

- `gsap`
- `@gsap/react`
- `motion`
- `framer-motion`
- `lenis`
- `@react-three/postprocessing`
- `postprocessing`

Other frontend dependencies:

- `react@19.0.0`
- `react-dom@19.0.0`
- `react-router-dom@7.1.1`
- `typescript@5.7.2`
- `vite@6.0.7` in `package.json`; build output reports Vite `6.4.3` from the lockfile/install
- `@vitejs/plugin-react@4.3.4`
- Tailwind/PostCSS/Autoprefixer and React/Three type packages

There is no GSAP registration, no ScrollTrigger registration, no Motion/Framer shared configuration, and no Lenis setup.

## 6. Current Three.js Hero Architecture

`frontend/src/components/hero/CrystalOpenerScene.tsx` is the only source file importing Three.js, React Three Fiber, or Drei directly.

Confirmed implementation:

- Real WebGL canvas through `Canvas`
- Procedural `BufferGeometry` diamond
- `meshPhysicalMaterial`
- `transmission={0.72}`
- `ior={2.42}`
- `clearcoat={1}`
- Vertex colours
- Orbit rings
- Sparkles
- Contact shadows
- Drei `Float`
- `useFrame` pointer tracking
- Shared `usePrefersReducedMotion` hook
- WebGL detection with CSS fallback

`Home.tsx` lazy-loads the scene with `React.lazy` and `Suspense`. `vite.config.ts` splits `vendor-react`, `vendor-three`, and `crystal-scene`. The main app chunk does not import Three.js directly.

## 7. Current Interaction Foundation

`Layout.tsx` initialises the interaction systems once on mount:

- `initCursorAura(reducedMotion)`
- `initTilt(reducedMotion)`
- `initScrollReveal(reducedMotion)`

It also refreshes scroll reveal on `location.pathname` changes.

Confirmed implementation details:

- Scroll reveal uses a single `IntersectionObserver`.
- Reveal hidden state is gated behind `body.reveal-ready`, so content remains visible if JavaScript fails before initialisation.
- Reduced motion reveals all content immediately.
- Cursor aura writes `--cursor-x` and `--cursor-y` to `document.documentElement`.
- Cursor aura is gated by fine pointer, hover support, and reduced-motion preference.
- Tilt attaches element-local pointer listeners to `[data-tilt]`.
- Tilt uses a `MutationObserver` to catch route-mounted elements.
- Cleanup removes listeners, disconnects observers, cancels pending animation frames/timeouts, and clears inline transforms/CSS variables.

Previous dead CSS systems:

- `body.is-overdrive`: removed from active CSS.
- `.site-secret-node`: removed from active CSS.
- `.site-shell`: still present in `global.css` but not used in JSX.
- `.music-button`: still present in `navbar.css` but not used in JSX.

## 8. Current Reusable Component Structure

Active/shared components:

- `components/PageHero.tsx` is used by interior routes and 404.
- `features/contact/FormFields.tsx` is used by Contact and Services.
- `features/services/services.ts` provides service package/addition/maintenance data.
- `features/portfolio/portfolio.ts` provides portfolio data and slug lookup.

Reusable advanced-experience components exist but are not mounted in active routes:

- `components/motion/ScrollReveal`
- `components/motion/BlurReveal`
- `components/motion/StaggerGroup`
- `components/motion/MagneticButton`
- `components/motion/SpotlightCard`
- `components/motion/PerspectiveCard`
- `components/effects/CursorAura`
- `components/effects/NoiseOverlay`
- `components/effects/PointerLight`
- `components/effects/RefractionLayer`
- `components/ui/SectionHeading`
- `components/ui/PremiumLink`
- `components/three/CrystalFallback`

Structural placeholders returning `null`:

- `features/home/HeroContent`
- `features/home/ServicesReveal`
- `features/home/PortfolioShowcase`
- `features/home/StudioProcess`
- `features/home/FinalCallToAction`
- `features/portfolio/PortfolioCard`
- `features/portfolio/PortfolioGrid`
- `features/portfolio/PortfolioPreview`
- `features/navigation/NavigationMotion`
- `features/navigation/MobileNavigationPanel`

`frontend/src/providers/` is documented as expected/reserved, but the directory does not currently exist.

## 9. Current Theme Architecture

Theme data lives in `frontend/src/data/site.ts`.

Themes:

- `futuristic` default
- `classic`
- `clean`
- `fresh`
- `summer-vibes`

`Layout.tsx`:

- Reads `crystal_theme` cookie.
- Writes `body[data-theme]`.
- Adds `body.theme-ready`.
- Persists the selected theme for one year.
- Updates the `theme-color` meta tag from theme data.

Theme CSS is imported from `frontend/src/styles/index.css` and defined under `frontend/src/styles/themes/*/theme.css`.

## 10. Current Contact Form Flow

Contact page:

- `Contact.tsx` stores form state with `initialContactForm`.
- Submits `FormData` to `POST /api/contact`.
- Displays backend `message` and `fieldErrors`.
- Resets form on success.

Services page:

- `Services.tsx` stores contact fields, selected package, additions, maintenance, optional "Other", and uploaded files.
- Submits multipart `FormData` to `POST /api/services`.
- Appends `referenceFiles`.
- Resets form, selected additions, "Other", and files on success.

Backend:

- `ApiInquiryController` validates with `@Valid @ModelAttribute ContactForm`.
- `ContactForm` requires first name, email, preferred contact point, package, maintenance, and message.
- `UploadValidationService` allows up to five non-empty files, 15MB total, image/video MIME types only.
- `InquiryEmailService` sends HTML email and attachments if mail is configured.

## 11. Current Portfolio Architecture

Portfolio data is static in `frontend/src/features/portfolio/portfolio.ts`.

Each project has:

- `slug`
- `title`
- `company`
- `meta`
- `summary`
- `about`
- `creation`
- `whyItWorks`
- `features`
- `image`

`Portfolio.tsx` renders project cards inline from `portfolioProjects`. `PortfolioProject.tsx` uses `getProject(slug)` and renders `NotFound` when no project matches.

## 12. Current Build And Test Commands

Frontend scripts:

- `npm run dev`
- `npm run build` (`tsc -b && vite build`)
- `npm run preview`

No frontend lint script is configured.

Backend/root commands:

- `.\gradlew.bat test`
- `.\gradlew.bat bootJar`
- `.\build.ps1`

Important build behaviour:

- `build.gradle` registers `installFrontend` as `npm ci`.
- `buildFrontend` depends on `installFrontend`.
- `processResources` depends on `buildFrontend`.
- `build.ps1` uses `npm install`, then `npm run build`, then Gradle with `SKIP_FRONTEND_BUILD=true`.

For this onboarding task, `npm install`/`npm ci` were not run because the instruction also said not to install dependencies.

## 13. Build Results

Command:

```powershell
cd frontend
npm run build
```

Result: passed.

Output summary:

- TypeScript project build completed as part of `npm run build`.
- Vite transformed 621 modules.
- Build completed in 15.94s.
- One Vite chunk-size warning for `vendor-three`.

## 14. Test Results

Command:

```powershell
$env:SKIP_FRONTEND_BUILD='1'; .\gradlew.bat test
```

Result: passed.

Reason for `SKIP_FRONTEND_BUILD`: prevents Gradle from running `npm ci`, preserving the no-dependency-install constraint.

Gradle output:

- `:installFrontend SKIPPED`
- `:buildFrontend SKIPPED`
- `:test` executed
- `BUILD SUCCESSFUL in 13s`

## 15. Bundle Sizes

Current `npm run build` output:

| Asset | Raw | Gzip |
|---|---:|---:|
| `index.html` | 1.96 kB | 0.73 kB |
| `assets/index-BlVyxbCi.css` | 138.30 kB | 25.13 kB |
| `assets/crystal-scene-S4n7vcIK.js` | 15.23 kB | 5.76 kB |
| `assets/index-WYd-8arN.js` | 59.40 kB | 15.41 kB |
| `assets/vendor-react-CZGw77W3.js` | 234.60 kB | 74.91 kB |
| `assets/vendor-three-DO7I58Gd.js` | 889.04 kB | 239.42 kB |

`vendor-three` is split from the main app but exceeds Vite's default 500 kB warning threshold.

## 16. Existing Warnings

- Vite warns that some chunks exceed 500 kB after minification because `vendor-three` is 889.04 kB.
- Gradle prints: `Consider enabling configuration cache to speed up this build`.
- JVM warning during tests: class data sharing is only supported for boot loader classes because bootstrap classpath has been appended.
- Documentation records an existing `@MockBean` deprecation warning in `CrystalPowerApplicationTests.java`; this specific run did not recompile tests, so it did not reprint.

## 17. Existing Failures

No build or backend test failures were observed.

Verification limitations:

- Browser visual inspection and browser-console inspection were not completed because no browser automation tool was available without adding packages, and this task forbids dependency installation.
- HTTP smoke test through `npm run preview` confirmed the built SPA serves expected routes and unknown routes, but it does not verify WebGL rendering, navigation interaction, theme switching, console output, or horizontal overflow visually.

## 18. Unused Or Incomplete Components

Incomplete placeholders:

- `features/home/*` section components return `null`.
- `features/portfolio/PortfolioCard`, `PortfolioGrid`, and `PortfolioPreview` return `null`.
- `features/navigation/NavigationMotion` and `MobileNavigationPanel` return `null`.

Created but apparently unused in active routes:

- All `components/motion/*` components.
- All `components/effects/*` components.
- `components/ui/SectionHeading`.
- `components/ui/PremiumLink`.
- `components/three/CrystalFallback`.
- `hooks/useMediaQuery`.
- `hooks/usePointerCapability`.
- `lib/performance/*`.
- `lib/three/*`.
- `types/animation.ts`, `types/experience.ts`, `types/three.ts`.

Potential stale files/assets:

- QA screenshots committed under `frontend/qa-home-*.png`.
- `frontend/frontend-vite-preview.log`.
- `frontend/frontend-vite-preview.err.log`.
- Some public image assets appear unused by active React code: `1to1-logo.png`, `1to1-website.png`, `DiscordNitroBoost.png`, `JailbreakImage.png`, `ResellerImage.png`, `RobloxImage.png`, `WebsiteImage.png`, `cp-logo.png`, `cp-logo-ufo-loop.*`.

Potential stale CSS:

- `.site-shell` in `global.css`.
- `.music-button` and `.music-button-bars` in `navbar.css`.
- `.home-command-display`, `.home-proof-strip`, `.home-focus-grid`, `.home-story-grid`, `.home-command-grid` in `global.css`.

## 19. Documentation Inconsistencies

- `docs/ADVANCED_EXPERIENCE_AUDIT.md` is stale in places. It says scroll reveal, cursor aura, and tilt are missing/non-functional, but current code implements them in `frontend/src/lib/interactions/` and initialises them in `Layout.tsx`.
- `docs/ADVANCED_EXPERIENCE_DEPENDENCIES.md` was missing during the original onboarding audit and has since been created as a dependency-state note.
- Some documentation says legacy Thymeleaf templates were removed, but `src/main/resources/templates/` still exists with old template files.
- Old Thymeleaf template metadata still uses a singular old brand variant. These templates do not appear to be served by current route controllers, but they remain in the repo and may be confusing.
- `docs/agent.md` previously named old API handler classes; it has been corrected to `ApiInquiryController`.
- `docs/skills.md` says to import new page CSS in `global.css`; current CSS entry imports page CSS from `global.css`, while component/theme CSS is imported by `styles/index.css`.
- README and docs instruct `npm install` in normal setup; this handover did not run install because the onboarding request also explicitly said not to install dependencies.

## 20. High-Risk Areas That Should Not Be Changed Casually

- `CrystalOpenerScene.tsx`: real WebGL implementation, lazy-loaded boundary, material settings, reduced-motion behaviour, and fallback handling.
- `vite.config.ts`: current chunk splitting keeps Three.js out of the main app chunk.
- `Layout.tsx`: centralises theme persistence, navigation state, and interaction lifecycle.
- `global.css` reveal gate: `body.reveal-ready` is important for progressive enhancement.
- `lib/interactions/*`: global and element-level listeners need careful cleanup to avoid duplicate listeners after route changes.
- `ApiInquiryController`, `ContactForm`, `UploadValidationService`, `InquiryEmailService`: backend validation and email behaviour are production-sensitive.
- `SpaController` and `LegacyRouteController`: affect refresh behaviour, unknown routes, and legacy URLs.
- `build.gradle`, `Dockerfile`, and `build.ps1`: currently coordinate frontend build output into Spring Boot hosting.

## 21. Recommended Next Implementation Task

Do not redesign first. The best next task is a cleanup and documentation-alignment pass:

- Decide whether stale Thymeleaf templates should be removed or kept as archived reference.
- If kept, clearly mark them as inactive and remove forbidden brand wording from any potentially public-facing metadata.
- Update stale docs so they match the current interaction foundation and actual controller names.
- Remove or ignore committed QA screenshots/logs only if authorised.

This should happen before new visual or animation work so future agents do not build from contradictory documentation.

## 22. Recommended Order For The Following Three Tasks

1. Documentation and stale-source cleanup decision: reconcile docs with actual code, resolve inactive Thymeleaf template status, and document the no-longer-missing interaction systems.
2. Integration audit of scaffolded components: decide which placeholder/reusable advanced-experience components should be integrated, completed, or deleted later.
3. Browser QA pass with an approved automation path: inspect desktop/mobile routes, navigation, theme switching, WebGL hero, fallback path, scroll reveal, cursor aura, tilt, console output, and horizontal overflow.

## Verification Commands Run

```powershell
git branch --show-current
git status --short --branch
git log --oneline -n 8
npm run build
npm run
$env:SKIP_FRONTEND_BUILD='1'; .\gradlew.bat test
npm ls three @react-three/fiber @react-three/drei gsap @gsap/react motion framer-motion lenis @react-three/postprocessing postprocessing --depth=0
npm run preview -- --host 127.0.0.1 --port 4173
```

The Vite preview process was stopped after HTTP route smoke checks.
