# Hypospray landing page — design spec

Oct 5, 2026 · @Leigh

## Overview

This spec describes the locked Hypospray landing page: an LCARS-style frame on a black page, with one numbered, colour-coded segment per section. Every measurement here comes from the canvas artboards, so build to these numbers rather than to screenshots.

| Artboard | What it shows | Use it for |
| --- | --- | --- |
| AE1 · Hi-fi desktop | Full page at the top: header lockup, hero, Why, How, Try It, closing call to action | Desktop layout, copy, components |
| AE2 · Sticky header | Desktop scrolled into How with the compact header | Sticky header and active-section state |
| AC1 · Phone, at top | Q6 phone header, segmented left rule, bottom dock | Phone layout |
| AC1 · Phone, in Why | Small sticky title, rule segments, active dock button, back-to-top arrow | Phone scroll behaviour |
| AA · Z1 with your edits | Leigh's Affinity edit of the desktop lockup | Source of truth for the desktop header geometry |

All sizes are CSS pixels at a 1200px-wide desktop frame and a 390px-wide phone frame. The desktop frame has a 12px inset from the viewport edge; the phone frame has 8px.

## Colour tokens

The palette is black, one orange frame, a butter accent, and four section hues that each have a bright and a dim value. Each dim value is roughly 48% of its bright value: darkened, not desaturated, so it stays clearly its hue.

| Token | Hex | Used for |
| --- | --- | --- |
| `--bg` | #050403 | Page background, gaps between all LCARS pieces, button label text |
| `--frame` | #FF9F1C | Header corner and bar, rounded bar end, phone dock corner, primary buttons |
| `--butter` | #F5E3A0 | HYPOSPRAY title, second (lower) desktop corner and thin bar, install-chip ends |
| `--why` / `--why-dim` | #C59BD8 / #5F4A68 | 02 Why: nav button, section name and number / segment, panel header |
| `--how` / `--how-dim` | #8F95F2 / #454874 | 03 How |
| `--try` / `--try-dim` | #8CC8F5 / #436076 | 04 Try It |
| `--docs` | #FFC58A | Docs nav button; string colour in code |
| `--hero-dim` | #7A4E14 | 01 segment, orange-keyed panel headers |
| `--text` | #F2E4CF | Headings, code default text |
| `--text-body` | #D9C8B2 | Body copy |
| `--text-muted` | #9A8F84 | Code comments, footer |
| `--rule` | #3A2F26 | Section rules |
| `--panel` | #120E0A | Code panel and install-chip backgrounds |

Code syntax uses the same palette: keywords `--why`, types `--try`, strings `--docs`, comments `--text-muted`.

## Typography

Three families: Antonio for everything LCARS (title, nav, labels, headings), Barlow Semi Condensed for body copy, and JetBrains Mono for code with ligatures turned off (`font-variant-ligatures: none`, otherwise `=>` renders as an arrow).

| Role | Family / weight | Size / line-height | Notes |
| --- | --- | --- | --- |
| HYPOSPRAY title | Antonio 700 | Fitted to bars (formula below) | Tracking 0.0112em; colour `--butter` |
| H1 (hero) | Antonio 600 | 64px / 1.0 | Uppercase, `--text` |
| H2 (section heading) | Antonio 600 | 44px / 1.05 | Uppercase |
| Benefit / step titles | Antonio 600 | 24–26px | Uppercase, section colour |
| Section name and number | Antonio 400 | 20px / 1.2939 | Tracking 0.02em, bright section colour |
| Nav labels | Antonio 400 | 16px (phone 15px) | Tracking 0.08em, `--bg` on the button colour |
| Body | Barlow Semi Condensed 400 | 20–21px / 1.5 | `--text-body` |
| Code | JetBrains Mono 400 | 14px / 1.7 | Ligatures off |

**Title fit.** The title's capitals fill a bar's height exactly, top edge to bottom edge. Antonio Bold's metrics (units per em 2048) are cap height 1760, ascent 2365, descent 285, and the H's left side-bearing 132. For a target cap height `cap` in px:

```latex
\text{font-size} = \frac{cap}{0.859375} = 1.1636 \cdot cap
```

- `line-height: 1.2939` (ascent plus descent, so there is no half-leading)
- `margin-top: -0.3438 × cap` (puts the baseline on the bar's bottom edge)
- `margin-left: -0.0750 × cap` (removes the H's side-bearing so the letter edge sits on the content line)
- Put the title in a box exactly `cap` tall, `overflow: visible`

Round letters (O, S) overshoot about 1% above and below; that is correct optically. In browsers that support it, `text-box: trim-both cap alphabetic` can replace the margins. The fit depends on Antonio being loaded, so preload it to avoid a jump on first paint.

## Desktop header

The header is two stacked corners: an orange one whose post rises into a 48px bar, and a butter one whose 14px bar turns down into a short post. HYPOSPRAY spans both bars, so its capitals are 70px tall. Coordinates below are in a 1200px frame with the 12px inset already included.

| Piece | Geometry |
| --- | --- |
| Orange corner | Post x 12–124 (112px wide), top at y 12; bar y 60–108 (48px); stub to x 156; outside curve 54px, inside curve 27px |
| Butter corner | Bar y 116–130 (14px); post x 12–124 down to y 180; same 54px / 27px curves |
| Gap between the two bars | 8px |
| Title | Left edge x 170 (the content line); caps y 60–130, so `cap` = 70 and font-size 81.45px |
| Orange bar | From title end + 10px (x ≈ 520) to x 686 |
| Nav buttons | 108 × 48 at x 692, 806, 920, 1034 (6px gaps); labels bottom-right, padding 0 7px 5px |
| Rounded end | x 1148–1188, 48px tall, right radius 24px |
| Butter bar | From x ≈ 520 to x 1188, 14px tall, right radius 7px |

The two corners as SVG paths (frame coordinates):

```
Orange: M12,12 L124,12 L124,33 A27,27 0 0 0 151,60 L156,60 L156,108 L66,108 A54,54 0 0 1 12,54 Z
Butter: M12,180 L12,170 A54,54 0 0 1 66,116 L156,116 L156,130 L151,130 A27,27 0 0 0 124,157 L124,180 Z
```

Rules that hold everywhere: every bar and button end is square except the single rounded end on the right of each bar; every inside corner is a quarter circle; LCARS pieces are separated by 6px of `--bg` (8px between the two header bars). Nav labels in the full header sit bottom-right, LCARS style.

## Desktop sticky header

Once the full header scrolls away, a half-height version pins to the top: same pieces, same left edges, every vertical measurement halved. The page scrolls under an 86px `--bg` band.

| Piece | Geometry |
| --- | --- |
| Orange bar | y 20–44 (24px) |
| Butter bar | y 48–55 (7px), 4px below the orange bar |
| Title | x 170, caps y 20–55, so `cap` = 35 |
| Corners | Same 112px post; outside curve 27px; inside curves 12px (orange) and 14px (butter); butter post ends at y 80 |
| Nav buttons | 108 × 24 at the same x positions |
| Active button | Extends to 35px tall, flush with the butter bar's bottom edge (y 55) |
| Butter bar break | The butter bar stops 6px before the active button and resumes 6px after it |
| Rounded end | 40 × 24, right radius 12px |

The two compact corners as SVG paths:

```
Orange: M12,8 L124,8 A12,12 0 0 0 136,20 L156,20 L156,44 L39,44 A27,27 0 0 1 12,17 Z
Butter: M12,80 L12,75 A27,27 0 0 1 39,48 L156,48 L156,55 L138,55 A14,14 0 0 0 124,69 L124,80 Z
```

**Labels.** In the sticky header, button labels are centred on their capitals within the 24px bar: 16px Antonio with `line-height: 21.5px` gives about 5px above and below the caps. The active label keeps the same size and position as the others; only the button grows. Mark the active button with `aria-current="location"`.

The title sitting across both bars can read slightly low in this compact form. Tune it in the browser; see Open items.

## Section segments and headers

Down the left of the desktop page runs a column of solid blocks, one per section, in that section's dim colour. Each block starts exactly where its section's first line starts and runs to 6px above the next section.

| Element | Spec |
| --- | --- |
| Segment column | x 12–124 (112px), directly under the butter corner, 6px below it |
| Gap between segments | 6px of `--bg` |
| Section content | Starts at x 170 (46px right of the column); 48px right padding, so 970px wide in a 1200px frame |
| Section number | Antonio 400 20px in the bright colour, top-left of the segment: left 8.92px, caps start 16px below the segment top |
| Section rule | 2px `--rule` across the content width, its bottom edge level with the segment top |
| Section name | Antonio 400 20px in the bright colour, same baseline as the number; name only ("WHY"), no number |
| Spacing | 34px from the name row to the section heading; 120px bottom padding per section (64px on the last) |
| Hero (01) | No rule and no name; the 01 segment starts level with the H1 |

Segment order and colours: 01 hero `--hero-dim`, 02 Why `--why-dim`, 03 How `--how-dim`, 04 Try It `--try-dim`. Segment heights follow their section, so build each section as a two-column grid (112px, then content, 46px column gap) rather than drawing the column separately.

## Content components

Content sits on plain black with no boxes around sections; code panels and buttons carry the colour.

| Component | Spec |
| --- | --- |
| Hero | Two columns, 1.05fr / 1fr, 48px gap. Left: H1 "Painless dependency injection for TypeScript.", body (max 36ch), then the button row. Right: the app.ts code panel |
| Primary button | `--frame` pill, 48px tall, 24px radius, padding 0 28px; Antonio 20px, tracking 0.1em, `--bg` text. "GET STARTED" |
| Secondary buttons | Square, 48px tall, section colour (API Reference `--why`, GitHub `--try`); same type as primary |
| Install chip | Three parts, 4px apart, 48px tall: a 40px `--butter` block with "$"; `--panel` block with `npm i hypospray` in JetBrains Mono 15px; a 60px `--butter` COPY button with a 24px right radius |
| Code panel | 28px header bar in the section's dim colour, file name in Antonio 14px (tracking 0.12em) in the bright colour; body `--panel`, padding 20px 22px, JetBrains Mono 14px / 1.7 |
| Panel action | Optional square button at the header's right end, e.g. RUN in `--frame` |
| Before / after | Two code panels side by side, 20px gap (WITHOUT keyed orange, WITH keyed to the section) |
| Benefits | Three columns, 32px gap: Antonio 24px title in a section colour, 18px body |
| Steps (How) | Three columns, 28px gap: Antonio 700 40px numeral in a colour, Antonio 26px title, 18px body, small code panel without a header |
| Closing call to action | "Ready when you are." (Antonio 36px) and a line of body, with Get Started, API Reference and GitHub on the right |

Buttons and nav targets stay at least 44px tall everywhere.

## Phone layout

The phone uses its own frame: a thin-post corner and title bar at the top, a dock of nav buttons pinned to the bottom, and a 3px segmented rule down the left joining them. Coordinates are in a 390px frame with the 8px inset included.

| Piece | Spec |
| --- | --- |
| Header corner | 60 × 56 at (8, 8): 44px bar, 14px post, outside curve 44px, inside curve 12px |
| Title | Caps fill the 44px bar (`cap` = 44, font-size 51.2px); left edge 6px after the corner (x 74) |
| Header bar | From title end to the right edge, 44px, right radius 22px |
| Content | Starts at x 74, lined up with the title |
| Left rule | 3px at x 8, starting 6px below the header corner and ending 6px above the dock corner |
| Rule segments | The rule breaks for 6px at each section boundary and takes that section's dim colour (hero `--hero-dim`, Why `--why-dim`, How `--how-dim`) |
| Section headers | 2px `--rule` across the content width, then the name in Antonio 20px with its number ("02 WHY") |
| Dock corner | 60 × 56 at the bottom-left: 14px post from above, 44px bar, 44px / 12px curves, square bottom |
| Dock buttons | Why, How, Try, Docs: equal widths, 44px tall, 6px gaps, labels bottom-right in Antonio 15px; 22px safe-area padding below |

Corner paths, relative to each corner's own box:

```
Header: M0,44 A44,44 0 0 1 44,0 L60,0 L60,44 L26,44 A12,12 0 0 0 14,56 L0,56 Z
Dock:   M0,12 A44,44 0 0 0 44,56 L60,56 L60,12 L26,12 A12,12 0 0 1 14,0 L0,0 Z
```

**When scrolled:**

1. The header shrinks to a small sticky title: a 60 × 28 corner (20px bar, 20px / 8px curves), title `cap` = 20, bar end radius 10px, over a 46px `--bg` band. Tapping it scrolls to the top.
2. The current section's dock button grows 16px upward (to 60px) and its label goes to 17px.
3. The dock corner shows a back-to-top arrow: a 3px `--bg` stroke with square caps, an arrowhead plus a short tail so it reads as "go up" rather than a menu caret (path `M38,45 L38,25 M31,32 L38,25 L45,32` in the corner's box). The whole 60 × 56 corner is the tap target. At the top of the page the arrow is hidden.

## Implementation notes

These are suggestions from building the canvas versions, not decisions; the open questions are in the next section.

- **Corners as inline SVG, bars as CSS.** Each corner is one path (the paths above), so the curves never overlap or misalign. Straight bars and buttons are plain boxes in a flex row with 6px gaps. The page background showing through the gaps does the LCARS segmenting, so never use borders for it.
- **Tokens as CSS custom properties.** The colour tokens above, plus the bar heights (48 / 14 / 8 desktop, 24 / 7 / 4 sticky, 44 phone) and the title `cap`, so the title-fit formula can be written once with `calc()` against a `--cap` variable.
- **Active section.** An `IntersectionObserver` on each section sets the active nav item: the taller sticky button on desktop, the taller dock button on phone. Smooth-scroll anchor links (`#why`, `#how`, `#try`) with a `scroll-margin-top` equal to the sticky header height (86px desktop, 46px phone).
- **Sticky swap.** Show the compact header once the full header has scrolled out (observe the full header). Respect `prefers-reduced-motion` for any size transition.
- **Breakpoint.** The canvas only shows 1200px and 390px. Tablets get the desktop frame, because the phone layout's real limit is horizontal room for the nav buttons. Switch to the phone frame below about 600px. The full desktop header needs roughly 1,050px, so between 600px and that width use the compact (sticky-size) header at all times and narrow the nav buttons (around 90px each) so the title and all four buttons still fit.
- **Starlight docs.** Reuse the colour tokens, fonts and the header lockup (title in the bar) for the docs theme; the section segments are specific to the landing page.
- **Fonts.** All three families are on Google Fonts; preload Antonio 700 so the title fit is right on first paint.

## Open items

- [ ] Replace the illustrative code (`token`, `container`, `provide`, `resolve`, `fork`) with real Hypospray API examples
- [ ] Fill the footer placeholders: \[LICENSE\], © \[YEAR\] \[AUTHOR\], STARDATE \[AUTO\]
- [ ] Tune the sticky header title so it reads vertically centred against the compact bars
- [ ] Section numbers on their dim segments measure about 3.2–3.7:1 contrast, below the 4.5:1 normal-text guideline; check whether 20px counts as large enough, or brighten the numbers
- [ ] Confirm the 600px phone breakpoint and check the compact desktop header at tablet widths (768–1,050px)
- [ ] Decide whether the Try It playground becomes a live editor (Monaco or similar) or stays static
- [ ] Phone section headers show the number with the name ("02 WHY"); desktop shows the name only. Confirm that difference is intended
