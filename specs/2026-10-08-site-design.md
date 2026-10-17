# Hypospray site: landing page and themed docs — design

Oct 8, 2026 · brainstormed with Claude

## Intent

Build a marketing landing page for Hypospray from the LCARS-style designs, and give the existing Starlight docs the same look, in a single Astro project.

**From Leigh:**

- The designs (`specs/assets/landing-page/Hypospray — Final Designs.pdf`/`.html`) and `specs/2026-10-05-landing-page-visual-design.md` are the visual source of truth. Build to the spec's numbers, not the screenshots.
- The copy and code in the designs are illustrative. They describe an API (`token`, `container`, `provide`, `resolve`, `fork`) that Hypospray doesn't have.
- The spec's implementation notes were guesses. The decisions below supersede them where they differ.
- Leigh will heavily edit the copy for voice and clarity after the build.
- Low stakes for now: no E2E tests, and hosting is undecided (GitHub Pages or a custom domain, e.g. on Cloudflare).

**Success:**

- The landing page matches the spec at 390, 768, 1,050 and 1,200px.
- The docs share its tokens, fonts and header lockup.
- Every code sample on the page is real, typechecked Hypospray code.
- The site builds and links correctly with or without a base path.

## Decisions

| Topic | Decision |
| --- | --- |
| Stack | One Astro 7 project with Starlight. `.astro` components with per-component `<script>` where behaviour is needed. No UI framework; revisit only if client state gets annoying (likely with Try It). |
| Package | Rename `docs/` → `site/`, package `hypospray-docs` → `hypospray-site`. |
| URLs | Landing page at `/` (`src/pages/index.astro`). Docs at `/docs/…` via Starlight's documented subpath convention: content in `src/content/docs/docs/`. |
| Hosting | Undecided. Keep `SITE_URL`/`BASE_PATH` from env, and route every internal link through a base-aware helper. |
| Header morph | Triggered morph (not a swap, not scroll-scrubbed), driven by IntersectionObserver. CSS scroll-state queries, scroll-triggered animations and CSS scroll-spy are Chromium-only as of late 2026, so none are used. |
| Section 04 | "Try It" becomes **CODE**: a tabbed panel of static, highlighted examples in the `--try` hue. A live Try It playground is a separate, later project. |
| Section numbers | Removed everywhere: segments, section headers and nav labels. Nav labels are WHY, HOW, CODE, DOCS. |
| Theme | Dark only. Tokens are layered (raw palette → semantic) so a light set could be added later. No light theme is planned. |
| Docs header | The compact lockup, static. Buttons: SEARCH, GUIDE, API, GITHUB. The title links home. |
| Code samples | Real `.ts` files, typechecked against `@hypospray/core`. Fragments come from `// #region name` markers. |
| Copy | Claude drafts real copy and code against the actual API, keeping the design's structure and voice; Leigh edits. |
| Design files | Specs live in a top-level `specs/` folder as dated `.md` files, committed. The design PDF/HTML live in `specs/assets/landing-page/`, gitignored and kept on disk (LFS or a release asset later if wanted). |
| Testing | Unit tests for the pure helpers, build/link checks, and a manual browser checklist. No E2E. |

## 1. Header (landing page)

**One header, two geometry states.** The header is a single `position: fixed` element. A spacer in the page flow reserves the full header's height (180px desktop), so content never jumps. Every measurement that differs between full and compact is a registered custom property (`@property`):

- bar heights (48/14 → 24/7)
- the bar gap (8 → 4)
- `--cap` (70 → 35)
- corner curve radii
- button heights

A `data-compact` attribute on the header switches the values, and CSS transitions animate them over 200ms. With `prefers-reduced-motion: reduce` the change is instant.

**Corners are built in CSS, not SVG.** A corner is a post plus a bar. The outer curve is a `border-radius`, and the inner concave curve is a pseudo-element painted in `--bg` (the page background is solid). That way the curves animate with everything else. The spec's SVG paths are the visual reference the CSS corners must match in both states. View Transitions were rejected: they morph snapshot images (the full and compact corners have different curve ratios, 54/27 vs 27/12, so they'd distort), they capture the page while the user is mid-scroll, and they can't be interrupted.

**Butter bar.** It's drawn as segments (one under the orange bar run, one under each nav button), so it can break around any grown button.

**State script (in `Header`):**

- A sentinel at the bottom of the spacer, watched by an IntersectionObserver, toggles `data-compact` once the full header's space has scrolled out.
- A second IntersectionObserver tracks the sections. The active section is the last one whose top has passed a line just under the compact header (86px desktop, 46px phone). In the hero, nothing is active. CODE stays active through the closing call to action.
- The active section's nav button gets `aria-current="location"`.
- **Clicking a nav button** sets `aria-current` on the target immediately and smooth-scrolls to it (instant with reduced motion). Section-observer updates are suppressed until `scrollend`, with a 1s timeout fallback, so passing through intermediate sections doesn't flash them.
- Anchors (`#why`, `#how`, `#code`) have `scroll-margin-top` equal to the compact header height.

**Nav button states.** Each header defines `--grow-selected`, the distance from a button's bottom to the butter bar's bottom edge. `--grow-hover` is `calc(var(--grow-selected) / 2)`.

| Header | Rest | Hover | Selected |
| --- | --- | --- | --- |
| Full (desktop) | 48px | 59px | never selected |
| Compact (landing and docs) | 24px | ≈30px | 35px |
| Phone dock | 44px | no hover | 60px, label 15 → 17px |

- Buttons grow downward (dock buttons grow upward). Labels keep their position.
- **Any grown button, hovered or selected, breaks the butter bar** 6px either side of it.
- Hover applies only under `@media (hover: hover)` and uses the same 200ms transition.
- Pressed: a slight lightening (`color-mix` toward `--text`).
- Focus-visible: a 2px `--text` outline with a 2px offset, so a `--bg` gap shows between button and outline.
- The CSS keys selected styles off `[aria-current]`. Landing pages use `location`; docs use `page`.

**Breakpoints** (per spec):

- Phone frame below 600px.
- Between 600px and about 1,050px, the compact header is always shown (no full state, no morph) with nav buttons narrowed to about 90px.
- Full header above about 1,050px.

**Phone.** `data-compact` shrinks the phone header to the small sticky title (60×28 corner, `cap` 20, 46px band), and tapping the title scrolls to the top. The dock's active button grows. The back-to-top arrow in the dock corner fades in when compact and is hidden at the top of the page. The whole 60×56 corner is its tap target.

The sticky-header title's vertical position is tuned by eye during the build.

## 2. Page structure and components

```
site/src/
├── styles/tokens.css          colour tokens (palette + semantic), geometry @property registrations, type roles
├── layouts/Landing.astro      <html>, fonts, tokens, fixed header + spacer, phone dock
├── components/lcars/          shared by landing and docs
│   ├── Corner.astro           variant: full-orange | full-butter | phone-header | phone-dock
│   ├── Bar.astro              colour, optional rounded end
│   ├── Title.astro            cap-fit formula from --cap
│   ├── NavButton.astro        href, hue, label; hover/selected/focus states
│   └── Header.astro           assembles the lockup; `static` prop (docs) omits the script
├── components/landing/
│   ├── Section.astro          id, name, hue → segment column + content grid, rule + name row
│   ├── CodePanel.astro        file, hue, optional action slot; body via Expressive Code
│   ├── CodeTabs.astro         CODE section tablist
│   ├── InstallChip.astro      $ | command | COPY
│   ├── Button.astro           pill (primary) | square (secondary, hue)
│   └── Dock.astro             phone bottom nav + back-to-top corner
├── components/starlight/Header.astro   Starlight override → lcars/Header static
├── examples/*.ts              real, typechecked examples with // #region markers
├── lib/region.ts              extract a named region from source text
├── lib/stardate.ts            build-time stardate for the footer
├── lib/url.ts                 base-aware internal links
├── pages/index.astro          Hero, Why, How, Code, CTA, Footer
└── content/docs/docs/…        Starlight content
```

**Section.** A two-column grid: 112px segment column, 46px gap, then content (48px right padding). The segment is a block in the section's dim hue, running from the section's first line to 6px above the next section, so its height follows the content. Sections other than the hero start with a 2px `--rule` across the content width, then the section name in Antonio 20px in the bright hue. On phones, the segment column becomes the spec's 3px left rule, segmented per section.

**Code rendering.** Expressive Code's `<Code>` component (bundled with Starlight) renders code at build time, using one custom theme built from the spec's syntax mapping (keywords `--why`, types `--try`, strings `--docs`, comments `--text-muted`, default `--text`; JetBrains Mono 14px/1.7, ligatures off). The same theme applies to fenced code in the docs. On the landing page, `CodePanel` provides the LCARS header bar, and Expressive Code's frame chrome is turned off. `lib/region.ts` extracts regions before highlighting, so marker comments never render. If `<Code>` doesn't style correctly outside Starlight pages, `CodePanel` calls Expressive Code's renderer directly instead. This is checked early in the build.

**CODE tabs.** A WAI-ARIA tablist: `role="tablist"/"tab"/"tabpanel"`, `aria-selected`, roving tabindex, arrow/Home/End keys. Tabs are styled as buttons in the panel header. Each tab panel shows a one-line caption above its code. Every panel is in the HTML, with inactive ones `hidden`, so the content works without JS. Initial tabs, drawn from the current splash page:

- Pin the clock: `provideValue`
- Swap anything: `provideFactory`
- Child injectors: `createChild`
- Extend a provider: `extendProvider`

**InstallChip.** It shows `npm i @hypospray/core` (the design's `npm i hypospray` is wrong). COPY uses `navigator.clipboard.writeText` and confirms with a brief "COPIED" label.

**Fonts.** Antonio (400, 600, 700), Barlow Semi Condensed (400) and JetBrains Mono (400) are loaded through Astro 7's Fonts API with the Fontsource provider (self-hosted, no third-party requests), with Antonio 700 preloaded for the title fit.

**Client JS** lives only in `Header`, `Dock`, `InstallChip` and `CodeTabs`, each in its own component `<script>`.

## 3. Content

Claude drafts all copy and code against the real API; Leigh edits afterwards.

- **Hero:** the H1 keeps "Painless dependency injection for TypeScript." The body and the `app.ts` panel show `inject` defaults and `createInjector`.
- **Why:** the before/after keeps its premise (a class that builds its own collaborators vs one that asks for them), rewritten with `inject` defaults. The "Without" panel is a region of a file that compiles. The three benefits are rewritten to claims Hypospray actually supports (no decorators or tokens, override anywhere, child injectors), replacing "wiring errors at compile time".
- **How:** three steps. "Declare. Provide. Resolve." doesn't match Hypospray, so Claude proposes alternatives for Leigh to pick from (e.g. "Write. Inject. Override.").
- **CODE:** the tabs listed above, using the existing Star Trek examples.
- **CTA:** "Ready when you are." with GET STARTED (`/docs/getting-started/`), API REFERENCE (`/docs/reference/core/`) and GITHUB.
- **Footer:** `MIT LICENSE · © 2026 LEIGH CAPLAN · STARDATE nnnnn.n`. Stardate = `41000 + 1000 × (year − 1987) + 1000 × (day-of-year fraction)`, one decimal place, computed at build time (TNG premiered in 1987 at stardate 41xxx and advanced by about 1000 a season).

## 4. Docs theming and migration

**Theming:**

- `customCss` loads `tokens.css` plus `starlight.css`, which maps:
  - `--sl-color-accent*` from `--frame`
  - grays from `--text`, `--text-body`, `--text-muted`, `--rule` and `--panel`
  - `--sl-color-black` to `--bg`
  - `--sl-font` to Barlow Semi Condensed and `--sl-font-mono` to JetBrains Mono (ligatures off)
- Headings use Antonio uppercase, and sidebar group labels use the nav-label style. No section segments in the docs.
- Dark only: override `ThemeSelect` to render nothing, and `ThemeProvider` to always set `data-theme="dark"`.
- The `Header` override renders `lcars/Header` in its static compact state. `--sl-nav-height` matches the compact band (86px desktop, phone band height below 600px).
  - SEARCH wraps Starlight's `<Search />`, keeping Pagefind, the ⌘K shortcut and dialog accessibility.
  - GUIDE (`/docs/getting-started/`), API (`/docs/reference/core/`) and GITHUB are `NavButton` links.
  - GUIDE is selected on getting-started; API is selected under `/docs/reference/`.
  - On phones, SEARCH stays in the header. GUIDE, API and GITHUB move into Starlight's mobile menu with the sidebar (GitHub via `social`).
- The `/docs/` home is a short `index.md` overview linking to Getting started, Concepts and Reference.
- The current `logo.svg` is replaced by the `Title` lockup. Starlight's `title` config stays for metadata.

**Migration:**

- Rename `docs/` → `site/`, and update:
  - the package name
  - the root scripts (`docs:dev`/`docs:preview` → `site:dev`/`site:preview`)
  - `.github/workflows/docs.yml` (path filter `site/**`, `out-dir: site/dist`)
  - `editLink.baseUrl` (`…/edit/main/site/`)
- Move the content into `src/content/docs/docs/`. Sidebar `autogenerate` directories become `docs/concepts`/`docs/reference`, and the Getting started slug becomes `docs/getting-started`.
- Delete the splash `index.mdx` and port its examples into `src/examples/*.ts`. Move `examples/crew-example-1.ts` out of the content collection into `src/examples/`.
- Build on the existing uncommitted edits to `index.mdx`, `package.json` and the lockfile rather than discarding them.

## 5. Testing and verification

- **Typecheck:** `astro check` covers `.astro` files and `src/examples/*.ts` against the workspace `@hypospray/core`. It's already part of `pnpm typecheck` and CI.
- **Unit tests (vitest, written test-first):**
  - `lib/region.ts`: single, multiple and nested regions, a missing region (throws), and stripping of marker lines.
  - `lib/stardate.ts`: known dates.
  - `lib/url.ts`: with and without `BASE_PATH`, trailing slashes, and anchors.
- **Build/link check:** build with no base and with `BASE_PATH=/hypospray/`. A small script walks `dist/` and checks that every internal `href`/`src` resolves to a file.
- **Manual browser checklist** at 390, 768, 1,050 and 1,200px:
  - header morph both ways
  - active section while scrolling and after clicking each nav button (no flashing through intermediate sections)
  - hover vs selected heights, and the butter-bar breaks
  - focus-visible
  - reduced motion
  - tab keyboard navigation and no-JS rendering
  - copy button
  - phone dock, back-to-top and the title tap
  - docs header buttons, selected states, search dialog and mobile menu
  - geometry checked against the spec's numbers

## Out of scope

- Try It playground (a live editor or executed scenarios), and any tracing/debug API in `@hypospray/core`.
- A light theme.
- E2E/browser automation tests.
- Executing examples to assert their output comments (a possible follow-up).
- Choosing a host and setting up deployment beyond keeping the existing workflow pointed at `site/`.
- Rewriting docs content beyond moving it and adding the `/docs/` overview.

## Status and follow-ups (2026-10-15)

The plan (`2026-10-08-site-plan.md`) is fully implemented on `leigh/marketing-site`, and `pnpm run check` and both link checks pass. Nothing has been deployed.

Added after the plan:

- The hero keeps the code panel. A schematic lockup (`site/src/assets/hero-lockup@3x.{jxl,webp,png}`) was tried and set aside because it was awkward across sizes; the images stay in the repo, unused. The "Get started" and install row now sits below both the copy and the code panel (2026-10-17).
- The landing page is capped at `--page-max` (1440px, in `tokens.css`) with auto side margins. The docs stay full width (2026-10-17).

Open items:

- On phone docs pages, Starlight's menu toggle sits below the LCARS bar instead of in it.
- The code panel's frame title bar renders orange. Check it against the designs.
- Starlight's "On this page" heading uses Barlow. It should probably use the display font (Antonio).
- `astro build` prints a harmless 404-route warning.
- Copy is still a first draft, pending an edit for voice and clarity.
- Discuss whether the plan needed its level of detail (full code in every step), or whether a lighter plan would do for this kind of work.
