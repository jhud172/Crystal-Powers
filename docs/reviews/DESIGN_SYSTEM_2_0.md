# Crystal Powers 2.0 design system

Working specification — selected Liquid Light review, 16 October 2026. This documents the implemented studio direction, not a whole-site accessibility certification. Public brand/copy remains Crystal Powers; only Clare’s Life Celebrations is approved real portfolio work. Public, owner and personal routes retain their existing contracts.

## Selected design review brief — 16 October 2026

Visual thesis: warm ivory and coral light, large editorial typography and open compositions, with the original crystal/device work as an optional layer. All five existing appearances use the same semantic roles.

Content plan: the Home composition establishes brand/offer/action; the actual Services builder proves a dense decision flow; the Clare case-study composition proves factual long-form content and responsive imagery; control states make keyboard, feedback and selection behaviour reviewable. The development reference must remain noindex, never publish a case study and never submit an enquiry.

Interaction thesis: keep the reversible Liquid Light veil and immediate reduced-motion alternative; preserve native builder progress and error focus; use clear selected/hover/focus/disabled feedback. Add no decorative motion library or new public route.

The current reference lives at frontend/design/observatory.html and is development-only. Earlier prototype verifier expectations are historical; the current verifier must inspect the selected compositions and actual shared tokens. Whole-site contrast, assistive/physical devices, commercial/privacy facts and production content/publication remain separate acceptance gates.

## Implementation brief

Objective: finish the semantic type/spacing/control-state foundation and make its reference reviewable alongside the existing Home, Services and case-study drafts. Value: consistent, legible controls and clear feedback across dense forms and expressive project pages. Preserve distinct editorial compositions; do not replace them with a generic card template.

Owners: `styles/base/studio-tokens.css` for semantic values; `styles/base/studio-controls.css` for shared states; route CSS for composition; existing development-only `features/design/` and `design/observatory.html` for reference. No new public route, API, schema, dependency, provider action or private storage. The Work count-slot fix belongs to `Portfolio.tsx` / `case-study.css`.

Accessibility/mobile/motion: keep semantic native controls, associated labels, field errors, focus order and 44 px targets; share appearance values across all five themes. Hover/pressed styles cannot gate essential content; disabled controls stay inactive. The reference is labelled development-only and never submits an enquiry. Reduced-effects/system-motion rules continue to remove decorative transitions.

Verification: current production/public owner semantics plus interactive development reference; six widths, five appearances, keyboard/focus/disabled/selected/invalid/success states, representative contrast samples and enlarged-text reflow. Compare actual computed type before/after; run build, animation contracts and affected public/owner/enquiry/portfolio checks. Keep physical/screen-reader/full-site contrast and hosted acceptance open. Roll back new shared styles/tokens and their route references together; no database migration.

## Semantic roles

| Role | Owner / intended use |
| --- | --- |
| Canvas, raised surface, primary/muted copy | Existing `--studio-bg`, `--studio-raised`, `--studio-text`, `--studio-muted` |
| Decorative line / operable control border | `--studio-line` / `--studio-control-line`; a faint separator is not a field boundary |
| Accent / signal / focus / error / success | Explicit state roles in every appearance; state text/icon/underline accompany colour |
| Body, small, label and caption type | Reusable reading/control scale; caption is not used for essential instructions |
| Display / section / form / compact title | Purpose-specific fluid type; Home, editorial stories and task pages retain their distinct density |
| Gutter, small gap, section spacing | Fluid rhythm; dense workflows use smaller owned gaps rather than empty staged sections |
| Radius / cut / elevation | Small precise corners, original crystal geometry and restrained panels; no permanent page-wide blur |
| Focus width/offset, target, line width | Stable geometry across focus/selection/error; no padding jump to represent state |
| Short/section timing and ease | Interaction feedback only; OS motion and Reduce effects override it |

All five appearances retain their stable IDs: futuristic (Dark), clean (Light), classic (Warm dark), fresh (Fresh light), summer-vibes (Warm light). Type/geometry inherit; semantic colours change per appearance.

## Control-state contract

| Component | Default / hover / focus | Selected / disabled / feedback |
| --- | --- | --- |
| Primary button / text link | Legible filled action or clear text; hover colour/underline; visible offset focus | Pressed feedback is bounded; disabled cannot activate or hover-lift; no action hidden in an animation |
| Field / select / textarea | Label, control border, readable value and hint; visible focus | Native readonly/disabled treatment; invalid border plus linked textual error; retain entered data on failure |
| Selection tile | Native radio/checkbox or pressed button, explicit title and scope | Checked indicator/filled treatment plus native/ARIA state; do not change its box size |
| Tab-like device/filter selector | Button group, keyboard reachable, labelled purpose | Pressed/underlined state; filter counts reserve space while pending so the controls do not jump |
| Disclosure | Native details/summary or an explicit expanded button | Expanded state reveals useful text; keyboard operable; no reading delay |
| Badge | Text conveys status; colour is supplementary | Published/private/archived/pending are distinct words; never infer publication from appearance |
| Loading / error / success | Honest loading text and reserved image/geometry; status or alert as appropriate | Explain correction/retry/next step; retain input on failure; success follows actual accepted response |

Actual owners: `FormFields`/`EnquiryForm`/`ScopeFields`, `PasswordField`/`OwnerError`, `ProjectDashboard`/`ProjectEditor`, `ProjectGallery`, `CollaborationChapters`, `Layout`, `BrandIdentity`, `LiquidLightHero` and the separate optional `ModelStage`. The design reference demonstrates states; it does not replace real server-flow evidence.

## Responsive composition rules

- 320/390 px: visible project entry, compact shared controls, one-column reading/forms; selection groups wrap, not horizontal-scroll; imagery reserves aspect ratio. Optional crystal remains below a useful offer/actions.
- 768 px: shared menu remains available, two-column forms only where fields remain readable; case story/gallery can collapse independently.
- 1024 px: dense task layouts use one or two deliberate columns; the public navigation switches only where it fits, not at a device-name assumption.
- 1440/1920 px: asymmetric editorial/project layouts, bounded form reading widths and fluid gutters; do not enlarge small controls to fill empty space.
- Page-owned cutovers remain at 600/760/800/1000/1050 px where their content needs it. Breakpoints are composition rules, not separate products.
- Original birthday routes remain independent; private editor preview uses actual 1440/768/390 viewport layout, not a stretched desktop image.

## Representative compositions

`/design/observatory.html` is a Vite development entry with Home, Services builder, case-study and control-state reference. It is not mounted by `App` or part of the default public build. Home reuses the selected Liquid Light hero; Services reuses the actual builder. The case-study composition reads the approved Clare content JSON and exact approved desktop/mobile captures, with explicit development-only labelling. It creates no public project or new claim of results. Its design-only selections never submit an enquiry. Current production Home/Services/Work/cases/Studio/Contact/Support use the same semantic tokens with their own layouts.

Founder content has a complete portrait-free alternative: James's initial/name, direct collaboration/process and the selected Liquid Light artwork with factual description. No stock or invented founder portrait is needed; an approved portrait can be added later without making this composition incomplete.

## Customer-facing package naming decision

Retain the existing descriptive display titles in 2.0. They explain the starting point better than exposing technical legacy tier values. Shared `services.ts` remains the source for builder/options/review labels; keep wire values for API/email compatibility. Do not rename identifiers or change prices as a side effect of the redesign.

| Stable wire value | Public display title |
| --- | --- |
| Basic | Starter site foundation |
| Starter | Stronger business presence |
| Standard | Balanced premium build |
| Experienced | Advanced business structure |
| Multi Grade | Larger custom scope |
| Custom Quote | Tailored project scope |

This is a display-name decision, not a new commercial scope/price/retention/support promise. CONTENT-03 and operational content gates remain separate. Current connected enquiry verification covers the legacy wire contract and visible selections/review.

## Selected-design acceptance — 16 October 2026

The current development reference passes 334 browser checks across four compositions, all five appearances and 320/390/768/1024/1440/1920 px. Coverage includes semantic token presence, representative text/action/field/focus contrast, disabled invariance, native keyboard selections/disclosures, error focus, explicit local-only success, 200% text reflow at 320 px, approved mobile image geometry and zero API mutations/page errors. Light Home and mobile controls plus Dark Home/Services/case screenshots were reviewed. Tall element screenshots can capture sticky headers over content; actual viewport geometry was checked before diagnosing a layout failure.

This accepts DS-01–04 foundation/reference scope before accepting remaining page work. It does not retroactively claim drafts preceded already implemented pages or accept whole-site contrast, screen readers, physical zoom/devices, private workflows or production Clare publication. Earlier prototype evidence retains its dated scope.

`verify-design-browser.cjs` initially needed lazy-image completion and accessible-name/scoped-link selector corrections; the final suite passes without weakening product requirements. Production build/reachability checks find no unresolved/unreachable source and keep the reference development-only. The current packaged Home returns 200; both `/design/observatory.html` and `/design/approved-clare-mobile.jpg` return 404. Production bundle and jar identity remain unchanged by this development-only work. Full release automation passes 95 H2 tests with zero failures/errors/skips, asset contracts, frontend build and packaging.
