# Crystal Powers 2.0 — design, workflow and usability audit

## Current implementation status — 12 October 2026

**Liquid Light selected; expanded team hub; implementation first.** James chose option2 and explicitly authorised dependency updates/migration. The [selected design implementation](LIQUID_LIGHT_IMPLEMENTATION.md) adds original light artwork, a reversible opening, adjustable development preview and Home integration. Tailwind/PostCSS migration is installed; the cleanup advisory scan passes, while final visual/CSS acceptance remains open. James then authorised a cleanup checkpoint: build,48 H2 tests, package/import/font/animation checks and npm advisory scan pass. Later team/client/project/attachment/contact-preference/invitation/billing/refund and V4-V60 changes remain source-only until final QA. See CLEANUP_2_0.md and current progress.

James also authorised a business hub with admin-provisioned accounts, role permissions, Discord-style text channels/groups/customisation, upload moderation, support replies/tracking and future company email. [Team hub scope and source status](TEAM_HUB_2_0.md) records actual implementation and remaining work. Team identity/MFA/member administration and persistent role-restricted text-channel foundations are in source; these are not runtime/security acceptance. [Company email setup](COMPANY_EMAIL_SETUP_2_0.md) records the configuration contract and missing actual mailbox/provider/operator facts.

The checklist retains133 original IDs,24 HUB/MAIL IDs and12 CLIENT/PAY IDs: **169 total /102 checked /67 open**. The13 reopened visual deliverables remain open against Liquid Light. New request, moderation, database-protection and backup work is source-only; Stripe/GBP/deposit/balance/monthly-support choices are approved; client and billing additions remain unverified. Current ownership and connected workflows are consolidated in [handover](CODEX_SESSION_HANDOVER.md); [release readiness](RELEASE_CANDIDATE_2_0.md) supersedes old candidate/hash/three-migration claims. Earlier checks remain dated evidence, not acceptance of these additions.

Finish all applicable implementation, then run final QA; fix failures and needed additions, repeat until no applicable test fails. Preserve meaningful tests and update obsolete visual expectations to the selected design. Skipped physical/hosted checks are not passes. Actual legal/retention/support/mailbox facts and authorised production publication still need to be resolved before release.


Historical detail is in [the dated audit record](archive/AUDIT_HISTORY_2026_10_12.md). Current cleanup evidence is in [progress](CRYSTAL_POWERS_2_0_PROGRESS.md).

## How to work through this file

Work in the order in section 11, then review each page separately. Use task IDs in commits and progress notes. Tick a task only after its behaviour and applicable acceptance checks pass. For anything that needs content or a business decision, record that dependency rather than inventing an answer.

All **133 original task/phase/release IDs** are preserved (123 prioritised tasks plus eight phases and two release tasks). **102 named deliverables** are currently ticked. The earlier 115-checkpoint count predates reopening 13 selected-design items; it is historical. Including the 23 generic page/release acceptance bullets, this document contains 192 checkboxes: 102 checked and 90 open. Deployment and whole-page release acceptance remain separate. Partial implementations remain unticked; this count is not a percentage-complete estimate.

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
| Active styles | `styles/index.css`, `base/studio-tokens.css`, studio/base/interior/admin styles and `pages/liquid-light.css` | Extend semantic tokens and active page styles; draft-only CSS lives separately under `styles/design/` |
| Signature visual and 3D | Home: `LiquidLightHero.tsx`; device/Studio stages: `ModelStage.tsx`; shared `ModelCanvas.tsx`, `ExperienceContext.tsx` | Reversible light opening, native controls and still fallback; preserve the separate device stage lifecycle |
| Original asset pipeline | `assets/blender/`, exported `frontend/public/models/` and `renders/` | Editable originals, GLB animation clips, device screen metadata and optimised stills |
| Portfolio | `features/portfolio/projectApi.ts`, `ProjectPresentation.tsx`, `FeaturedProjects.tsx` | Published-only public data; separate private media/preview |
| Enquiries | Connected Website/App/System/General/Support contract, shared visit-only brief/files, progressive builder and review/error/success locally verified | Privacy information, physical/screen-reader acceptance and release deployment |
| Owner publishing | `routes/Admin.tsx`, `features/admin/` | Draft/published distinction, revisions, conflicts, private uploads, reauthentication |
| Backend | Spring Boot 3.5.16 / Java 17, controller/service/repository/security packages | Maintain layering, CSRF/session/MFA protection, storage boundaries |
| Delivery | Vite build → Gradle static resources → Spring | SPA fallback, legacy `.html` redirects, server metadata, robots and dynamic sitemap |

Dependencies include React, React Router, Three.js, React Three Fiber and Drei. Tailwind 4/PostCSS migration is installed with James’s explicit approval; unused GSAP/@gsap/react/Motion were removed. Liquid Light uses a single owned native Web Animations timeline. The cleanup build passes; advisory and final visual compatibility acceptance remain open.

Unused legacy components and the superseded Observatory preview/CrystalOpening component have been removed after import tracing. Original device/model recipes and migration inputs remain.

### Complete route and screen inventory — original audit coverage

The evidence column below records 1 October coverage. The current status board above and section 13 record the 10 October recheck; earlier desktop/mobile evidence is not silently re-dated.

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
| Project editor / media / story / revisions / preview | `/admin` selected project | Local UI and actual isolated owner/private/public workflows verified; full gate open |
| Account security | Visibility/confirmation, locked requests/modes and guarded replacement-code exits | Full actual password/authenticator/code/session workflows and dedicated sections | Local UI rejection/completion/download fixtures pass; server rotation acceptance remains open |
| Session expiry / reauthentication | `/admin` modal state | Local UI and real server invalidation/retry verified |
| 404 | unmatched route and missing project | Source and desktop browser; mobile unmatched route check |
| Home alias | `/home` → `/` | Route source |
| Legacy links | `/home.html`, `/about.html`, `/services.html`, `/portfolio.html`, `/support.html`, `/contact.html` | Backend redirect source |
| Special birthday experience | `/birthday/mission-vi` | Source and desktop browser of current post-birthday state |
| Historical birthday experience | same special route before date cutover | Source only; no clock manipulation |

No standalone privacy, accessibility, FAQ, booking, client portal or service-detail routes currently appear in the active route table. Proposed additions below are explicitly new work.

### Important documentation drift

Laptop work added current ownership/pointers to `docs/agent.md`, `PROJECT_STRUCTURE.md`, `content.md`, `memory.md` and historical audits. `CRYSTAL_POWERS_2_0_PROGRESS.md` contains the later Aurora, email and CSP evidence. Handover/release notes also retain older chronological statements such as “providers pending”, “Gradle blocked” and “old release live”; these are superseded by their later dated evidence, not current blockers. Use the current status in this audit and the latest progress entries. Documentation reconciliation remains partial until final page content/architecture is agreed.

- [ ] **BASE-01 / P0 / S:** Reconcile architecture, content and session documentation against the completed 2.0 implementation. Mark the old audit as historical with a pointer to this file; do not erase its historical evidence.
- [x] **BASE-02 / P1 / M:** Trace imports before removing legacy components/CSS/assets. Remove only proven unused material after the replacement has passed QA.

## 2. Overall audit findings

These are pre-existing observations, not regressions introduced by this documentation task. Design judgements are recommendations; source findings and browser observations are labelled separately.

| ID | Priority | Evidence and finding | User impact | Recommended change |
| --- | --- | --- | --- | --- |
| F01 | P1 | Browser/source: public pages use a restrained dark editorial system, similar large headings, thin rules and repeated rectangular model posters | Consistent, but insufficient variety and spectacle for the requested futuristic 2.0 | New spatial composition and material language; distinct page identities within one system |
| F02 | Resolved core / P1 remaining | Current source/live: Home uses Aurora `CrystalOpen`/`CrystalClose`; one click opens, further click reverses/closes; ready open state observed today | The requested physical opening now exists; the larger work-reveal composition remains unfinished | Retain the new asset and improve the surrounding page; finish HOME-02/3D-04 rather than rebuilding the old turn-only crystal |
| F03 | Partial / P1 | New posters/materials and blob CSP fix replace the original mismatch; textured live Aurora verified today | Final palette/exposure coherence across five appearances and GPUs remains uncertain | Review current Aurora still/live pairs, especially open poses and alternate crystal palettes, on representative devices |
| F04 | Open / P1 | Fresh live mobile: six packages, eleven additions and three maintenance options still precede the form; 9,735 px document height at 390 px viewport | Large decision burden and long return trips to edit choices | Promote the reviewed guided-builder design into the real Services route with compact comparison and editable summary |
| F05 | P1 | Source: both enquiry endpoints use `ContactForm`, requiring package and maintenance; support links to `/contact` without context | A general question or existing-client issue must fit a new-build form | Introduce explicit enquiry intent and validate the correct fields for each intent |
| F06 | Open / P1 | Fresh live: Starter selection updated Services summary; clicking its app/bespoke Contact link produced an empty package select and “Nothing selected yet”; source still uses route-local state | Repeated work and interrupted enquiries | Shared in-memory brief state for non-sensitive selections, with explicit reset and supported back navigation |
| F07 | P1 | Mobile screenshot: Contact places empty package/addition/maintenance/contact-summary blocks ahead of its first field | Visitors scroll past information they have not supplied | Put the form first on mobile; reveal a useful summary after selections exist |
| F08 | Open / P0 | Fresh live public projects API returns `[]`; Home now displays an intentional no-work message | The live offer still lacks project proof despite improved fallback design | Prepare truthful, permission-cleared content; complete a populated case study and owner publication journey |
| F09 | P1 | Source: Contact additions is a single select; Services supports multiple selections with pipe-delimited values | Different capabilities for the same brief | Reuse a consistent multi-selection control while preserving the server format |
| F10 | P1 | Source: `ProjectPresentation` uses `image` on the active canvas, but `ModelStage` poster always uses a generic device render | Case-study device looks generic until the visitor activates 3D | Add a lightweight project-specific 2D screen composition to the inactive device view |
| F11 | Resolved core / P1 remaining | Source/live: Work/Services/Studio/Support/Contact labels aligned and a compact mobile project CTA exists | The original navigation inconsistency is corrected; full shell/appearance/footer design acceptance is still open | Retain consistent labels; finish DS-06/07 and keyboard/zoom/five-appearance acceptance |
| F12 | P1 | Source: published project metadata and `RouteMetadata` both update page metadata; client hook does not update `og:image` | Potential competing metadata effects and stale share image during SPA navigation | Give route metadata one clear owner; test direct HTML and client navigation independently |
| F13 | P2 | Source: SPA fallback returns HTTP 200 for unknown page paths; React shows 404 | Visual recovery works; HTTP semantics need separate review | Review a real server-side 404 response without breaking valid SPA routes |
| F14 | P1 | Source: owner editor has valuable safeguards, but dashboard uses plain rows/order numbers, and the public shell surrounds private work | Managing a growing showcase takes extra scanning; public nav distracts | Dedicated owner workspace, thumbnail/status overview and clearer save/publish hierarchy |
| F15 | Partial / P1 | Source: five semantic DOM palettes added; Aurora/Ember/Tide are separate sculpture palettes; scene/poster still groups site appearances into light/dark | The DOM system is richer, but sculpture palette and site theme are not a complete shared material system | Preserve IDs/preferences; finish scene/poster treatment and test every combination deliberately |
| F16 | P1 | Source: laptop still has 104 meshes / 106 nodes; legacy crystal stage uses transmission, Aurora has 52 meshes, and canvas requests high-performance power | Future effects could raise draw calls/GPU cost sharply | Model optimisation and measured quality tiers before adding heavier effects |
| F17 | Resolved locally | Development Home now describes the original Aurora still and links the actual live experience separately; builder aftercare copy matches the working choice | Superseded asset/integration descriptions removed | Current development review passes 320 checks; the reference remains development-only |

### What should be retained

The independent founder positioning, truthful copy, existing route structure, server validation, lazy WebGL activation, rendered fallbacks, keyboard rotation/Escape, device screens, private publication model, revision history and security protections are useful foundations. A new visual system should make these capabilities more visible and easier to use.

## 3. Crystal Powers 2.0 art direction

**Selected direction: Liquid Light.** [Design concepts and motion brief](DESIGN_DIRECTIONS_2_0.md) retain the displayed alternatives and editable choices. Use warm ivory, charcoal type and deliberate flowing light across the public site; preserve useful device/workflow behaviour and original assets.

Make the new experience visibly different through composition, not just new colours:

- Warm ivory, charcoal typography and coral light; coherent dark/warm/fresh alternatives through existing appearance preferences.
- Large, confident display type paired with readable body text; small technical labels used sparingly. Existing Manrope can remain for body copy while display typography is explored. Font selection/licensing must be settled before delivery.
- Flowing light, deliberate typography and generous reading areas, with restrained transitions and legible controls.
- Asymmetric project compositions, full-width visual chapters and alternating dense/quiet sections. Avoid repeating one hero-plus-card-grid layout everywhere.
- Genuine depth from light, materials and alignment; flat controls remain legible and operable over the scene.
- One memorable interaction per key page: crystal opening, work exploration, service configuration, studio process or brief completion. Motion has a hierarchy rather than equal intensity everywhere.

### Shared design-system tasks

- [ ] **DS-01 / P1 / M:** Create a 2.0 token set: colour, type scale, space, radius/cut geometry, elevation, border, focus and motion. Give tokens semantic names and map all five existing appearances. Semantic foundation and ownership are recorded in DESIGN_SYSTEM_2_0.md; five-appearance reference checks pass. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **DS-02 / P1 / M:** Design shared buttons, links, field states, selection tiles, disclosures, badges, tabs, loading panels, errors and success panels. Specify default/hover/focus/selected/disabled states. Native interactive development reference and shared control stylesheet verified; whole-site contrast remains a separate gate. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **DS-03 / P1 / M:** Build responsive composition rules for 320, 390, 768, 1024, 1440 and 1920 px. Use fluid spacing without letting long pages become empty stages. Composition rules documented and six-width reference/public journey checks pass; physical zoom remains separate. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **DS-04 / P1 / M:** Produce a representative homepage, Services builder and case-study visual draft before implementing every page. Confirm that the same system works for content-heavy screens. Four development compositions, including control states, pass 320 checks; original art, factual labelling and normal-flow captions reviewed. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [x] **DS-05 / P1 / S:** Add a presentation-level “Reduce effects” preference alongside system reduced motion. It must actually suppress decorative motion and expensive rendering; persist only a harmless preference.
- [ ] **DS-06 / P1 / M:** Rebuild the shell: consistent “Work / Services / Studio / Support / Contact” labels, active states, mobile menu, appearance chooser and visible project entry. Local shell regression: 169 checks, six widths and all five appearances; physical/screen-reader acceptance stays separate. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **DS-07 / P1 / S:** Design footer navigation and useful trust information; add links to new informational pages only when their content exists. Public footer includes existing journeys, factual studio identity and the ready accessibility guide; no unready privacy link. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.

**Current task status:** DS-01–04 have current local foundation/reference evidence: semantic tokens, actual native interaction states, six-width composition rules and representative drafts. See [design specification](reviews/DESIGN_SYSTEM_2_0.md). DS-05 is delivered with source and laptop browser evidence; DS-06/07 have current local shell/footer evidence. Whole-site contrast, physical browser zoom and assistive-technology acceptance remain open; these named deliverables do not accept a complete page or phase.

**Completion gate:** a coherent desktop/mobile design sample in every appearance; readable form states; keyboard navigation; motion-free equivalents. No page is dependent on 3D for essential information.

## 4. Page-by-page public audit and checklist

Unless a dated status note says otherwise, the tasks below are still open. The laptop diff did not replace About, Services, Portfolio, PortfolioProject, Support, Contact, NotFound or owner-route implementations. Their existing features remain functional foundations, not completed 2.0 redesigns. Each composition below is the intended next deliverable rather than a screenshot of an implemented page.

### 4.1 Homepage — `/`

**Job:** explain what James builds, show credible work, invite exploration and lead to a project conversation.

**Current:** Liquid Light hero source with reversible veil, featured-work fallback, founder introduction, three service rows, collaboration chapters and final CTA. The selected hero and shared palette are implemented; remaining composition and final acceptance stay open.

**New composition:** immediate studio promise and project CTA within Liquid Light; optional light opening; truthful selected projects; optional responsive device exploration; three service pathways; compact collaboration timeline; final brief entry.

- [ ] **HOME-01 / P1 / L:** Recompose the hero with the 2.0 crystal/frame asset and a clear offer visible before any click. Include “Open the experience”, “View work” and “Start a project” without presenting three equally dominant buttons. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **HOME-02 / P1 / L:** Integrate the opening storyboard in section 7. Preserve direct browsing, skip, replay, keyboard and static fallback. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **HOME-03 / P0 / M:** Populate featured work from cleared published projects; give an intentional compact no-work/error fallback rather than silently losing the proof section.
- [x] **HOME-04 / P1 / M:** Connect device selection to an actual featured project. Display suitable desktop/mobile screenshots; label concept/demo artwork honestly if used.
- [x] **HOME-05 / P1 / M:** Turn service rows into distinct Website / App / Bespoke system pathways that carry intent into Services or Contact.
- [x] **HOME-06 / P1 / M:** Rebuild the delivery sequence as selectable chapters with visible content and clear deliverables. Keep natural scrolling.
- [x] **HOME-07 / P1 / S:** Tighten copy around the customer’s outcome and the advantage of working directly with James.
- [ ] **HOME-08 / P1 / M:** Rework mobile hero height and control positioning; show the offer and meaningful CTA in the first screen, followed by optional art. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.

**Files:** `routes/Home.tsx`, `features/experience/`, `features/portfolio/FeaturedProjects.tsx`, active studio styles; original/exported assets. **Gate:** first-time and returning visitor paths work; slow/no-3D device still gets complete offer and proof; opening does not block navigation.

**Current task status:** HOME-01/02/04/05/06/07/08 have local implementation and browser evidence. The offer precedes optional art, opened Aurora reveals the selected published project, and featured work uses its owned desktop/mobile screen images. HOME-03 keeps its delivered compact loading/empty/error/retry state; actual approved production content remains to be published. Physical-device, final visual and whole-page acceptance remain open.

### 4.2 Studio / About — `/about`

**Job:** make James credible and explain the working relationship.

**Current:** strong independent-studio positioning, founder text, another crystal, principles and CTA. The founder image slot is occupied by brand art, and the page shares much of the homepage’s visual rhythm. It says how the studio works without showing many concrete examples.

**New composition:** personal introduction with a real founder portrait if James supplies one; studio tools/work artefacts; process chapters; practical collaboration expectations; relevant project link and conversation CTA. Portrait is a content dependency, not a generated likeness.

- [x] **ABOUT-01 / P1 / M:** Design a distinct founder-led composition with an optional approved portrait and smaller crystal signature.
- [x] **ABOUT-02 / P1 / M:** Show selected design/build artefacts and explain decisions in plain language.
- [x] **ABOUT-03 / P1 / M:** Make process chapters interactive: what James needs, what the client sees, feedback points and handover.
- [x] **ABOUT-04 / P1 / S:** Explain communication, ownership/handover and aftercare accurately; avoid invented availability, qualifications or clients.
- [x] **ABOUT-05 / P2 / M:** Add a restrained layered workspace illustration; use DOM/SVG for diagrams and reserve WebGL for useful object exploration. Original layered brief/interface/build view, normal-flow explanatory caption and six-width/five-appearance checks; no extra canvas or essential motion.

**Files:** `routes/About.tsx`, shared process components, active studio styles, approved media. **Gate:** visitor can understand who they will work with, how feedback happens and where to go next without exploring the visual.

### 4.3 Services and quote builder — `/services`

**Job:** help visitors choose a suitable service, understand cost boundaries and send a coherent brief.

**Current:** website packages dominate even though the hero also promises apps and systems. Six long single-choice tiles, eleven additions and three mandatory maintenance options lead to a form. Package labels such as “Experienced” and “Multi Grade” describe tiers unclearly. Selections update the summary, but there is no continuous summary during most of the journey. Total length is especially high on mobile.

**New composition:** service-type selector → useful example and scope → website package comparison or bespoke route → relevant optional additions → aftercare discussion → brief review and contact details. The builder is a focused workspace, with prices and assumptions visible and choices easy to edit.

- [x] **SERV-01 / P1 / L:** Add Website / App / Bespoke system routing within the page; retain a direct browse-all packages view.
- [x] **SERV-02 / P1 / M:** Redesign package comparison around suitability, included work and limits. Preserve existing prices and wire values until a separate commercial decision changes them.
- [x] **SERV-03 / P1 / M:** Build a progressive builder with step labels, Back/Continue, edit-from-summary and state retained within the visit. Each step must be linkable or recoverable through defined navigation.
- [x] **SERV-04 / P1 / M:** Group additions by purpose; surface applicable ones first without silently discarding prior choices. Use consistent multi-select semantics and an explicit selected count.
- [x] **SERV-05 / P1 / M:** Show one-time and recurring charges separately. Custom items stay “To be scoped”; never treat them as £0 or present a binding final quote.
- [x] **SERV-06 / P1 / M:** Provide a compact desktop summary and mobile summary disclosure that never covers fields or submit controls.
- [x] **SERV-07 / P1 / L:** Resolve maintenance-before-enquiry friction with the backend contract work in section 8. A “Discuss aftercare” choice needs intentional server validation and email presentation.
- [x] **SERV-08 / P1 / M:** Upgrade attachments with filenames, individual remove actions and local count/size guidance while keeping server checks authoritative. Match accepted types and limits exactly.
- [x] **SERV-09 / P1 / M:** Add a review step, explicit sending state, useful completion panel and field-linked error summary. Keep the brief intact on failure.
- [x] **SERV-10 / P2 / M:** Use a small responsive interface preview to explain service differences. No heavy 3D inside form controls. Original Website/App/System studies follow the real service selection, preserve brief state and limit example/package claims; native selection and responsive/contrast checks pass.

**Files:** `routes/Services.tsx`, `features/services/services.ts`, shared brief/contact feature, active interior styles; backend DTO/controller/email/tests for changed intent or requirements. **Gate:** website and bespoke visitors complete a brief on mobile; choices survive Back/edit; keyboard selection works; amount labels remain accurate; validation/429/503/upload failures preserve inputs.

### 4.4 Portfolio / Work — `/portfolio`

**Job:** prove design and delivery capability and help a visitor identify relevant work.

**Current:** large editorial heading, category filters and vertical entries sourced from the publishing API. The live public API is also empty as of this re-audit. Do not fill it with invented projects or publish private drafts just to complete the audit. A credible showcase is now a confirmed production content dependency.

**New composition:** featured project stage, editorial work grid with real screenshots, useful category filters, compact project outcomes and a relevant enquiry entry. Visually distinct projects should have space to show their identities.

- [x] **WORK-01 / P0 / M:** Select projects that can be shared and prepare real cover/screenshots/story content. Obtain any client/content permission needed before publication.
- [x] **WORK-02 / P1 / L:** Build a showcase with varied but predictable project layouts; imagery leads and category/summary stay readable.
- [x] **WORK-03 / P1 / M:** Preserve filter state when returning from a project; add result counts and a useful zero-results reset.
- [x] **WORK-04 / P1 / M:** Add stable loading placeholders and intentional API-error/empty states, with retry and contact routes.
- [x] **WORK-05 / P1 / M:** Give hover and keyboard focus an equivalent project preview. Touch opens the project normally; no hover-only descriptions.
- [x] **WORK-06 / P2 / M:** Evaluate search only when the real portfolio volume justifies it; avoid empty controls over a small collection.

**Files:** `routes/Portfolio.tsx`, portfolio feature components/API hook, active studio styles. **Gate:** real published entries, all categories, empty results, API failure and return navigation verified; no private media leaks; responsive imagery and layout stability checked.

### 4.5 Project case study — `/portfolio/:slug`

**Job:** explain a real challenge, show how it was solved, demonstrate the finished work and lead to a relevant brief.

**Current source:** project headline/summary, live link, cover, 3D display, idea/approach/outcome text, gallery and CTA. The same cover is used as the device texture even if its aspect ratio does not fit. The inactive device poster is generic. There is no next-project journey or section navigation. A separate development draft exists, but the actual populated route remains unverified because the live public list is empty.

**New composition:** dramatic real project cover with succinct facts; challenge and scope; selected design decisions; interactive responsive device showcase; captioned gallery; evidenced outcome; next project and “Build something like this”.

- [x] **CASE-01 / P1 / L:** Rebuild case-study composition using existing overview/approach/outcome fields first; add structured fields only where they provide real editorial value.
- [x] **CASE-02 / P1 / M:** Provide an accurate project-specific inactive device preview, then optional live 3D with matched camera and materials.
- [x] **CASE-03 / P1 / L:** Support separate desktop/mobile screen images, so switching devices shows the appropriate design rather than squeezing a single cover into every screen.
- [x] **CASE-04 / P1 / M:** Add captioned gallery exploration with optional accessible lightbox: named controls, keyboard previous/next, Escape and focus return.
- [x] **CASE-05 / P1 / M:** Add section jump navigation, next/previous work and preserved portfolio filter context.
- [x] **CASE-06 / P1 / M:** Carry project interest into Contact without copying private data or claiming a fixed quote.
- [x] **CASE-07 / P1 / M:** Resolve metadata ownership and project share imagery; verify a direct HTML request and an internal link to the same case study.
- [x] **CASE-08 / P0 / M:** Verify published/missing/unpublished project paths and private preview boundaries using authorised test content.

**Files:** `routes/PortfolioProject.tsx`, `ProjectPresentation.tsx`, `ModelStage.tsx`, portfolio contract/editor/backend/schema if new screen fields are introduced. **Gate:** a real or clearly labelled local test project exercises the entire page; gallery and device assets are accurate; draft never appears publicly; outcome claims have evidence.

### 4.6 Support — `/support`

**Job:** reassure existing clients, explain aftercare and collect actionable support information.

**Current:** service-like heading, three support descriptions, generic monitor and contact links. The maintenance link leads to the top of Services. Support contact does not carry support intent and reaches the build form.

**New composition:** “What do you need?” issue/update/improvement selection; concise aftercare options; useful troubleshooting guidance; support-specific brief and expectations. A diagram or interface example is more useful here than another decorative device stage.

- [x] **SUP-01 / P1 / M:** Recompose as a service desk with issue, content update and improvement paths.
- [x] **SUP-02 / P1 / L:** Route a support intent into the enquiry workflow; ask for website address, what happened, expected result and reproduction steps. Attachments require explicit backend support.
- [x] **SUP-03 / P1 / S:** Deep-link maintenance information to its actual section or dedicated comparison, rather than the Services hero.
- [x] **SUP-04 / P1 / M:** Add concise scope/exclusions and useful FAQs. Use agreed response expectations; no invented SLA, monitoring claim or guaranteed uptime.
- [x] **SUP-05 / P2 / M:** Replace the generic monitor with an explanatory layered DOM/SVG diagram or a small supported interface example. Original connected Describe/Review/Agree flow, horizontal desktop/vertical mobile, HTML list/caption and existing support CTA; no invented live ticket or guaranteed timing.

**Files:** `routes/Support.tsx`, shared enquiry feature, service data and related backend contracts where required. **Gate:** existing client can submit an issue without pretending to commission a new website; response/cost expectations are clear.

### 4.7 Contact / Start a project — `/contact`

**Job:** make it easy to contact James at different stages of a project.

**Current:** model-led hero followed by two-column form/summary. On mobile, empty summaries precede the form. Message and extra-information fields overlap in purpose. Both package and maintenance must be chosen. Optional phone can remain blank even when WhatsApp is selected; clarify and validate the selected communication route intentionally.

**New composition:** short introduction → enquiry purpose → minimal relevant questions → optional brief detail → review/send → clear next step. Keep project configuration available to visitors who already know their scope, rather than asking everyone to repeat it.

- [x] **CONTACT-01 / P1 / L:** Create Project / General question / Existing-client support modes; initial view depends on incoming intent but can be changed visibly.
- [x] **CONTACT-02 / P1 / M:** Put the first meaningful field near the introduction; move summary below fields on mobile or show it only when useful.
- [x] **CONTACT-03 / P1 / M:** Share non-sensitive selections with Services and retain inputs during internal edits. Do not persist names, emails, phone numbers or messages to browser storage by default.
- [x] **CONTACT-04 / P1 / M:** Unify addition selection with Services; keep clear optional “Not sure yet” scope choices once the server supports them.
- [x] **CONTACT-05 / P1 / M:** Clarify labels, required/optional status and contact preference; reveal phone guidance for WhatsApp and keep client/server rules aligned.
- [x] **CONTACT-06 / P1 / M:** Add field-linked error summary and intentional completion screen. Keep sending/failure/retry states understandable; never claim delivery solely because the button was pressed.
- [x] **CONTACT-07 / P1 / S:** Replace the plain internal Services anchor with router navigation so internal journeys keep their intended state.
- [ ] **CONTACT-08 / P1 / M:** Add an approved privacy explanation and links to the relevant informational page. Explain next steps without invented turnaround promises.
- [x] **CONTACT-09 / P2 / S:** Use a subtle framing/light response to step completion rather than a large interactive phone above the form.

**Files:** `routes/Contact.tsx`, `features/contact/`, shared brief state, active interior styles, backend contracts/tests for new modes. **Gate:** short enquiry and full brief both work; mobile form order is useful; appropriate required fields; no data loss on failure; mail delivery tested only through the approved environment.

### 4.8 Missing page / missing project — 404

**Current:** readable recovery message with home/work links and shared shell. It is useful but visually repeats the page-heading template. The server’s generic SPA fallback still returns 200.

**Current task status:** ERR-02 already has the core source distinction: API 404/no project uses NotFound, other request failures retain a retry panel. Preserve this while redesigning, then verify loaded missing/temporary-error fixtures. ERR-01/03 and final state acceptance remain open.

- [x] **ERR-01 / P1 / S:** Create a branded “lost signal” illustration with one clear recovery action and links to Work/Contact. Static/SVG art is sufficient.
- [x] **ERR-02 / P1 / S:** Distinguish missing project from temporary project API failure; retain retry on service failures.
- [x] **ERR-03 / P2 / M:** Review HTTP 404 semantics and noindex behaviour with server metadata and SPA routes.

**Files:** `routes/NotFound.tsx`, `PortfolioProject.tsx`, active styles; `SpaController`/metadata/tests if HTTP behaviour changes. **Gate:** unmatched and missing project navigation returns to a valid page; error handling does not mistake network failure for nonexistent content.

### 4.9 Special birthday route — `/birthday/mission-vi`

This is a separate personal experience outside `Layout`, not an ordinary Crystal Powers service page. At audit time the route displayed `PostBirthdayMission`: its own chapter navigation, imagery, night-drive control and countdown. The older birthday reveal remains selected only before the configured cutover date. This plan includes the route so it cannot be accidentally broken or omitted.

- [x] **SPECIAL-01 / P1 / S:** Preserve the existing route, date branch, story and separate styling during the public 2.0 build; check for global CSS/font/motion leakage. Both branches and the date cutover are locally verified; public appearance/metadata restore on return.
- [x] **SPECIAL-02 / P2 / M:** Review its mobile, keyboard, reduced-motion and countdown-expiry states in a separate pass before redesigning this personal experience. 36 browser checks cover both branches, six widths, keyboard, reduced motion and synthetic expiry. Countdown announcements, duplicate robots metadata and action focus are fixed.
- [x] **SPECIAL-03 / P2 / S:** Verify time-sensitive public statements against their official source if content is updated. Rockstar's scheduled 19 November 2026 date is verified; expiry now asks visitors to check the official launch status. This does not certify availability, an exact unlock time or a purchase.

**Files:** `BirthdayMission.tsx`, `PostBirthdayMission.tsx`, birthday styles. **Gate:** special route still works independently and is excluded from the public sitemap/indexing. A separate requested redesign would preserve the personal message.

## 5. Owner studio — every screen and workflow

The initial re-audit was inspection-only. Continuation now uses an isolated synthetic local owner for MFA, owned media, saved preview, featured selection and publication acceptance. No live owner credentials or live publication were changed. The dedicated owner redesign and full account/recovery/revision/session acceptance remain open.

### 5.1 Sign-in — `/admin`

Current login is inside the marketing shell. Security flow includes password, MFA, optional first-owner setup and recovery. A futuristic treatment should give this a quiet, dedicated workspace identity.

- [x] **AUTH-01 / P1 / M:** Build a focused owner layout with a discreet public-site link, clear sign-in fields and restrained brand art.
- [x] **AUTH-02 / P1 / S:** Add accessible password visibility and clear busy/error states without logging credential values.
- [x] **AUTH-03 / P1 / M:** Keep email/password/MFA validation and session protections unchanged through the visual refresh; verify server-rejection states.

**Owner:** `Admin.tsx`, `OwnerSignIn.tsx`, `admin.css`, app layout integration. **Gate:** sign-in remains usable by keyboard/password manager and provides a clear next step on failure.

### 5.2 First-owner setup, MFA enrolment, verification and recovery codes

Current enrolment displays a manual authenticator secret and codes once, with a stored-codes checkbox and download action. Keep that deliberate security journey.

- [x] **AUTH-04 / P1 / M:** Design explicit Setup → Authenticator → Recovery codes → Studio steps with progress and accurate instructions.
- [x] **AUTH-05 / P2 / M:** Evaluate a locally generated authenticator QR and copy control, with the manual key preserved. Never send secrets to an external QR service.
- [x] **AUTH-06 / P1 / S:** Improve six-digit and recovery-code entry without forcing recovery codes into a numeric-only field.
- [x] **AUTH-07 / P1 / M:** Verify one-time code display/download, completion acknowledgement and return-to-sign-in; keep secrets out of screenshots and QA records.

**Owner:** `OwnerSignIn.tsx`, existing security APIs and tests if logic changes. **Gate:** no bypass of MFA and no secret exposure from the new UI.

### 5.3 Password recovery — `/admin/reset`

Current recovery supports request/reset modes; reset token is held in memory and removed from the address bar. Preserve this behaviour.

- [x] **REC-01 / P1 / M:** Design request-sent, reset, expired/invalid link, verification failure and completion states distinctly.
- [x] **REC-02 / P1 / S:** Preserve generic account-existence messaging, token handling, authenticator/recovery requirement and safe return to sign-in.
- [x] **REC-03 / P1 / M:** Verify the full recovery flow with a synthetic local owner and disabled/test mail; actual credential entry remains a user action where required.

**Owner:** `OwnerRecovery.tsx`, security contracts. **Gate:** understandable recovery without weakening protection or capturing tokens in analytics.

### 5.4 Dashboard, new project and archived projects

Current dashboard exposes title/status/address, featured checkbox, numeric order and editor entry; creation needs title and slug. There is no thumbnail-driven overview or search/status grouping.

- [x] **ADMIN-01 / P1 / L:** Build a dedicated workspace with thumbnail rows/cards, saved/published revision status, last update, featured status and sensible sorting.
- [x] **ADMIN-02 / P1 / M:** Add draft/published/archived filters and empty/loading/error states. Add search only when collection size supports it.
- [x] **ADMIN-03 / P1 / M:** Improve new-draft creation with a suggested slug and an explicit editable preview; keep existing project addresses stable.
- [x] **ADMIN-04 / P1 / M:** Improve featured ordering with accessible move-up/down controls. Drag ordering is optional and needs the same keyboard equivalent and conflict handling.
- [x] **ADMIN-05 / P1 / M:** Make archive/restore status visible and explain impact on public visibility before the action.

**Owner:** `Admin.tsx`, portfolio API/types, `admin.css`. **Gate:** James can identify, create, open and order projects efficiently without confusing draft/published/archive status.

### 5.5 Project editor — Details, Images, Story, History, Preview

Current editor already separates draft save from publishing, has revision restore, private uploads/preview, conflicts and unsaved-change warnings. Keep this strength; improve discoverability and media editing.

- [x] **EDIT-01 / P1 / L:** Design a readable editor with persistent project identity, save status, section navigation and a clear Save draft / Preview / Publish hierarchy.
- [x] **EDIT-02 / P1 / M:** Make publishing readiness link directly to the missing field; distinguish missing content from unsaved work.
- [x] **EDIT-03 / P1 / L:** Add media thumbnails, descriptive labels, cover choice, gallery ordering and separate responsive device screenshots if CASE-03 is adopted.
- [x] **EDIT-04 / P1 / M:** Give Story fields purpose and examples that encourage truthful case studies; avoid invented metrics.
- [x] **EDIT-05 / P1 / M:** Improve History with timestamps, draft/published markers and clear restore-as-new-draft explanation. A diff view is P2.
- [x] **EDIT-06 / P1 / L:** Offer desktop/tablet/mobile private preview using the same public presentation components; preserve private-media authentication. Actual 1440/768/390 px frame viewports use the shared public presentation, private owned image URLs and optional live 3D; unsaved edits stay in memory and no sharable preview route or draft source payload is created. Local viewport/palette/focus/gallery/error checks and actual server ownership/publication checks pass.
- [x] **EDIT-07 / P1 / M:** Add an explicit publish review explaining exactly which saved revision goes live. Verify unpublish/archive/restore from this screen.
- [x] **EDIT-08 / P1 / M:** Keep stale-version conflict handling and inputs intact; make reload/discard consequences clear.
- [x] **EDIT-09 / P2 / L:** Evaluate autosave only after defining concurrency, debounce, network failure and revision-history behaviour. Explicit save remains the initial 2.0 default. [Owner workspace decisions](reviews/OWNER_WORKSPACE_DECISIONS.md) define all four concerns, expiry/privacy/upload/publication/exit requirements and the reasons for retaining explicit saving. No autosave feature is enabled or falsely claimed; typing, preview changes and reauthentication are verified not to create revisions automatically.

**Owner:** `ProjectEditor.tsx`, `ProjectPresentation.tsx`, portfolio contracts, backend DTO/service/repository/migrations for new fields. **Gate:** upload → draft → preview → publish → public view → revision restore works with test content; no draft leaks and no lost edits after failure/conflict.

### 5.6 Account security

Current settings include password changes, authenticator replacement and recovery-code replacement, with password/code verification.

- [x] **SEC-01 / P1 / M:** Design separate labelled sections with clear consequences and completion states; keep secrets and codes deliberately contained.
- [x] **SEC-02 / P1 / M:** Preserve verification requirements and session invalidation behaviour. Verify replacement-code acknowledgement and the route back to the dashboard.

**Owner:** `OwnerSettings.tsx`, existing security APIs. **Gate:** security workflows stay deliberate and comprehensible; visual refresh does not broaden access.

### 5.7 Session expiry and reauthentication

The redesigned modal keeps the editor mounted, reads the current password/MFA state and allows returning to the draft or deliberately leaving. Successful sign-in clears the stale expiry error and asks the owner to review and retry. No action is replayed automatically.

- [x] **SESSION-01 / P1 / M:** Explain that edits remain in the current tab; preserve content through successful reauthentication and failed attempts. Local UI and real password/MFA invalidation checks preserve the unsaved summary and saved/public revision distinction.
- [x] **SESSION-02 / P1 / M:** Define an explicit discard-and-leave action with confirmation, focus management and a warning before closing the tab. Explicit return and Escape release the modal; pending sign-in locks exits; cancelled/confirmed discard and native beforeunload are checked.
- [x] **SESSION-03 / P1 / M:** Test expiry during edit, save, upload and publication; actions must not be shown as completed without server confirmation. Actual isolated server logout invalidates the active browser session before save/upload/reviewed publication; rejected actions keep content/library/public revision and are never replayed after reauthentication. An explicit save retry creates one revision; publishing requires fresh permission/review.

Evidence: `verify-session-browser.cjs` uses labelled API fixtures for unavailable checks, partial MFA, pending forms, failures and safe exits; `session-server-journey.cjs`, called by packaged portfolio QA, uses actual server sessions and private/public APIs. Reports are ignored under `.codex-runtime/qa/session-pc/` and `portfolio-pc/`. Credentials remain only in test memory. The configured 30-minute idle timeout is preserved; natural idle waiting, hosted sessions and physical/screen-reader acceptance are not claimed.

**Owner:** `Admin.tsx`, `ProjectEditor.tsx`, API helper and security tests. **Gate:** expired sessions do not silently lose content, publish twice or leave an unusable focus state.

## 6. New informational pages and optional features

Build only pages with a real user job. The list below is a proposal, not a claim that these routes or services exist.

| Proposal | Value | Recommendation / dependency |
| --- | --- | --- |
| Privacy information — proposed `/privacy` | Explain enquiry handling, media, providers, retention and contact | P1 content dependency: describe actual operations; review with James before publication |
| Accessibility information — implemented `/accessibility` | Supported keyboard, appearance/motion and optional 3D alternatives; barrier feedback | Local: guide/footer/metadata/sitemap in 169 shell checks; no conformance claim; physical/assistive acceptance open |
| Delivery/process guide | Explain feedback, handover and support | P1 as an About section first; separate route only if content warrants it |
| Service-detail pages | Give websites/apps/systems specific examples and scope | P2 after Services journeys work; add routing, metadata and sitemap together |
| Public lab / experiments | Showcase clearly labelled prototypes and interaction craft | P2: only with real experiments, accessible fallbacks and honest demo labels |
| Client portal / progress tracking | Could improve an ongoing client relationship | Later release: requires its own roles, data model and workflows; owner authentication is not a client portal |
| Booking calendar | Could reduce scheduling effort | P2: requires James’s real availability, chosen integration and data handling |
| AI assistant / chatbot | Could answer repeated enquiries | Deferred until a specific useful job, reliable content, privacy and cost are defined |

- [ ] **NEW-01 / P1 / M:** Prepare privacy/accessibility content from real operations; create routes only when ready; add footer, metadata and sitemap entries.
- [x] **NEW-02 / P2 / S:** Revisit optional additions after core public and owner journeys pass. Record value and operating cost before committing to them. OPTIONAL_FEATURE_DECISIONS_2_0.md evaluates process/service/lab routes, portal, calendar, assistant, QR and autosave after named local journeys. Existing useful inline experiences remain; no additional provider/dependency or subscription committed. Whole-page/physical/hosted acceptance remains separate.

## 7. Animation and 3D production plan

### 7.1 Signature opening storyboard

Liquid Light replaces the Aurora opening on Home. The original Blender recipes/models remain for devices and provenance. The unused old CrystalOpening React component has been removed.

1. Rest: readable offer, native actions and original light artwork.
2. Explore: the light veil moves aside over 750ms by default; actual selected work stays linked.
3. Reverse/replay: one owned Web Animations timeline starts from the interrupted frame.
4. Still/failure: reduced effects, hidden/offscreen state and unavailable animation/image handling preserve meaningful content and navigation.
5. Adjust: development controls expose colour, intensity, scale and duration; stored appearance preferences remain.

Source implementation is not final visual/keyboard/device acceptance. See [implementation](LIQUID_LIGHT_IMPLEMENTATION.md). Original model contracts still protect retained device stages; the public hero does not require a new Blender model.

- [ ] **3D-01 / P1 / L:** Create the selected original signature visual and deliberate reversible opening. Use the appropriate DOM, light/shader or authored-model technique for James’s chosen concept; do not force the rejected Aurora sculpture as the main visual. Preserve original Blender assets and existing device animations. Design selection, implementation and final acceptance remain open.
- [x] **3D-02 / P1 / M:** Update animation contracts and action selection to explicit clip names; retain laptop opening and legacy single-clip compatibility where needed. Fresh PC contract check passed; live homepage reached ready/open with one canvas. Physical-device/failure acceptance remains separate.
- [ ] **3D-03 / P1 / L:** Match poster/live framing, exposure, lighting and material treatment; avoid the observed dark live-view mismatch. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **3D-04 / P1 / M:** Coordinate opening state and DOM masks using existing animation tools with one owner per property. Clean up all timelines and route transitions. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.
- [ ] **3D-05 / P1 / M:** Implement skip/replay/close/loading/error states, focus return and a short warm-up timeout that falls back cleanly. **Reopened 12 October:** preceding evidence covers the earlier appearance; implement and accept this item against James’s newly selected design direction.


Previous Aurora acceptance is historical. Reopened signature items remain open until the selected design passes final QA.

### 7.2 Asset inventory and delivery

| Asset | Current verified file size / contract | 2.0 production need |
| --- | --- | --- |
| Aurora / Observatory hero | 423,864 bytes; 52 meshes / 75 nodes; `CrystalOpen` and `CrystalClose`, 2.417 s each | Final material/poster acceptance and physical-device performance; no new external model needed to recreate the existing opening |
| Crystal | 227,840 bytes; manifest: 5 meshes, `CrystalTurn` | New segmented geometry, opening/closing clips, matched light/dark posters |
| Laptop | 1,063,912 bytes / 7 meshes; unchanged `LaptopOpen` / screen / authored surfaces | Lossless consolidation locally verified; physical rendering tiers and final screen/material framing remain separate |
| Monitor | 62,828 bytes; no authored animation | Improve bezel/stand/material polish; project-specific display |
| Phone | 91,180 bytes; no authored animation | Improve screen/bezels, accurate mobile textures and crop |
| Crystal film | Dark 1,068,145 bytes; light 791,323 bytes | Optional new opening film only if it improves fallback; do not fetch it by default |
| Page diagrams | No new asset created in this audit | DOM/SVG service/process illustrations before additional WebGL scenes |

Aurora uses an original deterministic packed mineral texture. Four closed/open light/dark poses have 800/1600 px WebP outputs (small variants approximately 15–24 kB; larger approximately 37–57 kB) plus PNG fallback. Other device assets remain the earlier originals. Import a new model only when it improves a defined page job, with licence/source/scale/pivots/materials/size and fallback recorded; no purchase or installation is implied by this plan.

Paths: editable scenes/recipes in `assets/blender/`; GLBs in `frontend/public/models/`; web stills/films in `frontend/public/renders/`. Keep original scenes and exports separately reviewable.

- [x] **ASSET-01 / P1 / M:** Record ownership/licence/provenance for any imported model or texture. Prefer original studio assets; buying/licensing assets needs a separate decision. Current original recipes/scenes/model/texture/still/film/default-screen provenance and hashes are documented in ASSET_REVIEW_2_0.md; no imported model/texture found. Future imports and client permissions remain explicit boundaries.
- [x] **ASSET-02 / P1 / M:** Validate GLB transforms, normals, scale, pivots, named clips and self-contained buffers; preserve `Screen` / `role=project-screen` / physical aspect metadata. Read-only decoded geometry verification passes all five GLBs, actual screen rectangles/UVs, finite/unit values, index/view bounds, transforms and animation targets/times/quaternions. Optical/physical acceptance remains separate.
- [x] **ASSET-03 / P1 / M:** Consolidate laptop geometry/materials; create desktop/mobile quality variants where measurements justify them. Delivered 104→7 mesh consolidation, 19.5% smaller, all 30,902 surfaces/normals/materials/hinge keys preserved and actual rotation submissions 143→46. Same improved export works at 390/1440; no speculative geometry LOD added without physical benchmark justification.
- [x] **ASSET-04 / P1 / M:** Export mobile/desktop WebP posters, reserve dimensions and generate matching fallback views. Avoid requiring large PNGs for routine page paint.
- [x] **ASSET-05 / P1 / M:** Extend asset manifest/validation for opening clip names, screen aspect ratios, model sizes and fallback availability. Verified 9 October against all five exported models and all closed/open responsive posters; live-opening acceptance remains under 3D-02/03/04/05.

**Current task status:** ASSET-01/02/03 have current collection evidence: original provenance inventory, decoded geometry/animation/screen contracts and lossless laptop consolidation. See [asset review](reviews/ASSET_REVIEW_2_0.md). ASSET-04/3D-03 now have local matching-view/material/exposure evidence: twelve transparent live-renderer captures and twenty-four additional responsive WebPs, reserved dimensions, image-outage fallback and native five-theme pose checks. See [matching stills review](reviews/POSTER_LIVE_REVIEW_2_0.md). Physical quality tiers/rendering/thermal/hosted acceptance are separate. Current original provenance does not authorise future imported assets or client uploads.

### 7.3 Motion specification

Proposed timings below are design starting points, not measured production claims. Use CSS for small state transitions, an existing timeline library for authored sequences, and R3F for scene motion. Avoid overlapping ownership of the same transform.

| Interaction | Trigger / duration / easing | Mobile / reduced motion / failure | Cleanup |
| --- | --- | --- | --- |
| Crystal opening | Explicit opening toggle; current authored clips about 2.417 s, staggered minimum-jerk movement with reversible runtime progression | Fixed camera/touch drag / open still / rendered fallback | Stop action; dispose offscreen/hidden/route resources; latest failure regression still open |
| Route transition | Internal navigation; 180–300 ms; ease-out | Short opacity / immediate content / navigation still works | Cancel obsolete timeline; retain route-focus and history behaviour |
| Section introduction | First viewport entry; 300–500 ms; small translate and opacity | Smaller/no translate / immediate visibility / content visible if observer fails | Disconnect once revealed; clean on unmount |
| Work preview | Hover and focus; 150–250 ms; ease-out | Tap goes to project / no transform / static cover | Remove listeners and reset transform |
| Builder step | Continue/Back; 180–240 ms; ease-out | Same content order / instant / plain step change | Cancel outgoing animation; focus step heading or first error |
| Device change | Explicit selection; 250–450 ms; ease-in-out | Matched still until ready / instant switch / keep current poster | Dispose stage resources and restore focus appropriately |
| Menu/appearance | User toggle; 160–220 ms; ease-out | Accessible disclosure / instant / normal links remain | Escape and route close; focus return |
| Completion | Confirmed server success; 250–400 ms; short settling effect | Static confirmation / same message / textual status | No permanent loops; cancel on navigation |

- [x] **MOTION-01 / P1 / M:** Implement a shared motion policy for system preference, Reduce effects, quality tier and page visibility.
- [x] **MOTION-02 / P1 / M:** Add route/section transitions without delayed reading, scroll-jacking or hidden essential content.
- [ ] **MOTION-03 / P1 / M:** Verify cancellation during rapid navigation, repeated activation, tab hiding and stage switches; no duplicate listeners or accumulated canvases.

### 7.4 Proposed performance budgets

Targets for 2.0 verification, not current certification: retain lazy scene chunks and one active canvas; DPR clamped to measured device tiers; demand rendering while idle; no continuous offscreen effect. Home now warms a visible live crystal before explicit opening, so measure its network/LCP/GPU cost against a poster-first alternative before accepting the performance policy. Other optional stages remain activation-driven. Aim for LCP ≤2.5 s, CLS ≤0.1 and INP ≤200 ms under recorded representative conditions. Field performance requires later real-user evidence.

Aim for smooth desktop rendering near 60 fps and a stable mobile experience around 30 fps on agreed representative physical devices. If these cannot be sustained, degrade effects or use the still. Keep the current asset validator’s 5 MiB ceiling as a hard guard, but use a much tighter working target near 1 MiB for the new hero model and justify exceptions by measurement. Compression decoders may add dependencies and must be planned explicitly.

- [ ] **PERF-01 / P1 / M:** Record initial requests, compressed bundles, image/model sizes and rendering cost before/after each major visual feature.
- [x] **PERF-02 / P1 / M:** Define low/standard/high rendering tiers controlling DPR, transmission resolution/samples, lighting and geometry; benchmark before adding bloom/refraction stacks. **PC evidence:** shared native quality preferences, actual 1/1.5/2 DPR caps, 128/256/512 environment faces, environment geometry/lightformers and native transmission activation/.5/1 resolution; unchanged authored geometry and no custom sample stack. Final packaged98 checks measure real buffers/GL target allocations and hinge work; source86 passes before additional panel/storage cases. Build, 43 H2 tests, 28 initial-route profiles and shell/Home/birthday/HTTP refresh pass. [Implementation and limits](reviews/RENDERING_QUALITY_2_0.md). This is local rendering policy/benchmark evidence, not physical-mobile or complete motion/visual acceptance.
- [ ] **PERF-03 / P1 / M:** Run physical-device checks separately from responsive browser checks; record device, viewport, quality, frame time and thermal behaviour.

**Current task status:** MOTION-01/02 have current shared-policy, readable transition and cancellation evidence in [motion review](reviews/MOTION_REVIEW_2_0.md). MOTION-03 is partial: repeated route/device ownership, bounded listeners, missing-observer fallback and deterministic hidden-state/no-draw/resume checks pass; actual native background-tab acceptance remains unproven in this automated Edge environment. PERF-01 retains route/assets/rendering measurements but not complete representative interaction/field proof. PERF-02 is accepted locally with measured quality bounds; physical PERF-03 remains open. Earlier laptop Iris Xe observations do not certify the PC GPU or a physical phone.

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

- [x] **FLOW-01 / P1 / M:** Define the enquiry-intent contract and required field matrix before changing the form UI.
- [x] **FLOW-02 / P1 / M:** Trace Website/App/System/Support CTAs end to end and record incoming intent, fields, payload, response and next step.
- [x] **FLOW-03 / P1 / M:** Define brief reset and unsaved-input behaviour for internal navigation, browser Back and refresh; keep private details out of URLs.
- [x] **FLOW-04 / P1 / L:** Implement contract updates with server/client tests together and backwards compatibility for current enquiries.

## 9. Content and commercial decisions

- [x] **CONTENT-01 / P0 / M:** Prepare real publishable projects and evidence-backed outcomes; clearly label demonstrations. Only Clare’s Life Celebrations is approved: factual fields, source-confirmed technologies and actual desktop/mobile captures are prepared in CLARE_PORTFOLIO_CONTENT.md. Illustrative interfaces remain labelled. Production publication is still HOME-03, not this preparation task.
- [x] **CONTENT-02 / P1 / S:** Decide whether to keep existing package display names or use clearer customer-facing names while retaining wire values. Retain the current descriptive titles from shared services.ts; rationale and exact mapping are in DESIGN_SYSTEM_2_0.md. Prices and wire identifiers unchanged.
- [ ] **CONTENT-03 / P1 / S:** Confirm service inclusions, exclusions, aftercare expectations and handover wording. Existing prices remain unchanged pending a commercial decision.
- [x] **CONTENT-04 / P1 / M:** Supply approved founder portrait/work artefacts if desired; design a complete alternative if no portrait is available. Actual Studio has James's identity/process and the original Aurora artefact; the complete portrait-free alternative is documented and covered by 43 Studio checks. No invented or stock founder portrait.
- [ ] **CONTENT-05 / P1 / M:** Prepare accurate privacy/accessibility information and support expectations from real operating arrangements.
- [x] **CONTENT-06 / P1 / S:** Review all public copy in British English under Crystal Powers branding, with the legal operator name only where needed. PUBLIC_CONTENT_REVIEW_2_0.md records the route-by-route review, corrected claims/prompts, matching initial/browser metadata and local proof. Legal/privacy operating facts remain CONTENT-05/CONTACT-08; no unverified legal operator inserted.

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

Each phase should finish with a reviewable local result and an evidence entry. A/B are partially implemented and overlap the current homepage. Continue from their delivered work; review the drafts and finish contracts before implementing the connected enquiry pages. No full phase is accepted yet.

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

### Practical continuation from this baseline

1. **Review direction and define contracts:** DS-01–04, FLOW-01/03, CONTENT-01/03. Review existing Home/Services/case-study drafts; settle component/material treatment and conditional fields for website/app/system/general/support. Record unresolved content decisions rather than inventing them.
2. **Finish the shared shell and homepage:** DS-06/07, HOME-01–08, 3D-03–05. Carry Aurora's geometry into actual layouts, minimise control clutter on mobile, show real work early and finish poster/live/static/failure acceptance. Keep proof/content work running alongside the enquiry implementation.
3. **Deliver Services, Contact and Support together:** SERV-01–10, CONTACT-01–09, SUP-01–05 and FLOW-02/04. Implement shared non-sensitive selections, editable step/review flow and genuine undecided/general/support contracts; retain prices and security/upload limits. Validate backward compatibility and existing enquiry email output.
4. **Deliver Work and populated case studies:** WORK/CASE tasks and editor media contract where adopted. Prepare approved projects; implement real screen art and gallery/story navigation, then verify private preview/public parity.
5. **Finish Studio, informational pages, recovery and special-route regression:** ABOUT/NEW/ERR/SPECIAL tasks. Build from real founder/provider content; no fake client evidence or unsupported accessibility claims.
6. **Deliver the dedicated owner workspace:** AUTH/REC/ADMIN/EDIT/SEC/SESSION tasks using synthetic local data before live acceptance. Preserve MFA, revision/conflict/session and private-media safeguards.
7. **Accept and release 2.0:** full page gates, measured performance/physical devices, security/provider/operational checks, version alignment and release notes. The already authorised 9 October deployment is a completed foundation release, not PHASE-H acceptance.

Rollback stays incremental: retain the previous deployable revision; keep draft designs separate until reviewed; make contract/schema additions backward compatible; revert visual layers without deleting project data or published revisions. Final completion requires every applicable page gate and section 12 evidence, not just a successful build or homepage animation.

- [ ] **PHASE-A:** Foundation and representative designs reviewed.
- [ ] **PHASE-B:** Shared experience and opening prototype reviewed.
- [ ] **PHASE-C:** Homepage accepted.
- [ ] **PHASE-D:** Services/Contact/Support accepted.
- [ ] **PHASE-E:** Portfolio and case studies accepted.
- [ ] **PHASE-F:** Remaining public/informational pages accepted.
- [ ] **PHASE-G:** Owner studio accepted.
- [ ] **PHASE-H:** Release candidate accepted.
- [x] **RELEASE-01:** Align agreed frontend/backend release versions, document migration/configuration requirements and retain the previous deployable revision. RELEASE_CANDIDATE_2_0.md records aligned 2.0.0, unchanged V1–V3, current configuration and the retained 83872dd source/jar with an offline 27-test rebuild, fresh boot and matching live frontend bytes. Actual deployment/backend revision, production-data restore and full acceptance remain RELEASE-02/PHASE-H.
- [ ] **RELEASE-02:** Confirm the final 2.0 candidate falls within James's authorised deployment scope; use existing authority where it applies, then verify its deployed revision, real routes and approved integrations. The authorised foundation deployment/provider delivery is already recorded; full 2.0 candidate acceptance remains open.

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

## Expanded business hub and company email — 12 October 2026

Each item includes implementation and final acceptance. Source-only progress does not earn a completed checkbox. Preserve the owner/portfolio/enquiry contracts throughout.

- [ ] **HUB-01** Team login and invitation activation: admin-issued accounts, private single-use hashed links, recipient passwords, expired/replayed/wrong-recipient handling and private route metadata.
- [ ] **HUB-02** Admin member screen: provision roles, edit/suspend/restore, cancel/replace invitations, remove access and recover accounts without exposing credentials or changing the protected owner.
- [ ] **HUB-03** Role permissions: authoritative server checks for every resource/action; fixed admin/moderator/support/member roles plus bounded custom roles and escalation prevention.
- [ ] **HUB-04** Team MFA/security: encrypted setup, replay-resistant codes, recovery/account settings, session expiry/revocation, CSRF/rate limits, security events and no client persistence of secrets.
- [ ] **HUB-05** Workspace navigation: responsive channel/category/group/member/support/moderation navigation, role-specific destinations, keyboard focus and no inaccessible dead controls.
- [ ] **HUB-06** Channel management: create/edit/archive, category and audience settings, customisation, version conflicts and permission changes applied to active readers.
- [ ] **HUB-07** Groups and membership: persistent groups, member management, private visibility, group/channel boundaries and isolation across workspaces.
- [ ] **HUB-08** Conversation and composer: real persisted text, bounded history with older-page UI, drafts, send/error/retry states and duplicate-send protection.
- [ ] **HUB-09** Message interactions: own-message edit/remove, moderation, replies/mentions/pins, permission checks and visible optimistic-conflict recovery.
- [ ] **HUB-10** Conversation updates: bounded foreground updates, unread/read positions, reconnects and revoked access; no hidden-tab polling or forbidden history replay.
- [ ] **HUB-11** Private attachments: trusted validation/storage/download authorisation, size/type limits, safe filenames, quarantine and no automatic public publishing.
- [ ] **HUB-12** Moderator upload queue/detail: review/approve/reject, metadata edits, restricted downloads and auditable removal without deleting unrelated public/client material.
- [ ] **HUB-13** Support inbox/detail: persisted enquiries, assignment, internal notes and customer-visible replies separated; restricted staff/customer data access.
- [ ] **HUB-14** Support tracking: status/history, progress updates, customer references, permitted transitions and clear saved-versus-delivered states.
- [ ] **HUB-15** Admin business content: add/edit/remove/archive and explicitly permitted publication through team endpoints; preserve real attribution and root owner protection.
- [ ] **HUB-16** Workspace/account customisation: safe branding, channel/group preferences, notification choices and profile settings; accessible responsive controls.
- [ ] **HUB-17** Hub persistence/release: H2 and PostgreSQL migrations, concurrency/transaction failures, audit history, backup/restore and compatible rollback.
- [ ] **HUB-18** Hub final QA: all roles and private routes, direct/negative API access, metadata, keyboard, mobile/tablet/desktop, uploads, support and session/recovery failures; zero applicable test failures.
- [ ] **MAIL-01** Real company domain/mailbox/provider and responsible administrators agreed; secure staff mailbox/alias setup completed.
- [ ] **MAIL-02** Sender verification and SPF/DKIM/DMARC configured through authorised provider/DNS access; real settings documented without secrets.
- [ ] **MAIL-03** Application sender/recipient/reply-to and trusted public URL configured; preserve existing enquiry transports and meaningful failure handling.
- [ ] **MAIL-04** Private staff invitation delivery and support replies: templates, expiry, token safety, delivery status, safe retries and bounce/outage recovery.
- [ ] **MAIL-05** Real legal operator/contact/access/retention/deletion/support scope supplied and applied consistently across privacy, contact, support and hub information.
- [ ] **MAIL-06** Final authorised staging mailbox and delivery/reply/failure verification; production provider and privacy gates resolved before release.

## Client service and payments — 12 October 2026

James confirmed the hub is where staff handle requests, update progress and contact clients about their websites. It must support easy site payments and agreed ongoing payments. See [client operations brief](CLIENT_OPERATIONS_2_0.md). James approved Stripe, GBP, optional deposit/balance and explicitly agreed monthly support. Admin drafts, issued client requests, stored checkout attempts, client Checkout/portal/invoice controls and signed-event reconciliation are now connected in source. Refund/dispute/withdrawal/financial-history and provider/recovery/acceptance gates remain open; billing is disabled by default and no actual recurring charge was created. These12 items extend157 to169 explicit entries:102 checked/67 open. Existing HUB-11/12/13/14 remain open despite the new request/moderation source until final verification.

- [ ] **CLIENT-01** Separate client identity/invitation/login/recovery and private noindex client workspace; no staff-role selection or access to other clients.
- [ ] **CLIENT-02** Client project/request detail: current progress, next step, agreed scope and readable history; internal notes/events remain private.
- [ ] **CLIENT-03** Client-team conversation and notifications: portal replies, stored recipients, clear delivery/error/retry states, thread permissions and preferred-contact handling.
- [ ] **CLIENT-04** Full staff/client acceptance: assignment, enquiries/uploads, correspondence, session revocation, concurrency/idempotency, mobile/keyboard and recovery/provider failures; verified backup/restore.
- [ ] **PAY-01** Confirm payment provider, currency/schedule and actual company/payment-account setup; use test/sandbox settings during development.
- [ ] **PAY-02** Admin-reviewed quotes/invoices/payment requests and optional deposit/balance; server-owned money/currency/client IDs, permissions, immutable issued totals and audit history.
- [ ] **PAY-03** Client checkout for an agreed one-off payment; safe retry/idempotency, cancellation/required action/pending/error states and no raw-card storage.
- [ ] **PAY-04** Explicitly accepted recurring payments: clear price/interval/start/cancellation terms; activation/renewal/failure/cancellation state tracked separately from project progress.
- [ ] **PAY-05** Authenticated customer billing management: payment-method updates, subscriptions/cancellation and receipts, scoped to the verified client/provider customer.
- [ ] **PAY-06** Signed webhook settlement: raw-body validation, replay bounds, duplicate/out-of-order handling and reconciliation. A checkout return URL never alone marks a bill paid.
- [ ] **PAY-07** Billing operations: admin-only changes/refunds/financial settings, authorised support visibility, provider outage/retry handling, financial records and backup/migration/privacy facts.
- [ ] **PAY-08** Full authorised sandbox billing acceptance: successful/failed/pending/duplicated one-off payments, renewal/action/failure/cancellation, permissions, receipts/webhooks and mobile checkout. No real customer charge as a test.

Client source continuation, 12 October: separate private client activation/login/project/conversation/password routes, request bindings, admin recovery/suspension, explicit staff sharing and own client replies are implemented in source (V11/V12). No CLIENT item is accepted yet; invitations require private admin delivery, recovery is admin-assisted, older-history/notification UX and all negative/runtime/database/browser checks remain open. Billing drafts remain private/unissued and no checkout/subscription is connected. See CLIENT_OPERATIONS_2_0.md. No tests ran, following implementation-first order.

Billing source continuation: unpaid-request withdrawal now reserves the request before expiring checkout, retains pending/withdrawn state and verifies provider outcomes. Pending signed events have a private admin queue/retry and optional bounded background recovery, disabled by default. Refund/dispute handling, historical financial operations, queue pagination/notifications and complete database/provider/browser/security acceptance remain open. This advances PAY-07 source coverage; it does not accept that item or change the 169/102/67 named-checklist counts.

Queue paging source continuation: the admin event queue now supports 50-row cursor pages across all pending records, ready/waiting/review filters and full current-mode counts. Completed rows remain valid page anchors; frontend reads are abortable and navigation history is bounded. V16/index and API/UI changes are coordinated. Final TSX syntax inspection and whitespace check passed; no Java/TypeScript build, migration, test, provider/job action or release acceptance occurred. Financial history/notifications and the remaining team/design/client/provider gates stay open.

Private-group source continuation: admin group/member/archive/restore management and optional channel group restrictions now exist in source. Group membership adds to role eligibility, including archived/history/message action boundaries; omitted group fields preserve restrictions and failed async group loading blocks visibility saves. V17/V18 and backup scope are coordinated. HUB-07 source coverage advances, but final cross-workspace/role/concurrency/revocation/archive/legacy/browser/database acceptance is still missing, so it remains open. Custom roles, messaging/unread/preferences, financial operations and selected-design/release gates remain outstanding.

Conversation source continuation: stable-key message retries, immutable intent fingerprints, same-channel replies and bounded live quote previews are connected to structured per-channel drafts and navigation/sign-out safeguards. Existing role/group checks remain authoritative. V19 extends the protected message table; no migration/test/build/runtime/provider action occurred. Older-history delta refresh, reauth retention, unread/pins/mentions, custom roles/preferences and full acceptance remain open, so HUB-08/09 stay unticked.

Pinned-message source continuation: a dedicated moderation permission, version/audit-checked pin toggles and a scoped live-pin panel are implemented, with open/visible-only refresh and deleted-message exclusion. V20 extends the existing protected message table. No build/test/migration/runtime/provider action occurred. HUB-09 still needs unread/mentions and all applicable role/concurrency/database/accessibility acceptance; source coverage is not a checkbox pass.

Unread source continuation: private persistent owner/team read positions, scoped counts and explicit channel acknowledgement are now connected to sidebar badges/visible-only refresh. V21/V22 and backup scope are coordinated. No build/test/migration/runtime/provider action occurred. HUB-10 still requires actual negative/multi-device/arrival/visibility/DB/browser acceptance; delta/history/mentions/reauth/custom-role/preferences and full release work remain open.

Conversation refresh source continuation: current access checks precede unchanged-version responses, and changed snapshots refresh the loaded<=500 range including older edits/deletions/reply previews. V23 and UI mutation/expansion race guards are connected. No build/test/migration/runtime/provider action occurred. Full history paging/profile invalidation/mentions/reauth/customisation and security/concurrency/browser/DB/performance gates remain open; HUB-08/09/10 stay unticked.

Long-history source continuation: earlier/newer/latest50-row paging now reaches history beyond the previous500-row UI bound, with same-channel retained cursors, draft preservation and fixed historical windows. No additional migration beyond V23 or build/test/runtime/provider action occurred. Actual long-history/security/concurrency/accessibility/DB/performance acceptance remains missing, so conversation gates are still open.

Reauthentication source continuation: unsent team composer text/reply IDs/retry keys now survive expiry in account-scoped tab memory, restored only after current workspace identity and channel access are verified. Old history/credentials/reply excerpts are not restored; different accounts, forbidden channels and deliberate sign-out discard retained content. Existing owner MFA flow is reused without elevating team roles. No build/test/login/provider action occurred, so reauth/security/accessibility acceptance remains open.

Mention source continuation: explicit eligible-person selection, atomic notifications, recipient-bound stable retries and a role/group/recipient-scoped paged inbox are now connected. V24/V25 and backup scope are coordinated. No build/test/migration/runtime/provider action occurred. Effective custom roles/preferences, all notification/access/concurrency/legacy/browser/database acceptance and broader finance/design/release work remain open; HUB-09/10 stay unticked.

### Bounded custom roles - source only

Added V26/V27 role profiles and account assignments, MANAGE_ROLES, retained/versioned workspace profiles, private admin create/edit/archive/restore/assignment controls and backup inventory. Profiles are subsets of an immutable trusted base role, require channel reading and validate related support/upload/publication/member permissions. Explicit assignment works on invited accounts before activation. A changed base role clears an incompatible profile; suspension/recovery preserves the existing restriction. Archived/invalid profiles fail closed, and profile changes/assignments increment affected credential versions. The protected owner remains independent; administrators cannot edit their own profile/assignment or grant capabilities beyond their current effective permissions.

Effective permissions now drive live team access, password/MFA/session validation, session responses, mention recipients and support-assignee eligibility. Admin writes recheck live access after workspace locking. UI includes unsaved-change/busy guards, role-matched assignment choices, archived-state warnings and retained form input on errors. No dependency, real account, database migration, login, provider or email operation ran.

Only TSX syntax inspection and whitespace review were performed; Java/TypeScript compilation, H2/PostgreSQL migration/RLS/restore, negative escalation/role/group/audience/session tests, concurrency and browser/mobile/keyboard acceptance remain deferred until implementation finishes. No checklist acceptance changed: 169 named items,102 checked,67 open. Workspace/profile customisation, notification preferences, attachment hardening, remaining client/financial/email/design implementation and full release verification remain open.

### Workspace and account preferences - source only

V28/V29 add versioned workspace names/descriptions and actor-scoped personal preferences with owner/member foreign keys, PostgreSQL RLS/browser-role revocations and backup inclusion. Workspace branding requires current MANAGE_SETTINGS; individual preferences are bound to the authenticated account. Writes lock the workspace and recheck current access; optimistic versions reject concurrent/lost-response overwrites. Custom roles and protected owner boundaries remain unchanged.

The integrated settings screen saves display name, compact message spacing, unread-count visibility and future in-app mention alerts. Name changes refresh conversation versions so cached author/reply labels can update. Hiding counts does not advance read positions. Opting out suppresses new mention rows but retains existing inbox items; re-enabling does not recreate suppressed alerts. Selected-recipient text explains this behaviour. No email, sound, push permission or external delivery is triggered. Branding is plain private-team text and does not change public Crystal Powers content. Settings have dirty/busy guards, retained input, separate form saves, explicit reload, focus entry/return and responsive controls; opening settings suspends conversation polling.

Three changed TSX files parsed with zero syntax diagnostics and git diff --check passed. These are source checks only: no Java/TypeScript build, H2/PostgreSQL migration, database/account/login/provider/notification operation or runtime test ran. Final cross-account/role/workspace/privacy, simultaneous preferences/mentions/retries, author invalidation, keyboard/mobile/theme/browser and backup/RLS checks remain outstanding. Channel-specific preferences and further customisation, attachments, client history, financial operations, email and Liquid Light whole-site acceptance also remain open. No HUB-16 or release checkbox changed;169 named/102 checked/67 open.

### Channel preferences and upload headers - source only

V30/V31 add actor-scoped/versioned channel favourites, unread-count visibility and future in-app mention preferences, with current workspace/role/audience/group/archived-channel checks on reads and writes. Settings responses omit preferences for inaccessible channels. Global opt-outs take precedence, existing alerts/read positions remain unchanged, and favourites sort within categories. The channel editor loads only when opened, has abort/stale-read guards, retained input, conflict/reload states and dirty/busy navigation protection. Backup inventory and PostgreSQL browser-role revocations include the table.

Reference uploads now allow JPEG/PNG/GIF/WebP and MP4/WebM/ftyp-based MOV only; supplied MIME, filename extension and bounded format headers must agree. Names reject paths/control characters/colons and over255 code points. Reads are bounded to256KiB; image metadata/canvas dimensions are limited to12000 pixels per side and80 megapixels without decoding pixel buffers. Total15MiB/five-file limits remain, with overflow-safe size accumulation. The enquiry file chooser, local type validation and guidance match this allowlist. SVG/HTML, unknown/empty MIME and legacy/non-ftyp MOV need export to a supported format. Existing private storage, moderation and attachment download boundaries remain.

These checks are neither antivirus scanning nor complete image/video decoding; accepted headers do not prove an entire file is safe or playable. Scanner/quarantine release handling, retention/removal/storage scaling and malicious/polyglot/animation/parser cases remain open. Existing upload fixtures may need genuine valid media during final meaningful tests; do not weaken the checks to retain fake headers. No Java/TypeScript build, test, migration, file upload, account/provider/email or runtime mutation ran. Four TSX files parsed with zero diagnostics and whitespace review passed. Negative/tenant/role/prefs/concurrency/idempotency, SQL/RLS/restore and browser/mobile/keyboard/full media acceptance remain deferred. No audit item is accepted from these source changes.

References checked for format/security rules: [WebP container specification](https://developers.google.com/speed/webp/docs/riff_container), [PNG specification](https://www.w3.org/TR/png/), [WebM container guidelines](https://www.webmproject.org/docs/container/) and [OWASP file uploads](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html). Apple QuickTime documentation redirected to a JavaScript page without accessible format detail; MOV branding/compatibility still needs explicit fixture/spec acceptance.

### Malware scan and quarantine - source only

V32 adds UNSCANNED/SCANNING/CLEAN/INFECTED/ERROR, scan timestamps and a private lease token. Every existing attachment starts UNSCANNED, including historically approved files; no historical approval is treated as a malware scan. New uploads remain quarantined. All staff download paths now require CLEAN, support/client downloads additionally require APPROVED, and client lists hide files without both states. Moderator approval cannot override quarantine. The moderator UI shows scan state/time, private review downloads only after CLEAN, manual scan/retry and infected/error/interruption handling.

Manual scans require current REVIEW_UPLOADS, expected attachment versions, current workspace isolation and bounded actor rate limits. A committed five-minute lease reserves quarantine before the scanner call; completion requires matching lease/token/version and current permissions. CLEAN still needs human approval; INFECTED is rejected, unknown/unavailable/malformed/timeout outcomes are ERROR and cannot release files. Concurrent review invalidates a stale completion; interrupted jobs remain quarantined and can be retried after lease expiry. Legacy filename/type/size/header/dimension checks are re-applied before scanning. No scan result can be supplied by the browser.

UploadScanner uses official clamd zINSTREAM chunks and exact bounded replies, with at most two concurrent connections,3-second connect/15-second read/20-second overall socket-close deadlines,15MiB content and4KiB reply caps. Only literal loopback/private/IPv6-ULA endpoints are accepted; TCP is unencrypted and must remain inside a trusted private boundary. Settings default disabled/blank and no scanner was installed, provisioned or contacted. UPLOAD_SCAN_ENABLED/HOST/PORT are documented as blank examples. A real maintained daemon/signature-update arrangement and private network endpoint must be configured and accepted; configuration is not scanner health or current signatures.

Enquiry notification emails now omit upload bytes, including on retries, so quarantine cannot be bypassed through email attachments. Files remain available through the private request/moderation workflow after release checks. The original low-level email transport retains its existing trusted attachments contract; current public intake always sends a text/HTML enquiry summary without files. Public receipt wording says files are saved for review.

Two changed TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, test, migration, upload/download, scanner/provider/account/email/runtime operation ran. Required final checks include true clean/infected/EICAR fixtures, malformed/truncated/overflow/slow/non-reading scanner replies, disabled/outdated daemon, legacy invalid media, disconnected/restart/lease/concurrent-review/role-revocation paths, all staff/client/direct endpoints, H2/PostgreSQL/RLS/restore and browser/mobile/accessibility. Scanner deployment, signature freshness, false-positive/removal/retention policy, moderation paging and full acceptance remain open. No checklist item was accepted.

Protocol reference: [official ClamD protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html). The earlier obsolete ClamAV guide URL failed; the official current manual was found and used. [OWASP upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) supports layered checks and antivirus/sandbox handling; a CLEAN response is not an absolute file-safety guarantee.

### Upload queue paging and stored-content removal - source only

The moderator UI now uses an additive /api/team/uploads/queue endpoint with50-file keyset pages, retained same-workspace UUID anchors, first/previous/next controls, bounded100-cursor navigation memory and full workspace state totals. Approved/rejected/removed anchors remain valid after state changes so paging can continue. The legacy list contract is retained. Requests are abortable and generation-guarded; state/page/reload changes ask before discarding review/removal drafts. Successful mutations refresh the queue and counts, and counts are explicitly labelled as the last refresh snapshot. Loading/failure/empty pages and focus are handled without claiming a live-count guarantee.

V33 adds removed_at and a queue index. A versioned removal action requires both REVIEW_UPLOADS and EDIT_UPLOADS, an explicit internal reason and UI confirmation. It clears the live attachment byte column, rejects further reviews/downloads/scans, invalidates scanner leases, preserves filename/type/original-size/scan/request metadata and records a private audit event. An in-flight scanner completion cannot restore a removed file. Removed records have a dedicated queue view and cannot be restored into content; the original enquiry and other public/client media are untouched. Existing downloads, database history and backups are not erased by this live-row action. No automatic retention schedule or legally complete deletion claim is introduced.

Support metadata shows removed state, private download links are suppressed and client file views exclude removed content. Repository byte retrieval, scan reservation/completion and review compare-and-set all reject removed rows; these are server-side checks independent of UI visibility. Schema extension needs no new backup table; the existing support_attachment dump includes the new columns/index automatically.

Three changed TSX files parsed with zero syntax diagnostics; whitespace review passed. No Java/TypeScript build, migration, test, real removal, upload/download, scanner/provider/account/runtime mutation ran. Final gates include >100-file queues, state/anchor/timestamp/UUID boundaries, cross-workspace/role/custom profiles, cursor tampering and restart, lost-response/stale-version/concurrent scan/review/removal, actual byte clearing and audit rollback, backups/RLS and keyboard/mobile/browser/error recovery. Retention/legal/scanner/provider configuration and overall release acceptance remain outstanding. HUB-11/12/17/18 and release checks remain unticked.

### Client conversation and history paging - source only

Client conversation/history now use independent50-row keyset pages with canonical request-scoped cursors, newest/older/newer navigation, bounded100-cursor memory, refresh/retry/empty/error states, abort and generation guards, and focus after navigation. Conversation ordering includes direction as a tie-breaker across staff and client tables; row keys also include direction. Only explicitly shared CLIENT staff messages and request replies enter the union. History only contains customer_visible events. Cursor anchors must currently belong to the authorised request and visible collection; private/internal/other-request cursors are rejected after the same live account/request check as detail access.

The client app uses an additive overview endpoint containing project progress and approved, clean, unremoved file metadata; it no longer downloads both legacy100-row collections on every progress refresh. The old detail contract remains for compatibility. History loads only when expanded; conversation/history navigation leaves the unsent composer intact and does not automatically poll hidden views. A successful send requests the latest conversation, whereas ordinary refresh preserves the selected historical page. Expired-feed responses clear that feed and keep the workspace's unsent input/explicit return-to-sign-in flow.

V34 adds conversation/reply/customer-history indexes. No migration/build/test/database/account/message/provider operation ran. Two TSX syntax inspections and whitespace checks passed. Full large-history/timestamp/UUID/direction ties, malformed/hidden/cross-request/client/workspace cursors, suspension/recovery/concurrency, sharing/retries/new arrivals, database/RLS/restore and browser/keyboard/mobile/network acceptance remain deferred. Staff conversation/history and the client project's100-item list still need full paging; client draft recovery/contact preferences, financial operations, real email/scanner configuration and selected-design/release acceptance remain open. No CLIENT or release checkbox was accepted.

### Client message recovery after expiry - source only

ClientEntry now owns tab-memory drafts scoped to the client/workspace identity, preserving body text and stable uncertain-send submission keys across explicit return to sign-in. ClientWorkspace confirms a fresh session before using memory and checks each recovered project through the current overview endpoint; that endpoint now returns actual client/workspace IDs for a second identity check. A different confirmed account clears old memory. A forbidden/missing project drops that project's retained draft when checked; other stored project IDs are not treated as authorised merely because they remain in memory. The currently selected project is checked on recovery even if it is outside the legacy100-item sidebar list.

Project switching now preserves separate unsent messages instead of forcing discard. Input updates memory synchronously, sends persist the retry key before the request, and confirmed success clears only matching intent. The server's existing request/account-bound idempotency path can recognise a retry after reauthentication; no new server draft table or browser storage was introduced. Up to50 nonblank drafts are retained; a51st is rejected with a clear message rather than silently deleting an existing draft. Per-project discard, explicit all-draft discard at sign-in and sign-out/password-change cleanup are available. Passwords, old message/history bodies, uploads, payment acceptance and credentials are not copied into draft memory.

Parent navigation protection covers the sign-in/identity-loading gap. Identity bootstrap is abort/generation guarded, child workspaces are keyed to identity and late login reads cannot overwrite a newer session. Failed identity checks have an explicit retry; expired/changed identities disable sending until confirmed again. Project response failures preserve other drafts and stable retries; input is not automatically sent after recovery. Leaving/refreshing destroys tab-memory messages after the existing navigation warning. Account recovery does not recall data previously downloaded by an authorised browser.

Three changed TS/TSX files parsed with zero syntax diagnostics and whitespace checks passed. No build, test, Java compilation, real login/password/account/message/migration/provider action occurred. Final gates remain same/different client/workspace, project revocation and renewed access, >100 projects/sidebar paging, missing projects,50-draft limit, uncertain/duplicate/successful sends, late/stale/StrictMode/abort callbacks, sign-out/password/discard/refresh/back, keyboard/mobile and backend concurrency/idempotency. Staff/client list/history paging, contact preferences, financial operations, provider/policy configuration, Liquid Light and full release acceptance remain open. No CLIENT/release checkbox changed.

### Client project-list paging - source only

The client sidebar now uses an additive /api/client/projects/page endpoint with50-project keyset pages, account/workspace-bound canonical cursor lookup, identity metadata, current linked-project totals and bounded100-cursor older/newer/newest navigation. Creation time and UUID determine order so sending messages or changing progress does not move an existing row across pages. Newly linked historical projects may require returning to newer pages; this is not a frozen historical membership snapshot. The legacy100-row list remains for contract compatibility, while the app can reach beyond it.

Sidebar paging has separate loading state, abort/generation guards and guarded identity checks before committing results. It does not change the open project or unsent drafts; a clear note identifies an open project outside the current sidebar page. Recovery checks that project directly even when outside the list. Switching/opening and sending still require current identity proof. Totals are explicitly last-refresh values, not a promise of live counts. A late bootstrap state update was moved behind its lifecycle/generation guard.

Source inspection found the existing V7 support_request_workspace_time index already covers workspace/creation-time/UUID. The duplicate newly proposed V35 migration was removed before any migration execution; no new schema change is needed for this continuation. ClientWorkspace syntax inspection and whitespace checks pass. No build, tests, migration, real project/client/account/message/provider/runtime operation ran. Final >100-project/tied-time/UUID/new-binding/cursor/tenant/suspension/recovery/navigation/draft/network/focus/browser/mobile/database/query-plan acceptance remains unproven. Staff request conversation/history/replies paging, contact preferences, financial/provider/email/design work and overall release acceptance remain open. No checklist item was checked.

### Staff request and update paging - source only

Staff conversations/internal notes, client replies and progress/audit history now use separate50-entry keyset collections. Each update endpoint checks current READ_SUPPORT and the same workspace/request before accepting a collection-scoped cursor. Message, reply and event anchors cannot be borrowed from another request or collection. The new staff overview excludes all three legacy100-entry payloads; old detail/list contracts remain unchanged. Existing V7 message/event indexes and V34 client-reply indexing cover these query shapes, so no duplicate migration was introduced.

SupportUpdateFeed provides independent newer/older/latest/refresh, bounded100-cursor navigation memory, abort/stale-read guards, focus after page movement, and clear loading/empty/failure states. Progress history loads only when expanded. Page refreshes after request mutations preserve the selected historical page. Staff message rendering retains original email delivery status, deliberate portal sharing and separate email actions on the original message IDs; paging does not send/share anything or alter permission checks. Failed feeds clear cached rows while leaving request forms mounted; reauthentication requires an explicit action with an unsaved-input warning.

The previously500-limited request sidebar is also replaced by50-request pages with an additive requests/page endpoint, proper51-row lookahead, same-workspace anchors and creation-time ordering. Newer/older/newest/refresh controls preserve the open RequestDetail and unsaved input, with an outside-page note. Requests no longer accumulate indefinitely in React state. State-filter changes still use existing discard guards. Read/save failure handlers leave request input for copying before explicit sign-in; complete staff-form recovery across global session expiry remains separate outstanding work.

Two TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, tests, migration, real request/message/email/share/provider/account operation ran. Final >100-updates/>500-requests, tied timestamps/UUIDs, mixed note/client/event/reply cursors, filters and changing states, custom roles/workspace/revocation, stale/aborted/network/mutation results, unsaved-input/reauth/share/mail failures, database/RLS/restore/query plans and keyboard/mobile/browser acceptance remain unproven. Full staff draft recovery, client contact preferences, financial/provider/email/design work and overall release verification remain open. No audit checkbox changed.

### Staff reply and progress recovery - source only

The existing owner/team tab-memory container now includes selected request IDs, unsent CLIENT/INTERNAL reply text and retry keys, plus edited progress/next-step/assignee values and their original expected version. It retains at most50 request drafts without silently dropping another draft. It does not store retrieved briefs/history/client email addresses, account credentials, upload bytes, billing acceptance or client-access form input. No browser storage or server draft table is introduced.

Global identity proof clears request memory on another actor and drops message/progress fields when their corresponding capabilities are absent. Each request recovery also requires a current overview whose returned actor scope matches the proven workspace identity, current same-workspace request access and current REPLY_SUPPORT/UPDATE_TRACKING grants. Missing/forbidden requests discard their retained draft. Staff request switching and workspace-panel navigation preserve eligible messages/progress; nonrecoverable billing/access fields keep their discard guards. Parent draft presence/navigation protection and explicit sign-out cleanup cover request drafts as well as channel composers, including the sign-in gap.

Message changes update memory synchronously and bind the stable key to kind/trimmed body. The key is stored before a save and retained for uncertain outcomes; confirmed saves clear it. Recovered messages are not automatically saved, emailed or shared. Progress recovery keeps the original version, warns when newer progress exists and never silently rebases a stale update. Explicit reload/discard refreshes progress while preserving an unrelated message draft. Per-message/progress discard controls and retained-draft sidebar badges are added. Identity failure disables writes; a later actor change in workspace responses forces reauthentication instead of repurposing old memory.

Five TS/TSX source files parsed with zero diagnostics and whitespace review passed. No Java/TypeScript build, tests, migration, real auth/request/message/progress/share/mail/payment/account operation ran. Final owner/team/same/different actor, role/profile/workspace/resource revocation, concurrent/stale/lost-response progress, duplicate reply retries,50-draft cap, StrictMode/late/abort/global-expiry/save callbacks, sign-out/discard/back/refresh, SQL and browser/mobile/keyboard acceptance remains open. Nonrecoverable billing/access/settings inputs still need final UX assessment; financial operations, company email/scanner/policy configuration, selected Liquid Light whole-site work and release verification remain outstanding. No checklist acceptance changed.

### Billing observation history - source only

V35/V36 add private append-only billing_observation rows, minimal category/provider-reference/status/associated-GBP-amount/detail fields, identity ordering, RLS/browser-role revocations and sequence protection. Backup inventory now includes the table and discovers both team-message and billing-observation sequences. Current-issued request, explicit client acceptance, verified checkout state, subscription status/period/cancellation flags, verified invoices and unpaid withdrawal append observations inside the existing locked billing transactions. Consecutive identical observations for the same bill/category/reference are skipped; a status that returns after an intervening change is retained. Recorded order uses identity values rather than assuming transaction timestamps are monotonic.

Specific subscription invoice events now retrieve and validate their own invoice ID/customer/subscription/currency/integer amounts in addition to refreshing the current subscription. Latest-invoice refresh also records that invoice. This preserves earlier renewal invoices instead of only overwriting latest_invoice. Current GBP invoice totals/amount_paid are described as provider invoice facts; paid status may involve credits/outside payments and is not asserted to be a separate Stripe cash transaction. A historical invoice observation does not alter the current subscription's latest-invoice pointer or authorise a plan/price change. Provider ID mismatch and unreadable integer amounts fail closed.

Issued bills have an expandable50-observation staff history with mode separation, current READ_SUPPORT/workspace/request/bill checks and bill/mode-bound exact numeric cursors. UI navigation is bounded, open-only, abort/generation guarded and has loading/empty/error/focus controls. Earlier activity is not fabricated or backfilled on a read. The UI explicitly forbids summing observations as revenue; full cash/refund/dispute/accounting-ledger/export and client receipt-history operations remain separate open work.

Two TSX files parsed with zero diagnostics and whitespace review passed. No Java/TypeScript build, test, migration/sequence/backup, provider request, invoice/payment/subscription/account operation ran. Final concurrency/dedup/A-B-A/lost/out-of-order observations, early invoice/session races, wrong ID/customer/subscription/currency/mode/amount/cursor/role/workspace, snapshot atomicity, sequence/RLS/restore and browser/mobile/keyboard/performance acceptance remain outstanding. The real Stripe sandbox, billing/tax/legal policy and provider configuration are still needed. No PAY/release checkbox changed.

Primary references refreshed: [Stripe invoice fields](https://docs.stripe.com/api/invoices/object) and [Stripe webhook handling](https://docs.stripe.com/webhooks). No raw provider payload, card or customer-address data is stored in these history rows.

### Provider payment/refund/dispute records - source only

V37/V38 add minimal provider payment records (requested/received/captured/refunded pence, current charge/status/dispute flag), separate bill allocation links and refund/dispute records, with PostgreSQL RLS/browser-role revocations and backup inclusion. A PaymentIntent is stored once even when future invoice allocations link it more than once. Provider references/status/money fields are selected individually; client_secret, raw card data and raw provider payloads are not retained.

Verified one-off checkout reconciliation now follows its actual PaymentIntent and latest Charge, checks mode/customer/currency/IDs/agreed amount and integral nonnegative money, and persists a checkout allocation. Signed refund/dispute events retrieve current provider resources and prove their Charge/PaymentIntent/customer relationship before saving adjustments and refreshing the payment snapshot. Refund objects have no livemode field; the verified Charge/key/environment supplies that boundary. Unknown payments for a managed customer remain pending financial review/retry rather than being acknowledged as unrelated. Truly unmanaged resources are ignored. This does not create refunds or submit dispute evidence.

Issued bills have independent50-record payments/adjustments views, bill/request/workspace/current READ_SUPPORT/mode-bound cursors, bounded navigation, open-only reads and abort/stale/focus/error controls. Gross payment facts, refund states, dispute flags and observation history stay distinct. The model includes allocation references, but monthly invoice-payment import, shared-allocation/multiple-charge handling, pending-import continuation, refund creation/reconciliation controls, client receipt/export and fee/payout/bookkeeping reconciliation remain unfinished. No complete ledger or revenue-total claim is made from this stage.

A source inspection found the previous HttpRequest timeout did not by itself cover consuming an InputStream body after headers. StripeGateway now adds a shared daemon deadline that closes active response bodies within the remaining20-second request window, retains the1MiB cap, removes cancelled timers and closes active bodies on shutdown. Timeout outcomes remain unconfirmed and retain existing idempotency/reconciliation rules. Actual stall/slow-header/slow-body/shutdown/resource tests are deferred.

Two TSX syntax inspections and whitespace checks pass. No build/test/migration/provider/payment/refund/dispute/account/runtime operation ran. Final wrong-ID/customer/currency/mode/amount/state/cursor/role, early/missing/shared payment links, repeated/out-of-order adjustments, concurrency/global payment locking, allocation import, backup/RLS/restore, HTTP deadlines and browser/mobile/keyboard acceptance remain open. No PAY/release checkbox changed.

Primary references: [Stripe PaymentIntent](https://docs.stripe.com/api/payment_intents/object), [Charge](https://docs.stripe.com/api/charges/object), [Refund](https://docs.stripe.com/api/refunds/object), [Dispute](https://docs.stripe.com/api/disputes/object), [InvoicePayment](https://docs.stripe.com/api/invoice-payment/object) and [JDK InputStream response handling](https://docs.oracle.com/en/java/javase/17/docs/api/java.net.http/java/net/http/HttpResponse.BodyHandlers.html). Real Stripe sandbox/provider/business-policy acceptance remains required.

### Monthly invoice allocation reconciliation - source only

V39/V40 add durable invoice reconciliation jobs, per-invoice allocation facts and global PaymentIntent mutex rows, with RLS/browser-role revocations and backup inventory. A verified monthly invoice observation enqueues/resets a job only when relevant invoice state/amount facts change. Jobs retain a provider cursor, nonce lease, version and PENDING/RUNNING/DONE/ERROR state. A batch reads at most two provider allocations; cursor/state commit with the allocation/payment writes. Interrupted leases can resume after five minutes, and explicit admin restart begins a fresh scan. No partial page is marked complete, and the app does not infer full financial completeness from invoice paid status.

The orchestrator commits the lease before provider reads, verifies invoice ID/customer/subscription/currency, then validates current request/workspace/mode/MANAGE_BILLING and lease/version before and after importing. Allocation IDs, invoice/mode/currency/status, nonnegative integer/null paid amounts and payment references are checked. PaymentIntent allocations use verified global cash records; payment_record allocations remain distinct recorded-payment facts. The official Stripe SDK also documents direct-charge allocations; those are preserved after charge ownership/capture checks instead of being mislabelled as PaymentIntents. Legacy charge adjustment/refund association and customerless legacy charge cases still require further completion/review.

Global payment writes now lock a mutex before retrieving current PaymentIntent/Charge values, serialising shared-payment observations across bills. First-row insert races may fail one transaction and require retry rather than silently overwrite another result. Allocation records retain amounts applied to each invoice; gross shared payment captures must not be added repeatedly as per-invoice revenue. Allocation/job read cursors are bill-bound, and lease tokens/cursors are excluded from the public job view.

Issued monthly requests have a paged import-status/allocation panel, bounded navigation, open-only abort/stale reads, incomplete/error/lease notices and explicit admin continue/restart controls. These are read/reconciliation actions and do not create a charge, refund or dispute response. Custom role validation now requires READ_SUPPORT alongside billing/client management, avoiding grants whose required screens/actions would be unreachable.

Two changed TSX files parsed with zero syntax diagnostics and whitespace checks passed. No Java/TypeScript build, tests, migration/provider/job/account/payment operation ran. Final multi-page/new/changed/canceled/null/external/direct-charge/shared allocations, stale/reset/expired leases, actor revocation, initial mutex races/global locking/deadlocks, partial rollback, currency/ownership/cursor boundaries, SQL/RLS/restore and UI/focus/network/browser/device acceptance remain open. Automatic invoice-job processing/recovery, allocation mutation/legacy charge coverage, admin refund controls, client receipts/exports and real financial-policy/provider/whole-site/release acceptance remain unfinished. No PAY/release item is accepted.

Primary specification: [Stripe InvoicePayment API](https://docs.stripe.com/api/invoice-payment/object) and [Stripe's generated InvoicePayments schema](https://raw.githubusercontent.com/stripe/stripe-node/master/src/resources/InvoicePayments.ts). An expanded documentation URL failed; the official generated schema confirmed charge/payment_intent/payment_record types. Recorded-payment IDs are treated as bounded opaque references rather than an invented prefix.

### Automatic invoice recovery - source only

V41 adds per-job failure counts, next retry time, last-failure timestamp and a due-work index. An optional BILLING_INVOICE_RECOVERY_ENABLED worker defaults false and processes at most two current-mode jobs per pass, with a60-second fixed delay after completion. Each job still imports at most two allocation records per batch. Transient errors receive60-second to1-hour backoff; ten consecutive failures pause automatic retries for review. Successful batches clear consecutive failures. Explicit authenticated admin continuation/restart remain separate controls, and restart or a genuinely changed invoice snapshot resets the failure gate.

Internal system begin/finish methods do not mint owner/team identities and are not exposed by HTTP routes. They require connected Stripe settings, a current-mode issued/accepted monthly bill with its stored subscription/customer, matching request/client workspace and the same lease/version/invoice-resource proofs as manual import. Read-only reconciliation can continue for an existing subscription while new checkout is paused or a client account is suspended; it cannot create payments/refunds or edit agreed prices. Manual operations still require current user roles before and after import.

The orchestrator commits leases before provider reads, commits each page's ledger/allocation/cursor updates atomically and rechecks ownership before completion. A failed start is also version-guarded and backed off, so invalid rows do not continuously monopolise the first due slots. Concurrent manual/automatic runs and expired/reset leases fail closed; a stale failure cannot overwrite a newer job. Allocation upserts now require unchanged invoice/kind/reference bindings, preventing a reused allocation ID from silently rebinding old cash links.

The invoice panel exposes failure counts, next retry time and automatic-review pauses without exposing lease tokens or implying a configured worker is running. InvoiceAllocations TSX syntax and whitespace review pass. No Java/TypeScript build, tests, migration, worker/provider/job/account/payment/refund operation ran. Final lease/start-failure/due-order/backoff/cap/reset/overlap/restart, paused checkout/suspended client, mode/workspace/currency/ownership, shared-payment locking/rollback, malformed or changed allocation bindings, SQL/backup/restore and UI/browser/device acceptance remain open. Long-batch/provider latency and shared scheduling with event recovery need performance verification. Legacy charge/refund association, admin refund execution/recovery, client financial receipts/exports, policy/provider/email/design and final release gates remain unfinished. No PAY/release acceptance item changed.


Legacy charge checkpoint: V42 and shared-lock adjustment re-fetch are implemented in source only. See the legacy charge association checkpoint in CRYSTAL_POWERS_2_0_PROGRESS.md for exact scope and deferred verification. Full tests remain deferred; refund controls, client receipts/exports and release gates remain open.
