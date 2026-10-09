# Crystal Powers 2.0 — design, workflow and usability audit

Audit date: 1 October 2026. Owner: James. Baseline: `James/immersive-rebuild`, commit `305073e`. Working tree was clean at the start.

This is the working checklist for a substantial new Crystal Powers experience: new art direction, page compositions, interactions, authored 3D and better customer and owner workflows. It is an audit and implementation plan; unchecked items are proposed work, not delivered features. “Version 1.1” describes the existing experience in James’s brief, rather than a verified release tag. The frontend package currently declares `1.0.0`; the backend declares `0.0.1-SNAPSHOT`. A release number change alone does not complete 2.0.

## How to work through this file

Work in the order in section 11, then review each page separately. Use task IDs in commits and progress notes. Tick a task only after its behaviour and applicable acceptance checks pass. For anything that needs content or a business decision, record that dependency rather than inventing an answer.

Each page has an audit, a proposed composition, actionable tasks, ownership and a completion gate. The shared acceptance checklist in section 12 applies to every redesigned page. Keep a short dated evidence entry in section 13 when a page is completed.

Priority: **P0** = release readiness dependency; **P1** = core 2.0 work; **P2** = enhancement after core journeys work. Effort is relative: **S** = contained change; **M** = several components; **L** = a feature or asset production phase. These are not time or price estimates.

## 1. What the app actually is

Crystal Powers is an independent digital studio led by James. The public site introduces the studio, presents work, explains website/app/system services and collects enquiries. The owner studio manages projects privately, then publishes them to the public portfolio without a deployment.

### Active architecture and ownership

| Area | Current implementation | Preserve / use for 2.0 |
| --- | --- | --- |
| Public routing | `frontend/src/app/App.tsx`, React Router | Existing URLs, direct entry, `/home` redirect, back/forward |
| Shared shell | `frontend/src/app/Layout.tsx` | Skip link, route focus, navigation, theme persistence, footer |
| Public page source | `frontend/src/routes/` | Route ownership; extract feature components when useful |
| Active styles | `styles/index.css` imports `base/studio-base.css`, `pages/studio.css`, `pages/admin.css`, `pages/studio-interiors.css` | Build the new system here; old page CSS is not the active styling foundation |
| Active 3D | `features/experience/ModelStage.tsx`, `ModelCanvas.tsx`, `ExperienceContext.tsx` | Lazy scene loading, one active stage, focus/keyboard controls, offscreen and hidden-tab handling, rendered fallback |
| Original asset pipeline | `assets/blender/`, exported `frontend/public/models/` and `renders/` | Editable originals, GLB animation clips, device screen metadata and optimised stills |
| Portfolio | `features/portfolio/projectApi.ts`, `ProjectPresentation.tsx`, `FeaturedProjects.tsx` | Published-only public data; separate private media/preview |
| Enquiries | `routes/Contact.tsx`, `Services.tsx`, `features/contact/` | Server validation, error feedback, multipart uploads, delivery and rate limits |
| Owner publishing | `routes/Admin.tsx`, `features/admin/` | Draft/published distinction, revisions, conflicts, private uploads, reauthentication |
| Backend | Spring Boot 3.5.16 / Java 17, controller/service/repository/security packages | Maintain layering, CSRF/session/MFA protection, storage boundaries |
| Delivery | Vite build → Gradle static resources → Spring | SPA fallback, legacy `.html` redirects, server metadata, robots and dynamic sitemap |

Dependencies already include React, React Router, Three.js, React Three Fiber, Drei, GSAP, `@gsap/react` and Motion. Reuse installed capabilities deliberately. Their presence does not mean all of them should drive every interaction. No dependencies were installed for this audit; new installations require James’s explicit authorisation.

`components/hero/CrystalOpenerScene.tsx` and several earlier components/styles remain in the tree but are inactive in the current public experience. Do not improve the old crystal component and expect the current homepage to change.

### Complete route and screen inventory

| Surface | Route / state | Audit evidence |
| --- | --- | --- |
| Homepage | `/` | Source, desktop/mobile browser, crystal viewer activation |
| Studio | `/about` | Source, desktop screenshot, mobile DOM/overflow check |
| Services / quote builder | `/services` | Source, desktop full-page and mobile viewport screenshots, selection interaction |
| Portfolio index | `/portfolio` | Source, desktop empty-state screenshot, mobile DOM/overflow check |
| Project case study | `/portfolio/:slug` | Source only for populated content; no published local projects |
| Support | `/support` | Source, desktop full-page screenshot, mobile DOM/overflow check |
| Contact | `/contact` | Source, desktop/mobile full-page screenshots, selection-continuity check |
| Owner sign-in | `/admin` signed out | Source and loaded browser DOM; no credentials entered |
| Owner setup / MFA / recovery codes | `/admin` authentication states | Source only |
| Password recovery | `/admin/reset`; recovery panel from sign-in | Source and loaded desktop DOM; no reset request sent |
| Owner dashboard / new draft / archived work | `/admin` signed in | Source only; no owner session used |
| Project editor / media / story / revisions / preview | `/admin` selected project | Source only |
| Account security | `/admin` settings state | Source only |
| Session expiry / reauthentication | `/admin` modal state | Source only |
| 404 | unmatched route and missing project | Source and desktop browser; mobile unmatched route check |
| Home alias | `/home` → `/` | Route source |
| Legacy links | `/home.html`, `/about.html`, `/services.html`, `/portfolio.html`, `/support.html`, `/contact.html` | Backend redirect source |
| Special birthday experience | `/birthday/mission-vi` | Source and desktop browser of current post-birthday state |
| Historical birthday experience | same special route before date cutover | Source only; no clock manipulation |

No standalone privacy, accessibility, FAQ, booking, client portal or service-detail routes currently appear in the active route table. Proposed additions below are explicitly new work.

### Important documentation drift

`docs/PROJECT_STRUCTURE.md` and the September handover describe the newer ownership more accurately than `docs/agent.md`, `docs/content.md`, `docs/memory.md` and `docs/ADVANCED_EXPERIENCE_AUDIT.md`. Older documents refer to the previous hero, CSS foundation, content and missing interaction systems. The current scroll-reveal implementation exists; this audit does not repeat the old claim that it is missing. The installed animation packages also contradict older “not yet installed” guidance.

- [ ] **BASE-01 / P0 / S:** Reconcile architecture, content and session documentation against the completed 2.0 implementation. Mark the old audit as historical with a pointer to this file; do not erase its historical evidence.
- [ ] **BASE-02 / P1 / M:** Trace imports before removing legacy components/CSS/assets. Remove only proven unused material after the replacement has passed QA.

## 2. Overall audit findings

These are pre-existing observations, not regressions introduced by this documentation task. Design judgements are recommendations; source findings and browser observations are labelled separately.

| ID | Priority | Evidence and finding | User impact | Recommended change |
| --- | --- | --- | --- | --- |
| F01 | P1 | Browser/source: public pages use a restrained dark editorial system, similar large headings, thin rules and repeated rectangular model posters | Consistent, but insufficient variety and spectacle for the requested futuristic 2.0 | New spatial composition and material language; distinct page identities within one system |
| F02 | P1 | Source/browser: crystal activation opens a viewer; playback is another `Animate` action. Manifest has `CrystalTurn`, not a crystal opening clip | The beginning lacks the click-to-open transformation James wants | Author a segmented crystal opening animation and connect it to a deliberate entry sequence |
| F03 | P1 | Desktop browser: live crystal looked substantially darker than the rendered poster | Activation changes the visual quality and feels detached | Match camera, lighting, surface response and silhouette between poster and live scene; validate beyond this one GPU |
| F04 | P1 | Source/browser: six packages, eleven additions, three maintenance options precede the services form; mobile document height measured 9,735 px at 390 px width | Large decision burden and long return trips to edit choices | Guided builder, compact comparison and persistent selection summary |
| F05 | P1 | Source: both enquiry endpoints use `ContactForm`, requiring package and maintenance; support links to `/contact` without context | A general question or existing-client issue must fit a new-build form | Introduce explicit enquiry intent and validate the correct fields for each intent |
| F06 | P1 | Browser: package selected in Services did not appear after moving to Contact; route-local state in both files confirms reset behaviour | Repeated work and interrupted enquiries | Shared in-memory brief state for non-sensitive selections, with explicit reset and supported back navigation |
| F07 | P1 | Mobile screenshot: Contact places empty package/addition/maintenance/contact-summary blocks ahead of its first field | Visitors scroll past information they have not supplied | Put the form first on mobile; reveal a useful summary after selections exist |
| F08 | P0 | Local browser: portfolio returned a legitimate empty state; homepage consequently showed no featured work | The main promise lacks project evidence in this environment | Prepare truthful, permission-cleared project content; verify production inventory separately |
| F09 | P1 | Source: Contact additions is a single select; Services supports multiple selections with pipe-delimited values | Different capabilities for the same brief | Reuse a consistent multi-selection control while preserving the server format |
| F10 | P1 | Source: `ProjectPresentation` uses `image` on the active canvas, but `ModelStage` poster always uses a generic device render | Case-study device looks generic until the visitor activates 3D | Add a lightweight project-specific 2D screen composition to the inactive device view |
| F11 | P1 | Source/browser: navigation labels differ: desktop “Work/Studio”, mobile “Portfolio/About”; contact CTA is hidden on narrow screens | Less consistent navigation and weaker project entry on mobile | Harmonise labels and provide a visible, compact mobile project CTA |
| F12 | P1 | Source: published project metadata and `RouteMetadata` both update page metadata; client hook does not update `og:image` | Potential competing metadata effects and stale share image during SPA navigation | Give route metadata one clear owner; test direct HTML and client navigation independently |
| F13 | P2 | Source: SPA fallback returns HTTP 200 for unknown page paths; React shows 404 | Visual recovery works; HTTP semantics need separate review | Review a real server-side 404 response without breaking valid SPA routes |
| F14 | P1 | Source: owner editor has valuable safeguards, but dashboard uses plain rows/order numbers, and the public shell surrounds private work | Managing a growing showcase takes extra scanning; public nav distracts | Dedicated owner workspace, thumbnail/status overview and clearer save/publish hierarchy |
| F15 | P1 | Source: warm/fresh themes mostly change accent; 3D appearance collapses five themes to light/dark | Personalisation is shallow relative to a complete new art direction | Preserve all IDs/persistence; define full token and material palettes for each |
| F16 | P1 | Source: laptop has 104 meshes / 106 nodes; live crystals use transmission materials; canvas requests high-performance power | Future effects could raise draw calls/GPU cost sharply | Model optimisation and measured quality tiers before adding heavier effects |

### What should be retained

The independent founder positioning, truthful copy, existing route structure, server validation, lazy WebGL activation, rendered fallbacks, keyboard rotation/Escape, device screens, private publication model, revision history and security protections are useful foundations. A new visual system should make these capabilities more visible and easier to use.

## 3. Crystal Powers 2.0 art direction

**Proposed direction: a precision-built crystal observatory.** A visitor encounters a luminous engineered crystal suspended inside a sculptural frame. It opens into the work: layered project windows, device displays and clear routes to a conversation. The site should feel designed in depth, with clean information at the front and richer visual discovery behind it.

Make the new experience visibly different through composition, not just new colours:

- Graphite/ink foundations, cool white text, restrained violet and spectral cyan highlights; warm neutral light surfaces as a fully designed alternative.
- Large, confident display type paired with readable body text; small technical labels used sparingly. Existing Manrope can remain for body copy while display typography is explored. Font selection/licensing must be settled before delivery.
- Faceted masks, offset frames, precisely cut panel corners and controlled translucent materials. Use angular geometry as a repeated brand motif with generous reading areas.
- Asymmetric project compositions, full-width visual chapters and alternating dense/quiet sections. Avoid repeating one hero-plus-card-grid layout everywhere.
- Genuine depth from light, materials and alignment; flat controls remain legible and operable over the scene.
- One memorable interaction per key page: crystal opening, work exploration, service configuration, studio process or brief completion. Motion has a hierarchy rather than equal intensity everywhere.

### Shared design-system tasks

- [ ] **DS-01 / P1 / M:** Create a 2.0 token set: colour, type scale, space, radius/cut geometry, elevation, border, focus and motion. Give tokens semantic names and map all five existing appearances.
- [ ] **DS-02 / P1 / M:** Design shared buttons, links, field states, selection tiles, disclosures, badges, tabs, loading panels, errors and success panels. Specify default/hover/focus/selected/disabled states.
- [ ] **DS-03 / P1 / M:** Build responsive composition rules for 320, 390, 768, 1024, 1440 and 1920 px. Use fluid spacing without letting long pages become empty stages.
- [ ] **DS-04 / P1 / M:** Produce a representative homepage, Services builder and case-study visual draft before implementing every page. Confirm that the same system works for content-heavy screens.
- [ ] **DS-05 / P1 / S:** Add a presentation-level “Reduce effects” preference alongside system reduced motion. It must actually suppress decorative motion and expensive rendering; persist only a harmless preference.
- [ ] **DS-06 / P1 / M:** Rebuild the shell: consistent “Work / Services / Studio / Support / Contact” labels, active states, mobile menu, appearance chooser and visible project entry.
- [ ] **DS-07 / P1 / S:** Design footer navigation and useful trust information; add links to new informational pages only when their content exists.

**Completion gate:** a coherent desktop/mobile design sample in every appearance; readable form states; keyboard navigation; motion-free equivalents. No page is dependent on 3D for essential information.

## 4. Page-by-page public audit and checklist

### 4.1 Homepage — `/`

**Job:** explain what James builds, show credible work, invite exploration and lead to a project conversation.

**Current:** oversized brand heading, crystal poster/viewer, studio introduction, generic device tabs, featured projects, three service rows, four delivery steps and final CTA. The craft is restrained, but the repeatable poster/viewer does not create an opening transformation. Generic screen artwork also demonstrates devices rather than actual work.

**New composition:** immediate studio promise and project CTA over a crystal observatory; optional click-to-open sequence; featured project windows; an interactive responsive project display; three service pathways; a compact delivery timeline; final brief entry. Move proof earlier and reduce repeated abstract statements.

- [ ] **HOME-01 / P1 / L:** Recompose the hero with the 2.0 crystal/frame asset and a clear offer visible before any click. Include “Open the experience”, “View work” and “Start a project” without presenting three equally dominant buttons.
- [ ] **HOME-02 / P1 / L:** Integrate the opening storyboard in section 7. Preserve direct browsing, skip, replay, keyboard and static fallback.
- [ ] **HOME-03 / P0 / M:** Populate featured work from cleared published projects; give an intentional compact no-work/error fallback rather than silently losing the proof section.
- [ ] **HOME-04 / P1 / M:** Connect device selection to an actual featured project. Display suitable desktop/mobile screenshots; label concept/demo artwork honestly if used.
- [ ] **HOME-05 / P1 / M:** Turn service rows into distinct Website / App / Bespoke system pathways that carry intent into Services or Contact.
- [ ] **HOME-06 / P1 / M:** Rebuild the delivery sequence as selectable chapters with visible content and clear deliverables. Keep natural scrolling.
- [ ] **HOME-07 / P1 / S:** Tighten copy around the customer’s outcome and the advantage of working directly with James.
- [ ] **HOME-08 / P1 / M:** Rework mobile hero height and control positioning; show the offer and meaningful CTA in the first screen, followed by optional art.

**Files:** `routes/Home.tsx`, `features/experience/`, `features/portfolio/FeaturedProjects.tsx`, active studio styles; original/exported assets. **Gate:** first-time and returning visitor paths work; slow/no-3D device still gets complete offer and proof; opening does not block navigation.

### 4.2 Studio / About — `/about`

**Job:** make James credible and explain the working relationship.

**Current:** strong independent-studio positioning, founder text, another crystal, principles and CTA. The founder image slot is occupied by brand art, and the page shares much of the homepage’s visual rhythm. It says how the studio works without showing many concrete examples.

**New composition:** personal introduction with a real founder portrait if James supplies one; studio tools/work artefacts; process chapters; practical collaboration expectations; relevant project link and conversation CTA. Portrait is a content dependency, not a generated likeness.

- [ ] **ABOUT-01 / P1 / M:** Design a distinct founder-led composition with an optional approved portrait and smaller crystal signature.
- [ ] **ABOUT-02 / P1 / M:** Show selected design/build artefacts and explain decisions in plain language.
- [ ] **ABOUT-03 / P1 / M:** Make process chapters interactive: what James needs, what the client sees, feedback points and handover.
- [ ] **ABOUT-04 / P1 / S:** Explain communication, ownership/handover and aftercare accurately; avoid invented availability, qualifications or clients.
- [ ] **ABOUT-05 / P2 / M:** Add a restrained layered workspace illustration; use DOM/SVG for diagrams and reserve WebGL for useful object exploration.

**Files:** `routes/About.tsx`, shared process components, active studio styles, approved media. **Gate:** visitor can understand who they will work with, how feedback happens and where to go next without exploring the visual.

### 4.3 Services and quote builder — `/services`

**Job:** help visitors choose a suitable service, understand cost boundaries and send a coherent brief.

**Current:** website packages dominate even though the hero also promises apps and systems. Six long single-choice tiles, eleven additions and three mandatory maintenance options lead to a form. Package labels such as “Experienced” and “Multi Grade” describe tiers unclearly. Selections update the summary, but there is no continuous summary during most of the journey. Total length is especially high on mobile.

**New composition:** service-type selector → useful example and scope → website package comparison or bespoke route → relevant optional additions → aftercare discussion → brief review and contact details. The builder is a focused workspace, with prices and assumptions visible and choices easy to edit.

- [ ] **SERV-01 / P1 / L:** Add Website / App / Bespoke system routing within the page; retain a direct browse-all packages view.
- [ ] **SERV-02 / P1 / M:** Redesign package comparison around suitability, included work and limits. Preserve existing prices and wire values until a separate commercial decision changes them.
- [ ] **SERV-03 / P1 / M:** Build a progressive builder with step labels, Back/Continue, edit-from-summary and state retained within the visit. Each step must be linkable or recoverable through defined navigation.
- [ ] **SERV-04 / P1 / M:** Group additions by purpose; surface applicable ones first without silently discarding prior choices. Use consistent multi-select semantics and an explicit selected count.
- [ ] **SERV-05 / P1 / M:** Show one-time and recurring charges separately. Custom items stay “To be scoped”; never treat them as £0 or present a binding final quote.
- [ ] **SERV-06 / P1 / M:** Provide a compact desktop summary and mobile summary disclosure that never covers fields or submit controls.
- [ ] **SERV-07 / P1 / L:** Resolve maintenance-before-enquiry friction with the backend contract work in section 8. A “Discuss aftercare” choice needs intentional server validation and email presentation.
- [ ] **SERV-08 / P1 / M:** Upgrade attachments with filenames, individual remove actions and local count/size guidance while keeping server checks authoritative. Match accepted types and limits exactly.
- [ ] **SERV-09 / P1 / M:** Add a review step, explicit sending state, useful completion panel and field-linked error summary. Keep the brief intact on failure.
- [ ] **SERV-10 / P2 / M:** Use a small responsive interface preview to explain service differences. No heavy 3D inside form controls.

**Files:** `routes/Services.tsx`, `features/services/services.ts`, shared brief/contact feature, active interior styles; backend DTO/controller/email/tests for changed intent or requirements. **Gate:** website and bespoke visitors complete a brief on mobile; choices survive Back/edit; keyboard selection works; amount labels remain accurate; validation/429/503/upload failures preserve inputs.

### 4.4 Portfolio / Work — `/portfolio`

**Job:** prove design and delivery capability and help a visitor identify relevant work.

**Current:** large editorial heading, category filters and vertical entries sourced from the publishing API. In this local database the list is empty. This is not proof that the live site has no work. Do not fill the list with invented projects or publish private drafts just to complete the audit.

**New composition:** featured project stage, editorial work grid with real screenshots, useful category filters, compact project outcomes and a relevant enquiry entry. Visually distinct projects should have space to show their identities.

- [ ] **WORK-01 / P0 / M:** Select projects that can be shared and prepare real cover/screenshots/story content. Obtain any client/content permission needed before publication.
- [ ] **WORK-02 / P1 / L:** Build a showcase with varied but predictable project layouts; imagery leads and category/summary stay readable.
- [ ] **WORK-03 / P1 / M:** Preserve filter state when returning from a project; add result counts and a useful zero-results reset.
- [ ] **WORK-04 / P1 / M:** Add stable loading placeholders and intentional API-error/empty states, with retry and contact routes.
- [ ] **WORK-05 / P1 / M:** Give hover and keyboard focus an equivalent project preview. Touch opens the project normally; no hover-only descriptions.
- [ ] **WORK-06 / P2 / M:** Evaluate search only when the real portfolio volume justifies it; avoid empty controls over a small collection.

**Files:** `routes/Portfolio.tsx`, portfolio feature components/API hook, active studio styles. **Gate:** real published entries, all categories, empty results, API failure and return navigation verified; no private media leaks; responsive imagery and layout stability checked.

### 4.5 Project case study — `/portfolio/:slug`

**Job:** explain a real challenge, show how it was solved, demonstrate the finished work and lead to a relevant brief.

**Current source:** project headline/summary, live link, cover, 3D display, idea/approach/outcome text, gallery and CTA. The same cover is used as the device texture even if its aspect ratio does not fit. The inactive device poster is generic. There is no next-project journey or section navigation. A populated page was not browser-verified because the local public list is empty.

**New composition:** dramatic real project cover with succinct facts; challenge and scope; selected design decisions; interactive responsive device showcase; captioned gallery; evidenced outcome; next project and “Build something like this”.

- [ ] **CASE-01 / P1 / L:** Rebuild case-study composition using existing overview/approach/outcome fields first; add structured fields only where they provide real editorial value.
- [ ] **CASE-02 / P1 / M:** Provide an accurate project-specific inactive device preview, then optional live 3D with matched camera and materials.
- [ ] **CASE-03 / P1 / L:** Support separate desktop/mobile screen images, so switching devices shows the appropriate design rather than squeezing a single cover into every screen.
- [ ] **CASE-04 / P1 / M:** Add captioned gallery exploration with optional accessible lightbox: named controls, keyboard previous/next, Escape and focus return.
- [ ] **CASE-05 / P1 / M:** Add section jump navigation, next/previous work and preserved portfolio filter context.
- [ ] **CASE-06 / P1 / M:** Carry project interest into Contact without copying private data or claiming a fixed quote.
- [ ] **CASE-07 / P1 / M:** Resolve metadata ownership and project share imagery; verify a direct HTML request and an internal link to the same case study.
- [ ] **CASE-08 / P0 / M:** Verify published/missing/unpublished project paths and private preview boundaries using authorised test content.

**Files:** `routes/PortfolioProject.tsx`, `ProjectPresentation.tsx`, `ModelStage.tsx`, portfolio contract/editor/backend/schema if new screen fields are introduced. **Gate:** a real or clearly labelled local test project exercises the entire page; gallery and device assets are accurate; draft never appears publicly; outcome claims have evidence.

### 4.6 Support — `/support`

**Job:** reassure existing clients, explain aftercare and collect actionable support information.

**Current:** service-like heading, three support descriptions, generic monitor and contact links. The maintenance link leads to the top of Services. Support contact does not carry support intent and reaches the build form.

**New composition:** “What do you need?” issue/update/improvement selection; concise aftercare options; useful troubleshooting guidance; support-specific brief and expectations. A diagram or interface example is more useful here than another decorative device stage.

- [ ] **SUP-01 / P1 / M:** Recompose as a service desk with issue, content update and improvement paths.
- [ ] **SUP-02 / P1 / L:** Route a support intent into the enquiry workflow; ask for website address, what happened, expected result and reproduction steps. Attachments require explicit backend support.
- [ ] **SUP-03 / P1 / S:** Deep-link maintenance information to its actual section or dedicated comparison, rather than the Services hero.
- [ ] **SUP-04 / P1 / M:** Add concise scope/exclusions and useful FAQs. Use agreed response expectations; no invented SLA, monitoring claim or guaranteed uptime.
- [ ] **SUP-05 / P2 / M:** Replace the generic monitor with an explanatory layered DOM/SVG diagram or a small supported interface example.

**Files:** `routes/Support.tsx`, shared enquiry feature, service data and related backend contracts where required. **Gate:** existing client can submit an issue without pretending to commission a new website; response/cost expectations are clear.

### 4.7 Contact / Start a project — `/contact`

**Job:** make it easy to contact James at different stages of a project.

**Current:** model-led hero followed by two-column form/summary. On mobile, empty summaries precede the form. Message and extra-information fields overlap in purpose. Both package and maintenance must be chosen. Optional phone can remain blank even when WhatsApp is selected; clarify and validate the selected communication route intentionally.

**New composition:** short introduction → enquiry purpose → minimal relevant questions → optional brief detail → review/send → clear next step. Keep project configuration available to visitors who already know their scope, rather than asking everyone to repeat it.

- [ ] **CONTACT-01 / P1 / L:** Create Project / General question / Existing-client support modes; initial view depends on incoming intent but can be changed visibly.
- [ ] **CONTACT-02 / P1 / M:** Put the first meaningful field near the introduction; move summary below fields on mobile or show it only when useful.
- [ ] **CONTACT-03 / P1 / M:** Share non-sensitive selections with Services and retain inputs during internal edits. Do not persist names, emails, phone numbers or messages to browser storage by default.
- [ ] **CONTACT-04 / P1 / M:** Unify addition selection with Services; keep clear optional “Not sure yet” scope choices once the server supports them.
- [ ] **CONTACT-05 / P1 / M:** Clarify labels, required/optional status and contact preference; reveal phone guidance for WhatsApp and keep client/server rules aligned.
- [ ] **CONTACT-06 / P1 / M:** Add field-linked error summary and intentional completion screen. Keep sending/failure/retry states understandable; never claim delivery solely because the button was pressed.
- [ ] **CONTACT-07 / P1 / S:** Replace the plain internal Services anchor with router navigation so internal journeys keep their intended state.
- [ ] **CONTACT-08 / P1 / M:** Add an approved privacy explanation and links to the relevant informational page. Explain next steps without invented turnaround promises.
- [ ] **CONTACT-09 / P2 / S:** Use a subtle framing/light response to step completion rather than a large interactive phone above the form.

**Files:** `routes/Contact.tsx`, `features/contact/`, shared brief state, active interior styles, backend contracts/tests for new modes. **Gate:** short enquiry and full brief both work; mobile form order is useful; appropriate required fields; no data loss on failure; mail delivery tested only through the approved environment.

### 4.8 Missing page / missing project — 404

**Current:** readable recovery message with home/work links and shared shell. It is useful but visually repeats the page-heading template. The server’s generic SPA fallback still returns 200.

- [ ] **ERR-01 / P1 / S:** Create a branded “lost signal” illustration with one clear recovery action and links to Work/Contact. Static/SVG art is sufficient.
- [ ] **ERR-02 / P1 / S:** Distinguish missing project from temporary project API failure; retain retry on service failures.
- [ ] **ERR-03 / P2 / M:** Review HTTP 404 semantics and noindex behaviour with server metadata and SPA routes.

**Files:** `routes/NotFound.tsx`, `PortfolioProject.tsx`, active styles; `SpaController`/metadata/tests if HTTP behaviour changes. **Gate:** unmatched and missing project navigation returns to a valid page; error handling does not mistake network failure for nonexistent content.

### 4.9 Special birthday route — `/birthday/mission-vi`

This is a separate personal experience outside `Layout`, not an ordinary Crystal Powers service page. At audit time the route displayed `PostBirthdayMission`: its own chapter navigation, imagery, night-drive control and countdown. The older birthday reveal remains selected only before the configured cutover date. This plan includes the route so it cannot be accidentally broken or omitted.

- [ ] **SPECIAL-01 / P1 / S:** Preserve the existing route, date branch, story and separate styling during the public 2.0 build; check for global CSS/font/motion leakage.
- [ ] **SPECIAL-02 / P2 / M:** Review its mobile, keyboard, reduced-motion and countdown-expiry states in a separate pass before redesigning this personal experience.
- [ ] **SPECIAL-03 / P2 / S:** Verify time-sensitive public statements against their official source if content is updated. This audit records what the app says; it does not certify the game release date or purchase claim.

**Files:** `BirthdayMission.tsx`, `PostBirthdayMission.tsx`, birthday styles. **Gate:** special route still works independently and is excluded from the public sitemap/indexing. A separate requested redesign would preserve the personal message.

## 5. Owner studio — every screen and workflow

These recommendations are grounded in source inspection. Authenticated visual/runtime acceptance remains open; no account setup, sign-in, publishing or credential changes were performed during this audit.

### 5.1 Sign-in — `/admin`

Current login is inside the marketing shell. Security flow includes password, MFA, optional first-owner setup and recovery. A futuristic treatment should give this a quiet, dedicated workspace identity.

- [ ] **AUTH-01 / P1 / M:** Build a focused owner layout with a discreet public-site link, clear sign-in fields and restrained brand art.
- [ ] **AUTH-02 / P1 / S:** Add accessible password visibility and clear busy/error states without logging credential values.
- [ ] **AUTH-03 / P1 / M:** Keep email/password/MFA validation and session protections unchanged through the visual refresh; verify server-rejection states.

**Owner:** `Admin.tsx`, `OwnerSignIn.tsx`, `admin.css`, app layout integration. **Gate:** sign-in remains usable by keyboard/password manager and provides a clear next step on failure.

### 5.2 First-owner setup, MFA enrolment, verification and recovery codes

Current enrolment displays a manual authenticator secret and codes once, with a stored-codes checkbox and download action. Keep that deliberate security journey.

- [ ] **AUTH-04 / P1 / M:** Design explicit Setup → Authenticator → Recovery codes → Studio steps with progress and accurate instructions.
- [ ] **AUTH-05 / P2 / M:** Evaluate a locally generated authenticator QR and copy control, with the manual key preserved. Never send secrets to an external QR service.
- [ ] **AUTH-06 / P1 / S:** Improve six-digit and recovery-code entry without forcing recovery codes into a numeric-only field.
- [ ] **AUTH-07 / P1 / M:** Verify one-time code display/download, completion acknowledgement and return-to-sign-in; keep secrets out of screenshots and QA records.

**Owner:** `OwnerSignIn.tsx`, existing security APIs and tests if logic changes. **Gate:** no bypass of MFA and no secret exposure from the new UI.

### 5.3 Password recovery — `/admin/reset`

Current recovery supports request/reset modes; reset token is held in memory and removed from the address bar. Preserve this behaviour.

- [ ] **REC-01 / P1 / M:** Design request-sent, reset, expired/invalid link, verification failure and completion states distinctly.
- [ ] **REC-02 / P1 / S:** Preserve generic account-existence messaging, token handling, authenticator/recovery requirement and safe return to sign-in.
- [ ] **REC-03 / P1 / M:** Verify the full recovery flow with a synthetic local owner and disabled/test mail; actual credential entry remains a user action where required.

**Owner:** `OwnerRecovery.tsx`, security contracts. **Gate:** understandable recovery without weakening protection or capturing tokens in analytics.

### 5.4 Dashboard, new project and archived projects

Current dashboard exposes title/status/address, featured checkbox, numeric order and editor entry; creation needs title and slug. There is no thumbnail-driven overview or search/status grouping.

- [ ] **ADMIN-01 / P1 / L:** Build a dedicated workspace with thumbnail rows/cards, saved/published revision status, last update, featured status and sensible sorting.
- [ ] **ADMIN-02 / P1 / M:** Add draft/published/archived filters and empty/loading/error states. Add search only when collection size supports it.
- [ ] **ADMIN-03 / P1 / M:** Improve new-draft creation with a suggested slug and an explicit editable preview; keep existing project addresses stable.
- [ ] **ADMIN-04 / P1 / M:** Improve featured ordering with accessible move-up/down controls. Drag ordering is optional and needs the same keyboard equivalent and conflict handling.
- [ ] **ADMIN-05 / P1 / M:** Make archive/restore status visible and explain impact on public visibility before the action.

**Owner:** `Admin.tsx`, portfolio API/types, `admin.css`. **Gate:** James can identify, create, open and order projects efficiently without confusing draft/published/archive status.

### 5.5 Project editor — Details, Images, Story, History, Preview

Current editor already separates draft save from publishing, has revision restore, private uploads/preview, conflicts and unsaved-change warnings. Keep this strength; improve discoverability and media editing.

- [ ] **EDIT-01 / P1 / L:** Design a readable editor with persistent project identity, save status, section navigation and a clear Save draft / Preview / Publish hierarchy.
- [ ] **EDIT-02 / P1 / M:** Make publishing readiness link directly to the missing field; distinguish missing content from unsaved work.
- [ ] **EDIT-03 / P1 / L:** Add media thumbnails, descriptive labels, cover choice, gallery ordering and separate responsive device screenshots if CASE-03 is adopted.
- [ ] **EDIT-04 / P1 / M:** Give Story fields purpose and examples that encourage truthful case studies; avoid invented metrics.
- [ ] **EDIT-05 / P1 / M:** Improve History with timestamps, draft/published markers and clear restore-as-new-draft explanation. A diff view is P2.
- [ ] **EDIT-06 / P1 / L:** Offer desktop/tablet/mobile private preview using the same public presentation components; preserve private-media authentication.
- [ ] **EDIT-07 / P1 / M:** Add an explicit publish review explaining exactly which saved revision goes live. Verify unpublish/archive/restore from this screen.
- [ ] **EDIT-08 / P1 / M:** Keep stale-version conflict handling and inputs intact; make reload/discard consequences clear.
- [ ] **EDIT-09 / P2 / L:** Evaluate autosave only after defining concurrency, debounce, network failure and revision-history behaviour. Explicit save remains the initial 2.0 default.

**Owner:** `ProjectEditor.tsx`, `ProjectPresentation.tsx`, portfolio contracts, backend DTO/service/repository/migrations for new fields. **Gate:** upload → draft → preview → publish → public view → revision restore works with test content; no draft leaks and no lost edits after failure/conflict.

### 5.6 Account security

Current settings include password changes, authenticator replacement and recovery-code replacement, with password/code verification.

- [ ] **SEC-01 / P1 / M:** Design separate labelled sections with clear consequences and completion states; keep secrets and codes deliberately contained.
- [ ] **SEC-02 / P1 / M:** Preserve verification requirements and session invalidation behaviour. Verify replacement-code acknowledgement and the route back to the dashboard.

**Owner:** `OwnerSettings.tsx`, existing security APIs. **Gate:** security workflows stay deliberate and comprehensible; visual refresh does not broaden access.

### 5.7 Session expiry and reauthentication

Current modal holds the unsaved draft in the page and requires sign-in again. It prevents cancellation, so the redesigned flow needs an intentional safe exit as well as a clear continuation.

- [ ] **SESSION-01 / P1 / M:** Explain that edits remain in the current tab; preserve content through successful reauthentication and failed attempts.
- [ ] **SESSION-02 / P1 / M:** Define an explicit discard-and-leave action with confirmation, focus management and a warning before closing the tab.
- [ ] **SESSION-03 / P1 / M:** Test expiry during edit, save, upload and publication; actions must not be shown as completed without server confirmation.

**Owner:** `Admin.tsx`, `ProjectEditor.tsx`, API helper and security tests. **Gate:** expired sessions do not silently lose content, publish twice or leave an unusable focus state.

## 6. New informational pages and optional features

Build only pages with a real user job. The list below is a proposal, not a claim that these routes or services exist.

| Proposal | Value | Recommendation / dependency |
| --- | --- | --- |
| Privacy information — proposed `/privacy` | Explain enquiry handling, media, providers, retention and contact | P1 content dependency: describe actual operations; review with James before publication |
| Accessibility information — proposed `/accessibility` | Explain usable alternatives and how to report a barrier | P1: publish actual supported behaviour and known limitations, not an untested conformance claim |
| Delivery/process guide | Explain feedback, handover and support | P1 as an About section first; separate route only if content warrants it |
| Service-detail pages | Give websites/apps/systems specific examples and scope | P2 after Services journeys work; add routing, metadata and sitemap together |
| Public lab / experiments | Showcase clearly labelled prototypes and interaction craft | P2: only with real experiments, accessible fallbacks and honest demo labels |
| Client portal / progress tracking | Could improve an ongoing client relationship | Later release: requires its own roles, data model and workflows; owner authentication is not a client portal |
| Booking calendar | Could reduce scheduling effort | P2: requires James’s real availability, chosen integration and data handling |
| AI assistant / chatbot | Could answer repeated enquiries | Deferred until a specific useful job, reliable content, privacy and cost are defined |

- [ ] **NEW-01 / P1 / M:** Prepare privacy/accessibility content from real operations; create routes only when ready; add footer, metadata and sitemap entries.
- [ ] **NEW-02 / P2 / S:** Revisit optional additions after core public and owner journeys pass. Record value and operating cost before committing to them.

## 7. Animation and 3D production plan

### 7.1 Signature opening storyboard

The requested click-and-open moment needs a new authored asset. Current `crystal.glb` supplies `CrystalTurn`; `laptop.glb` supplies `LaptopOpen`. The active code selects the first available animation, which will be unsuitable once the crystal has multiple named clips.

**Proposed sequence, subject to visual iteration:**

1. **Rest:** a recognisable faceted crystal in a precision frame; text/CTAs already usable. On weaker devices show the matching rendered still.
2. **Intent:** hover/focus gives a small lighting response. “Open the experience” is a real DOM button; tapping the art is an optional equivalent, not the only control.
3. **Loading:** keep the still visible with a truthful loading state. Allow cancellation and browsing while the scene prepares.
4. **Open:** a short light pulse, frame unlock and separate crystal facets rotate/translate outward around a luminous core. Proposed authored clip: `CrystalOpen`. Aim for approximately 1.2–1.6 seconds after readiness; measure and refine.
5. **Reveal:** opening geometry aligns with a faceted mask revealing project windows behind it. Typography remains DOM content; a short 250–400 ms interface transition connects the physical action to the content.
6. **Explore:** settles to stillness; optional drag/rotate, replay and close/reset controls. A Work CTA goes to the portfolio; the animation does not unexpectedly navigate or steal scroll.
7. **Return:** reverse or authored `CrystalClose` returns to the rest state. Returning visitors are not forced through the opening again.

Reduced motion: immediate open-state still or a very brief opacity change, no explosion, orbit, parallax or auto-loop. Mobile: simplified facet count and lighting, fixed camera framing, no pointer dependence. Failure: preserve the poster and content, announce unavailable 3D, and keep browsing possible.

- [ ] **3D-01 / P1 / L:** Create an original segmented crystal and engineered frame, with named parts/pivots and deliberate open/close choreography.
- [ ] **3D-02 / P1 / M:** Update animation contracts and action selection to explicit clip names; retain laptop opening and legacy single-clip compatibility where needed.
- [ ] **3D-03 / P1 / L:** Match poster/live framing, exposure, lighting and material treatment; avoid the observed dark live-view mismatch.
- [ ] **3D-04 / P1 / M:** Coordinate opening state and DOM masks using existing animation tools with one owner per property. Clean up all timelines and route transitions.
- [ ] **3D-05 / P1 / M:** Implement skip/replay/close/loading/error states, focus return and a short warm-up timeout that falls back cleanly.

### 7.2 Asset inventory and delivery

| Asset | Current verified file size / contract | 2.0 production need |
| --- | --- | --- |
| Crystal | 227,840 bytes; manifest: 5 meshes, `CrystalTurn` | New segmented geometry, opening/closing clips, matched light/dark posters |
| Laptop | 1,322,404 bytes; manifest: 104 meshes, `LaptopOpen` | Improve hinge choreography, consolidate materials/draw calls, better screen framing |
| Monitor | 62,828 bytes; no authored animation | Improve bezel/stand/material polish; project-specific display |
| Phone | 91,180 bytes; no authored animation | Improve screen/bezels, accurate mobile textures and crop |
| Crystal film | Dark 1,068,145 bytes; light 791,323 bytes | Optional new opening film only if it improves fallback; do not fetch it by default |
| Page diagrams | No new asset created in this audit | DOM/SVG service/process illustrations before additional WebGL scenes |

Paths: editable scenes/recipes in `assets/blender/`; GLBs in `frontend/public/models/`; web stills/films in `frontend/public/renders/`. Keep original scenes and exports separately reviewable.

- [ ] **ASSET-01 / P1 / M:** Record ownership/licence/provenance for any imported model or texture. Prefer original studio assets; buying/licensing assets needs a separate decision.
- [ ] **ASSET-02 / P1 / M:** Validate GLB transforms, normals, scale, pivots, named clips and self-contained buffers; preserve `Screen` / `role=project-screen` / physical aspect metadata.
- [ ] **ASSET-03 / P1 / M:** Consolidate laptop geometry/materials; create desktop/mobile quality variants where measurements justify them.
- [ ] **ASSET-04 / P1 / M:** Export mobile/desktop WebP posters, reserve dimensions and generate matching fallback views. Avoid requiring large PNGs for routine page paint.
- [ ] **ASSET-05 / P1 / M:** Extend asset manifest/validation for opening clip names, screen aspect ratios, model sizes and fallback availability.

### 7.3 Motion specification

Proposed timings below are design starting points, not measured production claims. Use CSS for small state transitions, an existing timeline library for authored sequences, and R3F for scene motion. Avoid overlapping ownership of the same transform.

| Interaction | Trigger / duration / easing | Mobile / reduced motion / failure | Cleanup |
| --- | --- | --- | --- |
| Crystal opening | Explicit activation; 1.2–1.6 s after ready; authored ease-in-out | Simplified fixed camera / open still / rendered fallback | Stop action and timeline; deactivate on route change |
| Route transition | Internal navigation; 180–300 ms; ease-out | Short opacity / immediate content / navigation still works | Cancel obsolete timeline; retain route-focus and history behaviour |
| Section introduction | First viewport entry; 300–500 ms; small translate and opacity | Smaller/no translate / immediate visibility / content visible if observer fails | Disconnect once revealed; clean on unmount |
| Work preview | Hover and focus; 150–250 ms; ease-out | Tap goes to project / no transform / static cover | Remove listeners and reset transform |
| Builder step | Continue/Back; 180–240 ms; ease-out | Same content order / instant / plain step change | Cancel outgoing animation; focus step heading or first error |
| Device change | Explicit selection; 250–450 ms; ease-in-out | Matched still until ready / instant switch / keep current poster | Dispose stage resources and restore focus appropriately |
| Menu/appearance | User toggle; 160–220 ms; ease-out | Accessible disclosure / instant / normal links remain | Escape and route close; focus return |
| Completion | Confirmed server success; 250–400 ms; short settling effect | Static confirmation / same message / textual status | No permanent loops; cancel on navigation |

- [ ] **MOTION-01 / P1 / M:** Implement a shared motion policy for system preference, Reduce effects, quality tier and page visibility.
- [ ] **MOTION-02 / P1 / M:** Add route/section transitions without delayed reading, scroll-jacking or hidden essential content.
- [ ] **MOTION-03 / P1 / M:** Verify cancellation during rapid navigation, repeated activation, tab hiding and stage switches; no duplicate listeners or accumulated canvases.

### 7.4 Proposed performance budgets

Targets for 2.0 verification, not current certification: ordinary public pages should not download WebGL until an experience needs it; one active canvas; DPR clamped to measured device tiers; demand rendering while idle; no continuous offscreen effect. Aim for LCP ≤2.5 s, CLS ≤0.1 and INP ≤200 ms under recorded representative conditions. Field performance requires later real-user evidence.

Aim for smooth desktop rendering near 60 fps and a stable mobile experience around 30 fps on agreed representative physical devices. If these cannot be sustained, degrade effects or use the still. Keep the current asset validator’s 5 MiB ceiling as a hard guard, but use a much tighter working target near 1 MiB for the new hero model and justify exceptions by measurement. Compression decoders may add dependencies and must be planned explicitly.

- [ ] **PERF-01 / P1 / M:** Record initial requests, compressed bundles, image/model sizes and rendering cost before/after each major visual feature.
- [ ] **PERF-02 / P1 / M:** Define low/standard/high rendering tiers controlling DPR, transmission resolution/samples, lighting and geometry; benchmark before adding bloom/refraction stacks.
- [ ] **PERF-03 / P1 / M:** Run physical-device checks separately from responsive browser checks; record device, viewport, quality, frame time and thermal behaviour.

## 8. Workflow and contract changes

The visual rebuild can preserve the existing React/Spring architecture. Several usability improvements do require deliberate data/API changes; they cannot be implemented only by hiding required fields.

| Change | Frontend impact | Backend / API / data impact | Verification and rollback |
| --- | --- | --- | --- |
| Shared build selections | Contact/Services use one visit-level brief state | None if payload remains current `ContactForm` | Back/edit/internal navigation; reset; do not persist personal fields. Roll back to route-local state if necessary |
| General/support enquiry intent | Different fields/labels/required states | Backward-compatible intent default; conditional DTO validation; email rendering; possibly a dedicated support endpoint | Existing legacy payload remains valid; new intent tests and mail-disabled integration checks; feature flag until both sides ready |
| Aftercare “discuss later” | Genuine undecided choice | Allowed value and validation/email update; preserve existing plan values | Both endpoints and failure messages; no fabricated plan selection |
| Responsive case-study screen media | New editor fields and display selection | Project DTO/types, storage references, schema/migration, revision and publication support | Old projects still render; private/public media checks; roll back UI without deleting retained data |
| Structured case-study fields | Optional timeline/scope/role/outcome modules | Only if adopted: additive nullable fields with old-content compatibility | Preview/public render parity and revision restore |
| Informational pages | Routes/footer/content/metadata | SPA/server metadata/sitemap entries | Direct load and internal links; remove unfinished links together |
| Owner layout | Workspace shell around existing states | Usually no API changes | Authentication and all editor journeys; restore old layout independently |

No destructive schema change, draft publication, price change, dependency installation, email transmission or deployment is part of this audit. Preserve enquiry rate limits, upload checks, private storage, CSRF/MFA/session boundaries, legacy redirects and share metadata.

- [ ] **FLOW-01 / P1 / M:** Define the enquiry-intent contract and required field matrix before changing the form UI.
- [ ] **FLOW-02 / P1 / M:** Trace Website/App/System/Support CTAs end to end and record incoming intent, fields, payload, response and next step.
- [ ] **FLOW-03 / P1 / M:** Define brief reset and unsaved-input behaviour for internal navigation, browser Back and refresh; keep private details out of URLs.
- [ ] **FLOW-04 / P1 / L:** Implement contract updates with server/client tests together and backwards compatibility for current enquiries.

## 9. Content and commercial decisions

- [ ] **CONTENT-01 / P0 / M:** Prepare real publishable projects and evidence-backed outcomes; clearly label demonstrations. No invented client testimonials or metrics.
- [ ] **CONTENT-02 / P1 / S:** Decide whether to keep existing package display names or use clearer customer-facing names while retaining wire values.
- [ ] **CONTENT-03 / P1 / S:** Confirm service inclusions, exclusions, aftercare expectations and handover wording. Existing prices remain unchanged pending a commercial decision.
- [ ] **CONTENT-04 / P1 / M:** Supply approved founder portrait/work artefacts if desired; design a complete alternative if no portrait is available.
- [ ] **CONTENT-05 / P1 / M:** Prepare accurate privacy/accessibility information and support expectations from real operating arrangements.
- [ ] **CONTENT-06 / P1 / S:** Review all public copy in British English under Crystal Powers branding, with the legal operator name only where needed.

## 10. Required user journeys

| Journey | 2.0 successful path |
| --- | --- |
| New visitor exploring | Offer visible → optional crystal opening → real work → relevant case study → contact |
| Visitor wants a website | Services → useful package comparison → optional additions → aftercare choice/discussion → brief review → confirmed enquiry response |
| App/system prospect | Service intent → relevant examples → bespoke questions → contact; no forced website package |
| Existing client needs help | Support → issue/update/improvement → relevant details → support enquiry; no new-build selections |
| Visitor undecided | Contact → general question → short form → clear next step |
| Visitor on weak/no-WebGL device | Complete static site → same content and links; art remains optional |
| Keyboard/reduced-motion visitor | All controls usable, motion-free equivalents, predictable focus and Escape behaviour |
| James updates work | Sign-in/MFA → dashboard → private draft → media/story → responsive private preview → save → publish → verify public view |
| James encounters a conflict/session expiry | Edits retained → clear reauthentication or conflict action → safe continuation or explicit discard |
| Broken link | Branded recovery → real route; temporary service error offers retry |

## 11. Implementation order and dependencies

Each phase should finish with a reviewable local result and an evidence entry. Begin with the visual foundation and homepage; complete the high-value enquiry journeys before expanding optional features.

| Phase | Scope | Depends on | Exit condition |
| --- | --- | --- | --- |
| A | Content inventory, architecture reconciliation, design tokens and representative drafts | Current audit | Chosen 2.0 visual direction and contracts; asset/content gaps recorded |
| B | Shared shell/themes, motion policy, original crystal asset prototype | A | Responsive shell plus accessible, cancellable opening prototype with fallback |
| C | Homepage | B and cleared project content | Offer/proof/3D/project entry verified together |
| D | Services builder, Contact, Support | A, shared components, agreed intent contract | All enquiry purposes pass validation and navigation; no data loss |
| E | Portfolio index and case studies | B, project content/media contract | Real showcase and preview parity; loading/error/empty paths work |
| F | Studio page, informational pages and 404 | B, approved content | Public page set coherent; direct URLs and recovery checked |
| G | Owner authentication/dashboard/editor/security | B, E’s content contract | Synthetic-owner publishing and recovery/conflict flows verified |
| H | Cross-site optimisation, special-route regression, release preparation | C–G | Section 12 acceptance passes; release notes and rollback prepared |

- [ ] **PHASE-A:** Foundation and representative designs reviewed.
- [ ] **PHASE-B:** Shared experience and opening prototype reviewed.
- [ ] **PHASE-C:** Homepage accepted.
- [ ] **PHASE-D:** Services/Contact/Support accepted.
- [ ] **PHASE-E:** Portfolio and case studies accepted.
- [ ] **PHASE-F:** Remaining public/informational pages accepted.
- [ ] **PHASE-G:** Owner studio accepted.
- [ ] **PHASE-H:** Release candidate accepted.
- [ ] **RELEASE-01:** Align agreed frontend/backend release versions, document migration/configuration requirements and retain the previous deployable revision.
- [ ] **RELEASE-02:** Obtain specific deployment authority when the tested candidate is ready; then verify the deployed revision, real routes and approved provider integrations.

## 12. Acceptance checklist — apply to every page

Do not tick these globally because one desktop screenshot looks correct. For each page, record which checks apply and the evidence; mark unsupported/skipped cases explicitly.

- [ ] Offer/purpose and next action are clear; approved content has no placeholders or invented claims.
- [ ] Desktop and mobile layouts reviewed visually; tablet and intermediate breakpoints checked; no clipping or horizontal overflow, including at 200% zoom.
- [ ] Keyboard flow, visible focus, skip link, disclosures/dialogs and Escape/focus return work.
- [ ] Reduced motion and Reduce effects preserve content and function; no forced intro, scroll-jacking or hover-only action.
- [ ] All five appearances checked for readable text, controls, selections, errors and model/poster matching.
- [ ] Direct URL, internal navigation, Back/Forward and incoming enquiry context work.
- [ ] Loading, empty, failure, retry and completion states are truthful and usable.
- [ ] Form labels, conditional requirements, error associations, error summary and input retention checked where applicable.
- [ ] Upload count/type/size limits match the server; private/public media boundaries verified where applicable.
- [ ] Scene loading failure/context loss, slow network, offscreen/hidden tab and repeated stage activation tested where applicable.
- [ ] Meaningful images have useful alt text; decorative layers stay out of assistive output; contrast is measured.
- [ ] Route focus, heading hierarchy and screen-reader status announcements reviewed.
- [ ] Main bundle/requests/media/frame time measured; physical mobile test recorded separately.
- [ ] Server HTML metadata, client metadata, share image, canonical, robots and sitemap align for applicable routes.
- [ ] Relevant frontend build and backend contract/security tests pass; warnings and skipped tests recorded.
- [ ] No unrelated changes; documentation/ownership updated; rollback and migration compatibility clear.

### Cross-site release checks

- [ ] Existing public URLs and `.html` redirects preserved.
- [ ] Special birthday route independently regression-tested.
- [ ] Owner auth, MFA, recovery, security settings, drafts, revision restore and session expiry verified with synthetic data.
- [ ] Published changes appear publicly; unpublished/private content remains inaccessible.
- [ ] Enquiry and attachment delivery verified in the approved provider environment; local disabled-mail success is not live delivery evidence.
- [ ] No new dependencies added without explicit authority; any dependency changes receive an appropriate advisory check.
- [ ] Final browser console/network review contains no unexplained errors; residual warnings assessed.

## 13. Audit evidence and verification record

### Audit completed in this session

- [x] Mandatory local guidance and relevant design/motion/3D/responsive/accessibility/performance/theme/planning guidance read.
- [x] Branch/status/recent commits, package scripts, Gradle dependencies and active ownership inspected.
- [x] All active route components and owner screen implementations inspected; populated/authenticated runtime gaps identified.
- [x] Local Vite started using installed dependencies; Spring started with the local profile and frontend installation/build tasks skipped. Local mail is disabled. Existing H2 schema was validated and already up to date.
- [x] Desktop browser inspection of Home, About, Services, portfolio empty state, Support, Contact, unmatched-route 404 and post-birthday special page.
- [x] Loaded owner sign-in and recovery-request DOM inspected without entering credentials or sending a reset request.
- [x] Homepage live crystal activated; loading became ready and animation control enabled. Appearance mismatch noted; no frame-rate certification performed.
- [x] Mobile Home/Services/Contact visually inspected at 390 px width. Additional mobile DOM/overflow checks on About, portfolio empty state, Support and unmatched-route 404 showed no document-width overflow in those checks. Recovery’s mobile sample was during loading and is not completed recovery-layout evidence.
- [x] Mobile menu opened and Escape closed it, returning `aria-expanded` to false.
- [x] Service package selection updated its summary; moving to Contact reset the package, confirming the continuity finding.
- [x] Current app warnings sampled: `THREE.Clock` deprecation and shader precision warnings. These did not prevent the sampled viewer from becoming ready; investigate compatibility/render quality during 3D work.

### Commands and boundaries

Read-only inspection used `git status --short`, `git branch --show-current`, `git log -5 --oneline`, focused `rg`, `Get-Content` and asset-size listings. Local runtime commands:

```powershell
npm --prefix frontend run dev -- --host 127.0.0.1
$env:SKIP_FRONTEND_BUILD='1'
.\gradlew.bat bootRun --args='--spring.profiles.active=local'
npm --prefix frontend run build
```

Frontend baseline build: **passed, exit 0** (`tsc -b && vite build`, Vite 6.4.3; 636 modules). Vite reported 8.62 seconds for its build stage. The existing oversized-chunk warning remains; no TypeScript errors were printed in this run. There is no configured frontend lint or test script, so neither was claimed as passed.

| Build output | Raw | Gzip |
| --- | --- | --- |
| Main JavaScript | 65.44 kB | 18.24 kB |
| React vendor | 236.18 kB | 75.52 kB |
| Three vendor | 1,007.36 kB | 276.30 kB |
| Lazy model canvas | 46.31 kB | 15.12 kB |
| Lazy owner UI | 28.00 kB | 8.24 kB |
| Main CSS | 42.71 kB | 8.70 kB |
| Special birthday JavaScript | 31.16 kB | 7.86 kB |
| Special birthday CSS | 60.45 kB | 11.88 kB |

Startup warned that the optional LiveReload server could not start; the backend itself started successfully on 8080 and the Vite/API browsing worked. Two initial guessed DTO filenames were absent; the controller import identified the actual shared `ContactForm.java`, which was then inspected. No audit finding depends on those absent names. Final Git status showed only this new Markdown document; `git diff --check` passed for tracked changes, and the new document received a separate structure/whitespace check. Temporary audit servers were stopped after inspection.

Not tested in this session: full keyboard/screen-reader audit, measured contrast, all themes, reduced-motion emulation, tablet/wide/physical devices, complete model animation playback, forced WebGL loss, form submission/delivery, owner-authenticated pages, populated project pages, backend regression suite, PostgreSQL/Docker, public DNS/hosting or deployment. These remain checklist items, not claimed successes. No application source or release version was changed by this audit.

### Page completion log

| Date | Task IDs / page | What changed | Verification evidence | Open issues / next task |
| --- | --- | --- | --- | --- |
| 2026-10-01 | Audit and plan | Created this page-by-page 2.0 checklist | Source and bounded local-browser evidence above | Begin Phase A, then shared shell and authored opening prototype |

Append a row here at the end of each implementation phase; include viewport/device and actual command results. The first practical next step is DS-01 through DS-04: settle the new visual system using the homepage, service builder and case-study compositions, then produce the crystal-opening asset against that direction.
