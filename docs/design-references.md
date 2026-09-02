# Design references

Notes distilled from reference images the user shared while briefing the Shelfmark
A+ Content generator. The original image files were pasted inline in chat and are not
available as on-disk assets, so this file captures the design takeaways in writing —
these are what actually got baked into the generator's visual styles.

## Batch 1 — Omega-3 "Bio Care" supplement listing

- Bold navy headline + orange/amber accent word, set on white.
- Product bottle floats with a soft shadow and a pale color-blob behind it.
- Feature call-outs as rounded-square icon badges in a row; sometimes connected to the
  product photo with a thin leader line pointing at the part they describe.
- Numbered "how to use" steps module.
- The same module rhythm (headline + icon-badge row + product shot) reused across
  several modules with different content — reads as strong brand consistency.
- The hero shot decoratively used Amazon's own arrow/smile mark — **not reproduced**,
  since seller-uploaded A+ Content using Amazon's own logo isn't allowed.

## Batch 1 — "Elements" adaptogen gummies (portfolio case-study framing)

- Rounded geometric wordmark, sage/mint ground, mostly white modules elsewhere.
- Mixes real product photography, glossy 3D renders, and dark "data-card" modules
  (a supplement-facts-style table; a checklist-style "us vs them" comparison card).
- A customer-quotes module used invented-looking names — **not reproduced**: the
  generator never fabricates reviewer names or quotes; a real testimonials module
  needs quotes the seller actually supplies.

## Batch 2 — "Elements" gummies, annotated (IMG2/IMG3/IMG6/IMG7)

- Benefits-highlight card: tilted product shot + a short bullet list of benefits,
  each bullet naming the specific ingredient behind it.
- Ingredient-spotlight card: a 2x2 grid of named ingredients, each with a one-line
  functional benefit — a clean pattern for feature/spec modules.
- "So, what makes us unique?" comparison card: a checklist-style table (rows =
  attributes, columns = this product vs. generic alternatives) rendered as a dark
  card rather than a plain HTML table — used as the model for the generator's
  comparison module.
- Lifestyle module: product in a real bedside/routine scene, headline overlaid.

## Batch 2 — "BriteLune" tumbler listing

- Big two-tone headline ("Temperature Control") over a hero product shot.
- Spec badges in a row (30 HRS COLD / 12 HRS HOT / Leakproof / BPA-Free) — short
  label + icon, no long copy.
- A cutaway/cross-section diagram module ("Triple Layer Insulation") numbering each
  layer 1/2/3 next to a labeled illustration — informed the generator's "Numbered
  Callouts" style (bullets numbered 1..n, matching numbered badges near the photo,
  rather than claiming to point at exact pixel locations on an arbitrary seller photo).

## Batch 3 — uploaded reference pack (`docs/inspiration/ref-01..07`)

Actual image files this time, saved to `docs/inspiration/`.

- **ref-01, Fancy Line rolling pin** — polaroid-style photo collage in the brand-story
  module; an annotated **dimension diagram** (tick-marked lines with inch labels
  either side of the product) for a size/spec module; icon-badge rows; a faded
  ghost-model photo behind a translucent 2x2 benefit grid.
- **ref-02, Mane Tame shaver** — dark, condensed display type on a diagonal
  two-tone banner; circular icon badges for specs (warranty/runtime/motor);
  a 4-up feature strip pairing one icon+label with one product close-up each;
  a "how it connects" module (product + accessory joined by a bolt icon); a
  comparison table across the brand's **own product line**, not a competitor.
- **ref-03, three listings (cloud socks / avocado oil / teeth whitening)** —
  dotted leader-lines from a cross-section product shot to labeled nutrient
  callouts (reinforces the numbered-callout idea); a big stat/percentage
  callout ("whitens up to 10 shades in 7 days", "35%" in a ring); before/after
  photo pairs; star-rated testimonial cards (fabrication risk — not reproduced).
- **ref-04, thumbnail grid of real listings** — cross-brand confirmation of the
  banner + icon-badge + comparison-table formula; one (`bulk`) goes dark,
  editorial, and video-poster-led instead of white/friendly.
- **ref-05, PrimeSelf hydration sachets** — organic **wavy blob-shaped section
  dividers** instead of hard rectangles; paired "what's in it" / "what isn't
  it" (positive and negative claims) lists; small circular icon rows.
- **ref-06, Cowboy Boots (an actual agency A+ Content case study)** — shows its
  own brief and process slides; cinematic full-bleed hero with a cutout
  product; diagonal photo-split compositions; and, notably, presents the
  mobile version inside an actual **phone-frame mockup** rather than a bare
  narrow column.
- **ref-07, Pedigree dog food** — bold claim tiles in brand colors, each a
  short label + icon; a life-stage x flavor variant-comparison table.

## What this became in the app

Content generation (copy, module choice) stays a separate concern from visual
presentation. The AI writes module content once; the user can then flip between
four presentation "styles" for free, no new AI call:

- **Smooth Flow** — one continuous scrolling page (classic storytelling layout).
- **Broken Cards** — each module as its own standalone tile, closest to how a
  seller actually uploads one image per module in Amazon's A+ Content Manager.
- **Bento Grid** — every module tiled into one at-a-glance dashboard.
- **Numbered Callouts** — feature bullets get numbered badges, echoed as numbered
  dots near the product photo (order-matched, not pixel-position-matched).
