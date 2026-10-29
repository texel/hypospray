# Why page: from scratch page to docs

The long-form Why explainer moved from `/scratch/why` into the docs, at `/docs/why/` ("Start here
→ Why Hypospray"). A shorter, punchier Why section for the homepage will borrow pieces and
images from it. That's the next step and hasn't started.

## What moved where

- Page: `site/src/content/docs/docs/why.mdx`. The prose is unchanged from the scratch page.
- Components: `site/src/components/why/` (from `components/scratch/`). `WhyLayout.astro` is gone.
  `WhyPage.astro` replaces it, placed once at the top of the MDX. It holds the colour key and
  legend, the page-only layout, step anchors and the folding table of contents.
- Diagram colours are tokens in `components/why/diagram.css`, set to the site's dark palette.
  Purple is the WHY lilac, blue the HOW periwinkle, orange the frame orange.
- Code inside diagrams uses the same `lcars` theme as the docs' code blocks
  (`site/src/lib/lcars-theme.mjs`, shared with `ec.config.mjs`).

## Layout

- The content column is widened to 68rem for this page only. Prose, headings and code blocks keep
  a 45rem measure, and diagrams and steppers use the full width.
- The table of contents takes only a rail. It overlays the content when open: open at the top of
  the page on screens 90rem and wider, folded once you scroll past 160px (or always, below 90rem),
  and open again on hover or focus.
- Steppers switch to side-by-side with a container query (760px of their own width), not a
  viewport one. Their sticky stage centres in the space below the docs header.

## Next

- Homepage Why section: decide which beats and images it borrows. The existing `WhyStory` is the
  starting point.
- Still lo-fi: the high-fidelity pass on the diagrams is deferred.

## Open questions (moved from the scratch page)

- Every service in the example reaches down to config, so the lazy steps in beat 5 build the
  longest chain first and later steps mostly reuse it. Fine for now; a shallower service (one with
  no dependencies) would make "only what's needed" land harder.
- `inject()` in components is fine for setup code (or inject the injector and keep it). Update the
  component examples once the framework adapters settle.
- Six beats now (old 1 and 2 merged). Could 3 and 4 (pass it in, context) merge too?
- Sticky graph vs. one diagram per beat: decide once the story works.
- Beat 1's service files show `const http` with no `export`, so it may not read as something you
  can import. Adding `export` makes every line longer and every box wider. Revisit.
