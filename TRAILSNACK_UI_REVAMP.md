# TrailSnack — Wild Berry & Night Forest Edition
## Complete UI Revamp Specification

> **Mission:** Transform TrailSnack from its utilitarian tactical layout into an enchanting, award-worthy dark-botanical experience: an interactive twilight forest floor teeming with glowing wild berries, tangled brambles, and luminescent flora.
>
> **Product principle:** *Wild, not reckless.*
>
> **Non-negotiable:** This is a visual and interaction-layer overhaul. Preserve 100% of existing functionality, routes, state stores, worker integrations, persistence, deterministic safety rules, and offline capability. The existing application—not this document—is the source of truth for implementation contracts.

---

## 0. Product Experience & Design North Star

TrailSnack is an offline trail-foraging companion powered by on-device Gemma AI. It should feel like opening a beautifully crafted, living field journal in a twilight forest: part botanical archive, part expedition instrument, and part premium outdoor companion.

The experience should combine four complementary design influences:

1. **The Twilight Forest:** deep forest greens, velvet moss, luminous berries, subtle bioluminescence, and atmospheric depth.
2. **The Botanical Archive:** editorial layouts, specimen photography, scientific names, refined typography, and carefully organized field notes.
3. **The Expedition Instrument:** highly legible GPS, offline, camera, model, and diagnostic information.
4. **The Living Field Journal:** tactile cards, restrained organic details, meaningful transitions, and a sense of discovery.

The result must feel like one coherent, production-quality product—not a conventional dashboard with botanical decorations layered on top.

### Design priorities

1. Safety communication and functional clarity.
2. Camera and specimen-assessment experience.
3. Mobile usability in real outdoor conditions.
4. Consistent design system and responsive layouts.
5. Atmospheric details and delightful motion.

The atmosphere must enhance the product, never compete with its purpose.

---

# 1. Visual & Thematic Identity

## 1.1 Concept

**Wild, not reckless.**

An editorial, high-craft outdoor companion that feels like opening a luminous, living field journal in the twilight canopy.

Avoid generic SaaS-dashboard aesthetics, excessive glassmorphism, neon cyberpunk styling, and decorative elements that obscure information.

## 1.2 Imagery & Atmosphere

Visual inspiration:

- Rich clusters of wild mountain berries: translucent ripe blackberries, glowing cloudberries, deep elderberry indigo, alpine cranberries, and dew-coated forest brambles.
- Dark, rich forest undergrowth: velvet moss, fiddlehead ferns, lichen-crusted bark, and drifting bioluminescent spores.
- Subtle botanical silhouettes, delicate leaf structures, organic textures, and atmospheric depth.
- UI surfaces that appear to float above the forest environment using frosted obsidian glass selectively, etched cream borders, and luminous berry accents.

Use imagery and textures with restraint. Avoid repeating the same obvious berry illustration across every screen.

## 1.3 Typography

- **Headlines / Display:** `Antonio` (weight 400), tall, condensed, commanding. Use tight leading (`.92`) and restrained negative tracking (`-.012em`). Use responsive `clamp()` sizing rather than rigid viewport scaling.
- **Body / Interface:** `Manrope` (weights 400, 500, 600) for clarity and outdoor legibility.
- **Telemetry / Badges:** `JetBrains Mono` / system monospace for model specifications, GPS fixes, latency, confidence metrics, hashes, and technical metadata.

Font reference:

`https://fonts.googleapis.com/css2?family=Antonio:wght@400&family=Manrope:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap`

**Offline requirement:** Do not rely on Google Fonts or any external font CDN at runtime. Bundle or self-host the required font assets locally, respecting existing project conventions and font licensing. Provide sensible local/system fallbacks.

## 1.4 Color Palette

| Token | Color | Intended use |
|---|---|---|
| Deep Obsidian Moss | `#070d09` to `#0d1712` | Main backgrounds |
| Spore Cream | `#f5efe2` | Primary text and highlights |
| Herbal Lichen | `#8a9c90` | Secondary text |
| Faint Bark | `#4b554e` | Muted labels and dividers |
| Cloudberry Amber | `#e59a34` | Warm indicators and accents |
| Elderberry Violet | `#7a4db8` | Deep Look / AI tier |
| Wild Cranberry Crimson | `#d9383a` | Hazard and toxic warnings |
| Spruce Needle Green | `#1d4d33` | Positive-state surfaces |
| Spruce Glow | `#2fe68b` | Restrained positive-state highlight |
| Bramble Ink | `#121e17` | Cards, wells, and inputs |

Create semantic design tokens for backgrounds, surfaces, text, borders, focus states, status colors, shadows, and overlays. Do not scatter unrelated hardcoded colors throughout components.

**Safety color semantics must remain consistent.** Never use green to imply a safety guarantee. The existing verdict enum and logic remain authoritative.

## 1.5 Fluid & Responsive Scaling

Do not depend on a single global viewport unit such as `--u: min(calc(100vw / 1600), calc(100vh / 900))` for the entire interface. It can make typography and touch targets unpredictable on mobile.

Prefer:

- Responsive `clamp()` typography.
- CSS Grid and Flexbox.
- Container queries where useful.
- A consistent spacing scale.
- Breakpoints aligned with actual content needs.
- Fixed minimum touch-target sizes independent of decorative scaling.

---

# 2. Design System & Interaction Language

Establish a cohesive reusable visual system before styling individual screens.

## 2.1 Design Tokens

Centralize:

- Forest, moss, bramble, and elevated surface colors.
- Display, body, scientific, and telemetry typography.
- Semantic verdict and status colors.
- Border styles, focus rings, and separators.
- Shadows, inset wells, and selective glass treatments.
- Spacing, radius, and responsive sizing scales.
- Motion durations and easing conventions.
- Layering and overlay/z-index conventions.

Follow existing Tailwind configuration and CSS architecture where practical. Avoid introducing a parallel styling system unnecessarily.

## 2.2 Component Language

Create or refine reusable treatments for:

- Primary, secondary, tertiary, and destructive buttons.
- Status badges and telemetry indicators.
- Specimen cards and candidate lists.
- Warning banners and safety callouts.
- Inputs, selectors, checkboxes, and toggles.
- Navigation, floating panels, drawers, and dialogs.
- Loading, skeleton, empty, error, disabled, and success states.
- Tooltips and accessible focus indicators.

Components should share consistent geometry, spacing, typography, border treatments, and interaction states.

## 2.3 Surface Hierarchy

Avoid applying glassmorphism to every card.

- Use tactile, mostly solid bramble surfaces for content cards.
- Use translucent/frosted glass selectively for floating navigation, telemetry, and overlays.
- Use etched cream borders and subtle botanical separators for structure.
- Reserve stronger glow effects for meaningful states and actions.
- Ensure text remains legible over all surfaces.

## 2.4 Motion & Feedback

- Use restrained spring-like transitions for navigation and panel interactions.
- Use staggered reveals for specimen candidates and field-log entries where they improve comprehension.
- Use transforms and opacity for common transitions.
- Provide clear feedback for capture, saving, model downloads, inference, and GPS acquisition.
- Use skeleton states for asynchronous operations.
- Respect `prefers-reduced-motion`.
- Avoid continuous animations that consume battery or distract users.
- Never delay safety-critical information behind an animation.

---

# 3. Background Canvas & Sensory Layer

Behind the UI sits a subtle atmospheric forest layer, optionally implemented as a hardware-accelerated canvas (`#forest-canvas`).

## 3.1 Visual Layers

- **Drifting spores and glow points:** subtle particles representing spores, fireflies, and dew highlights.
- **Interactive cursor push:** on desktop, mouse movement may gently deflect nearby particles to create a soft glowing wake.
- **Bramble and berry depth:** botanical silhouette layers, blackberry canes, wild fruit clusters, ferns, and subtle depth fog.
- **Parallax:** restrained depth movement where it adds atmosphere without affecting readability or usability.

## 3.2 Performance Constraints

- Do not render thousands of particles indiscriminately.
- Adapt particle density and rendering quality to device capability, viewport size, and reduced-motion preferences.
- Pause or reduce decorative rendering when the page is hidden, the device is under pressure, or the effect is not visible.
- Keep the decorative layer isolated from interactive UI and application state.
- Ensure it never interferes with camera capture, WebGPU inference, model downloads, or low-memory devices.
- Prefer CSS, SVG, and a lightweight Canvas implementation. Use Three.js only if the repository already uses it or there is a clear, measured benefit.
- Do not add a heavy graphics dependency solely for decorative effects.
- Provide a static fallback that still looks intentional when canvas or GPU effects are unavailable.

## 3.3 Soundscape (Optional Enhancement)

An optional ambient trail audio loop may provide night breeze, gentle rustling leaves, or a distant stream.

- Starts muted; never autoplay audio.
- Requires an explicit user gesture to enable.
- Provide a clear speaker control and accessible label.
- Fade in/out smoothly.
- Muffle or pause audio when dialogs/sheets open if appropriate.
- Respect device mute, browser autoplay restrictions, and reduced sensory preferences.
- Audio must never be required for understanding application state.
- Do not introduce audio dependencies that compromise offline behavior.

Treat sound as optional polish, not a core requirement. If implementation threatens scope, reliability, or performance, defer it.

---

# 4. Strict Functional Preservation — Do Not Break Any Logic

The redesigned UI must seamlessly wrap the existing state management, Web Workers, persistence, and safety rules.

**Important:** The identifiers and architecture below are expected contracts from the current application. Inspect the repository to confirm exact types, paths, and usage before editing. Do not invent replacements or assume this list is exhaustive.

## 4.1 State Stores

Preserve existing contracts, including:

- `useSettingsStore`:
  - `disclaimerAcceptedAt`
  - `region`
  - `gpsEnabled`
  - `theme`
  - `preferredDevice`
- `useScanStore`:
  - `draft` (`id`, `blob`, `thumbnailBlob`, `width`, `height`, `createdAt`)
  - `setDraft`
- `useModelStore`:
  - `fieldId`
  - `deepLook`
  - `setTier`

Do not replace stores, rename fields, alter persistence semantics, or introduce duplicate sources of truth.

## 4.2 Deterministic Safety Engine

`computeVerdict(scores, db, plausible)` remains the single source of truth for verdicts.

Existing verdict meanings must remain unchanged:

- `EDIBLE` — confident clean non-mushroom match only.
- `CAUTION` — mushrooms or borderline similarities.
- `TOXIC` — any deadly lookalike or toxic match in the plausible set.
- `UNKNOWN` — ambiguous or low similarity. Default communication: **"Unidentified — do not ingest."**

Never remove, weaken, bypass, reinterpret, or duplicate safety rules.

Do not change:

- Verdict computation.
- Confidence or similarity thresholds.
- Plausible-set logic.
- Toxic/dangerous lookalike handling.
- Database semantics.
- Safety-related fallback behavior.

The UI may improve the presentation of a verdict but must not determine or infer a verdict independently.

**Safety communication requirement:** Even an `EDIBLE` model verdict must not be presented as an unconditional guarantee that a wild specimen is safe to consume. Display a clear, persistent explanation that model identification is not proof of edibility and that users must not consume a specimen based solely on the app's identification.

## 4.3 Hardware / Gemma Worker

Preserve existing integrations:

- Web Worker: `gemma.worker.ts`
- Client: `gemmaClient.ts`
- Tier 1: `EmbeddingGemma 2` (~280 MB)
- Tier 2: `Gemma 4 E2B` (~3.3 GB WebGPU)

Do not alter worker message contracts, model loading, inference flow, cancellation, fallback behavior, or device compatibility logic.

## 4.4 Offline Persistence & Caching

Preserve existing behavior for:

- IndexedDB.
- `flora_safety_db.json`.
- Embeddings cache.
- Field log.
- Model caching and download lifecycle.
- Existing offline support and service-worker behavior, if present.

Do not introduce runtime dependencies on remote images, fonts, scripts, APIs, or CDNs for core UI rendering.

## 4.5 Telemetry Integrity

All telemetry must reflect real application state.

Never fabricate:

- GPS status or coordinates.
- Model readiness.
- Download progress, speed, or bytes.
- Device capabilities.
- WebGPU adapter details.
- Inference latency.
- Confidence or similarity scores.
- Storage utilization.

If a value is unavailable, display a clear unavailable/unknown state rather than a plausible-looking placeholder.

---

# 5. Screen-by-Screen UI Revamp Specifications

Inspect the actual route and component structure first. The names below are guidance, not permission to rename or replace existing modules.

## A. Navigation & Telemetry Shell
`AppShell.tsx`, `TelemetryRack.tsx`, `TabBar.tsx`

### Header

- Frosted dark-moss glass (`backdrop-blur-md bg-[#070d09]/80`).
- Left: botanical emblem and condensed `TrailSnack` logotype in Antonio, with restrained tracking (`0.04em`).
- Supporting text: *"Offline Wild Foraging Companion"*.
- Right: floating capsule telemetry rack containing:
  - Real-time offline indicator.
  - Model readiness, e.g. `T1: Ready`, only when backed by actual state.
  - GPS/satellite indicator, reflecting actual permission and fix state.
- On narrow screens, collapse secondary text and prioritize essential status.

### Bottom TabBar

- Floating pill dock with existing destinations:
  - Scan
  - Assess
  - Field Log
  - Models
  - Settings
- Etched cream borders, restrained active glow, clear active-state labels/icons.
- Comfortable touch targets and visible keyboard focus.
- Respect safe-area insets.
- Provide subtle press feedback. Use device haptics only if already supported and permission-safe; do not invent a haptics dependency.

### Navigation

Preserve all current routes, route guards, deep links, and navigation semantics. Do not remove routes merely because they are not listed here.

## B. Welcome & Safety Covenant
`Welcome.tsx`

### Hero Header

- Towering Antonio headline: **"Rooted in caution. Built for the wild."**
- Supporting caption explaining offline, on-device Gemma intelligence.
- Strong editorial composition with botanical visual details.

### Safety Covenant Card

- Deep bramble-black surface with subtle etched hazard-amber border.
- Prominent callout: **"The app never says 'eat this' — the worst case always wins."**
- Custom tactile checkbox or acknowledgement control with clear checked, unchecked, focused, and disabled states.
- Preserve existing disclaimer acknowledgement behavior and timestamp semantics.
- Do not make the safety warning easy to skip or visually subordinate.

### Field Setup

- Region selector styled as a refined dark-slate selector with brass chevron.
- Offline GPS tagging toggle with clear permission and availability states.
- Preserve existing settings behavior.

### Model Provisioning Bay

- Live animated download ring or segmented progress bar for Tier 1 (~280 MB).
- Display downloaded bytes, speed, and device capability only when actual values are available.
- Show real WebGPU/WASM capability information.
- Distinguish downloading, cached, ready, failed, paused, and incompatible states where supported.
- Do not simulate progress.

## C. Trail Camera & Capture
`Scan.tsx`, `CameraView.tsx`

### Viewfinder

- Edge-to-edge camera viewport framed with fine botanical HUD ticks and subtle cream borders.
- Illuminated specimen framing guide.
- Preserve actual camera stream, permission, capture, and error behavior.

### Overlay Guides

- Restrained glowing reticle.
- Live level/gyro feedback only if existing device APIs provide it.
- Never display fabricated orientation or sensor readings.

### Shutter Control

- Large 72px dual-ring capture button.
- Inner glowing berry-amber disc.
- Tactile press response and restrained ripple animation.
- Ensure capture is immediate and never delayed by decoration.

### Fallback Picker

- Refined photo-library selection action.
- Preserve existing file validation and image handling.
- Add drag-and-drop only if it fits the existing capture flow and works accessibly; it must not replace the picker.
- Provide clear permission, loading, empty, and failure states.

## D. Specimen Assessment & Verdict
`Assess.tsx`

This is the most important product screen. Give it the greatest design attention after the shared foundation.

The experience should resemble a sophisticated botanical identification instrument, not a generic AI chat or analytics dashboard.

### Specimen Plate

- Prominent square specimen frame showing the captured image.
- Refined micro-data overlay for timestamp, image dimensions, inference time, and short SHA-256 hash, only when those values are available.
- Preserve the original image and existing metadata behavior.
- Avoid overlays that obscure important specimen details.

### Safety Verdict Banner

Create an unmistakable visual hierarchy:

- High-impact verdict label: `EDIBLE`, `CAUTION`, `TOXIC`, or `UNKNOWN`.
- Bold condensed Antonio typography.
- Clear explanatory subheading.
- Strong warning hierarchy for dangerous outcomes.
- `UNKNOWN` must clearly communicate: **"Unidentified — do not ingest."**
- Never communicate that a model match guarantees safety.

The verdict displayed must come directly from the existing deterministic safety engine.

### Candidate Species Cards

- Show existing top cosine matches.
- Display common and scientific names where available.
- Include family classification and reference thumbnails where available.
- Distinguish AI-generated candidates from verified reference data.
- Do not imply that a similarity score is a probability of edibility.
- Preserve existing ranking and data semantics.

### Hazardous Lookalike Cards

- Visually prominent cranberry/crimson hazard treatment.
- Display dangerous lookalikes, such as Deadly Nightshade versus Wild Blueberry, when supplied by existing safety data.
- Highlight distinguishing visual features only when supported by reliable reference content.
- Never invent botanical distinctions or safety facts.
- Dangerous lookalikes must not be visually buried below ordinary candidates.

### Field Verification Checklist

- Interactive tap-to-tick checklist for relevant features such as stem nodes, berry cluster structure, underside veins, and leaf margins.
- Checklist content must be grounded in existing data or trusted, available reference content.
- Preserve checklist state semantics if they already exist.
- Do not let checklist completion change or override the deterministic verdict.
- Clearly communicate that checklist completion is not proof of edibility.

### Tier 2 Deep Look Panel

- Luminous violet drawer/panel for Gemma 4 E2B feature extraction.
- Display streaming JSON/token output only if the existing worker exposes it.
- Present feature analysis in a readable, structured format.
- Prominent `Cancel` action wired to the actual cancellation/abort mechanism.
- Preserve model-tier selection, loading, cancellation, and failure behavior.
- Do not fabricate analysis output or make the UI appear to be processing when it is not.

### Emergency Action

- One-touch offline poison-control dialer using the user's selected regional hotline, only if the existing application has a verified number and supported dialing behavior.
- Never invent a hotline number or silently choose an unverified region.
- If no verified number is available, communicate that clearly and provide no misleading action.
- Preserve the existing regional configuration.

### Field Notes & Geotag Save

- Notes textarea with accessible focus and readable text.
- One-click **"Save to Field Log"** action.
- Show geotag information only when a real location fix is available and permission has been granted.
- Preserve existing save, persistence, and error behavior.

## E. Field Log
`FieldLog.tsx`, `FieldLogDetail.tsx`

### Log Ledger

- Editorial specimen cards arranged chronologically.
- Each card may show:
  - Specimen photo.
  - Botanical common and Latin name.
  - Verdict tag.
  - Offline GPS coordinates, when recorded.
  - Date and relevant metadata.
- Use consistent card hierarchy and restrained botanical details.
- Preserve existing sort order, filters, pagination, and persistence behavior.

### Detail View

- Clear specimen image and identification history.
- Readable metadata and field notes.
- Strong safety communication.
- Preserve existing navigation and record actions.

### Export Action

- Export log as JSON/CSV with existing supported telemetry.
- Keep export formats and data semantics unchanged.
- Provide clear progress, success, and failure feedback.
- Do not omit existing fields or silently alter export structure.

## F. Models & Diagnostics Bay
`Models.tsx`

### Hardware Telemetry

A clean diagnostics grid showing available real values for:

- Device memory.
- WebGPU adapter vendor/architecture.
- Cache API utilization.
- Storage quota and usage bars.
- Relevant compatibility and capability information.

Show unsupported or unavailable values honestly. Do not infer hardware information from the browser or device name.

### Tier 1 & Tier 2 Management

Dedicated cards for each model tier with:

- Status badges: `Ready`, `Uncached`, `Incompatible`, and other existing states.
- Actual storage sizes.
- One-tap precache and purge actions, preserving existing behavior.
- Clear confirmation for destructive cache operations.
- Download, cancellation, and error feedback.

Do not change model identifiers, storage keys, download URLs, or worker integration.

## G. Settings & Remaining Existing Screens

The existing Settings screen and any other routes not explicitly described above must also receive the new design language.

- Preserve every existing setting and its behavior.
- Ensure theme, region, GPS, preferred device, disclaimer, and other existing controls remain functional.
- Do not remove a screen or feature because it is absent from this specification.
- Maintain consistent visual quality across all routes, dialogs, empty states, and error states.

---

# 6. Responsive Behavior — Mobile & Desktop

TrailSnack is an outdoor companion. Mobile must be treated as a first-class product experience, not a compressed desktop layout.

## 6.1 Desktop (> 820px)

- Centered application shell with a sensible maximum width, approximately `max-w-3xl` where appropriate.
- Atmospheric full-bleed background behind the application.
- Dual-column Assess layout where space allows:
  - Specimen plate on the left.
  - Verdict, candidates, and checklist on the right.
- Keep content widths comfortable for reading.
- Use hover states as enhancements, never as the only way to discover functionality.

## 6.2 Mobile (≤ 820px)

- Header collapses secondary text.
- Primary navigation uses an ergonomic floating bottom dock.
- Respect safe-area insets.
- Minimum 48px touch targets for gloved or cold hands on the trail.
- Avoid horizontal overflow and cramped metadata.
- Keep primary actions reachable and visually distinct.
- Camera capture and assessment must remain easy to use one-handed where practical.
- Stack desktop columns in a deliberate reading order.
- Keep warning and verdict information visible without requiring excessive scrolling.
- Avoid hover-dependent interactions.

## 6.3 Outdoor Readability & Accessibility

- Target WCAG 2.2 AA as a minimum for the full interface; pursue AAA contrast for primary text and critical safety information where feasible.
- Aim for at least 4.5:1 contrast for normal text and 3:1 for large text and essential graphical elements, following the applicable WCAG criteria.
- Do not use color alone to communicate verdicts or status.
- Use semantic HTML and meaningful accessible names.
- Ensure keyboard navigation and visible focus states.
- Add appropriate ARIA labels only where semantic HTML does not already provide the required accessibility.
- Respect browser zoom and text scaling.
- Support `prefers-reduced-motion`.
- Ensure dialogs and drawers manage focus correctly.
- Use readable font sizes and adequate spacing in outdoor conditions.

---

# 7. Offline-First Assets & Runtime Independence

The application must remain visually complete and usable without a network connection.

- Bundle fonts locally; no runtime Google Fonts dependency.
- Bundle required icons and decorative assets locally.
- Do not introduce remote image dependencies for core UI.
- Preserve existing service-worker and caching behavior.
- Ensure all loading, error, and offline states are designed intentionally.
- Avoid adding libraries that substantially increase bundle size without a clear benefit.
- Do not compromise IndexedDB, Cache API, model caching, or worker behavior.
- Test the redesigned UI with network access disabled where practical.

---

# 8. Execution Strategy & Regression Protection

## Phase 1 — Existing Application Audit

Before changing files:

1. Inspect the repository structure, package scripts, framework versions, and current styling conventions.
2. Identify all routes, layouts, shared components, stores, hooks, workers, persistence layers, and asynchronous operations.
3. Read the actual implementation of the safety engine and relevant tests.
4. Map the listed screens to their current source files.
5. Identify existing responsive breakpoints and design tokens.
6. Identify current loading, error, empty, permission, and offline states.
7. Determine which requested visual features are already supported by existing application capabilities.

Do not assume the component names, paths, types, or architecture in this document perfectly match the repository. Inspect first and adapt to the actual code.

Before implementation, form a concise internal change plan. Avoid unnecessary repository-wide refactoring.

## Phase 2 — Design Foundation

1. Establish the design tokens and typography.
2. Implement reusable buttons, cards, badges, navigation, inputs, and overlays.
3. Establish consistent motion, focus, and responsive conventions.
4. Implement the atmospheric background as an isolated, optional visual layer.
5. Verify the foundation against existing application architecture and offline requirements.

## Phase 3 — Screen Implementation

Implement the redesign screen by screen, prioritizing:

1. App shell and navigation.
2. Welcome and safety covenant.
3. Camera and specimen capture.
4. Assessment and safety verdict.
5. Field log and detail views.
6. Models and diagnostics.
7. Settings and all remaining existing routes.

Do not leave unlisted routes with the old design unless there is a compelling technical reason. Maintain consistent quality across the complete application.

## Phase 4 — Regression Verification

Verify:

- Every existing route remains accessible.
- Existing route guards and navigation semantics remain intact.
- All existing actions, callbacks, and state transitions work.
- Camera capture and image selection remain functional.
- Both model tiers remain operational.
- Model downloads, cancellation, caching, and offline behavior remain intact.
- Verdict computation remains deterministic and unchanged.
- Dangerous lookalike handling remains intact.
- Field-log persistence, detail views, and export remain functional.
- GPS permissions, regional settings, and location behavior remain intact.
- Dialogs, drawers, navigation, and mobile interactions work correctly.
- The app remains visually complete without network connectivity.
- No telemetry has been fabricated.
- No critical console errors, TypeScript errors, or lint regressions are introduced.

Run the existing lint, type-check, build, and relevant tests using the repository's actual package scripts. Do not invent script names. If a check cannot run, report why rather than claiming it passed.

---

# 9. Non-Negotiable Engineering Constraints

- Visual and interaction-layer overhaul only; no business-logic refactoring.
- Do not replace existing state stores or introduce duplicate state.
- Retain existing props, callbacks, hook contracts, and data types.
- Do not alter worker protocols or model inference behavior.
- Do not alter safety classifications, confidence thresholds, or deterministic verdict logic.
- Do not fabricate telemetry, model outputs, download progress, GPS data, or botanical facts.
- Do not remove existing functionality to simplify the redesign.
- Do not add unnecessary dependencies.
- Do not introduce network dependencies into core offline UI.
- Do not sacrifice performance for decorative effects.
- Do not make animations a prerequisite for seeing or using important information.
- If a visual request conflicts with an existing functional contract, preserve functionality and adapt the visual implementation.
- If a requested feature is not supported by the current codebase, do not fake it. Either implement it using an existing reliable capability without changing business logic, or leave it out and report the limitation.

---

# 10. Definition of Done

The revamp is complete only when:

1. The entire application consistently reflects the Wild Berry & Night Forest design direction.
2. The result feels like a cohesive, premium botanical field companion rather than a generic dashboard.
3. All existing screens and routes have been accounted for.
4. Mobile and desktop layouts are polished and usable.
5. Safety verdicts remain deterministic and are communicated responsibly.
6. Camera, model workers, downloads, caching, GPS, field logs, and exports remain functional.
7. Core UI assets work offline.
8. Motion and background effects are adaptive and non-disruptive.
9. Accessibility, keyboard interaction, and reduced-motion behavior have been considered.
10. Relevant project checks have been run and their results accurately reported.

## Final Quality Bar

The finished product should feel like a beautifully designed scientific field journal discovered in an enchanted forest: immersive at first glance, exceptionally clear under pressure, trustworthy in its safety communication, and technically faithful to the existing application.

**The forest is the atmosphere. The specimen is the focus. Safety is the priority.**
