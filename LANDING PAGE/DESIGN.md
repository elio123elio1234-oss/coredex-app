---
name: CYPHIX Landing
description: A product studio in the one-pager's colours. The team's own 3D model leads on a cool light sheet; one dark stage closes the page with "One strap. Any watch."
colors:
  red: "#c7362c"
  red-deep: "#a92b22"
  coral: "#f2574c"
  ink: "#0b1a30"
  ink-lift: "#17305a"
  ink-2: "#33415a"
  ink-3: "#52627b"
  ground: "#f1f3f6"
  ground-2: "#e8ecf1"
  paper: "#ffffff"
  hair: "rgba(11, 26, 48, 0.12)"
  hair-2: "rgba(11, 26, 48, 0.07)"
  wash-blue: "#7aa0de"
  stage: "#0a0d13"
  stage-floor: "#111725"
  stage-text: "#eef1f6"
  bar-dark: "rgba(10, 13, 19, 0.74)"
typography:
  display-hero:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(44px, min(5vw, 9.4vh), 76px)"
    fontWeight: 550
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  display-stage:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(40px, 5vw, 72px)"
    fontWeight: 550
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  statement:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(36px, 4.6vw, 64px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.038em"
  figure-ask:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(60px, 7vw, 104px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\" 1"
  figure:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(32px, 3.4vw, 50px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(32px, 3.7vw, 52px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.032em"
  title:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(22px, 2vw, 28px)"
    fontWeight: 500
    lineHeight: 1.22
    letterSpacing: "-0.02em"
  callout:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15.5px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(17px, 1.3vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  button:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15.5px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.005em"
  caption:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.14em"
rounded:
  focus: "8px"
  field: "14px"
  surface: "20px"
  panel: "28px"
  pill: "999px"
spacing:
  bar: "72px"
  bar-phone: "64px"
  gutter: "clamp(20px, 4vw, 48px)"
  wrap: "1200px"
  section: "clamp(104px, 11vw, 168px)"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 22px 0 26px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.red-deep}"
    textColor: "{colors.paper}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 15px 0 18px"
    height: "40px"
  button-ink-hover:
    backgroundColor: "{colors.ink-lift}"
    textColor: "{colors.paper}"
  button-ink-on-stage:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    height: "40px"
  button-link:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "14px 4px"
  bar-dark:
    backgroundColor: "{colors.bar-dark}"
    textColor: "{colors.paper}"
    height: "72px"
  input-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  input-field-focus:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
  form-panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "clamp(24px, 3.4vw, 44px)"
  compare-column-us:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "20px 24px"
  stage:
    backgroundColor: "{colors.stage}"
    textColor: "{colors.stage-text}"
    typography: "{typography.display-stage}"
  build-badge:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
---

# Design System: CYPHIX Landing

## Overview

**Creative North Star: "The Product Studio"**

The investor one-pager's colours, set as a serious medtech company's homepage, with the team's own 3D model doing the selling. Every product image on the page comes out of one studio: the same GLB (public/models/cyphix.glb), the same softbox environment, the same named materials, the same contact shadow. A reader sees one physical object photographed consistently, never a mix of concept art and screenshots of a different product.

Two grounds hold the page. The cool light sheet carries every section from the bar to the footer: navy ink for words, slate for support, hairlines for structure, coral and red kept on a short leash. One dark stage, a deep blue-black with a cool wash and a faint coral floor, belongs to the closing "One strap. Any watch." scene alone; there the aluminium and steel catch a cool rim light and the bar turns dark with it.

Motion comes in exactly two kinds. The hero arrives once on load and then holds still. The closing scene is scrubbed by scroll, with nothing running on a timer: the strap turns, the smartwatch unclips and rises out, the strap holds alone, the analog watch comes down and clicks in. Reduced motion or no WebGL replaces the scene with three stills. Everything else on the page is still apart from small hover feedback.

**Key Characteristics:**
- One product studio: every render comes from the team's 3D model, in the same environment, materials and contact shadow, and says so in its caption.
- Two grounds: the cool light sheet for every section, one dark stage for the closing scene only.
- A split hero: copy left, the three-quarter render right on a white studio glow; the two-line headline never wraps.
- Leader-line callouts on the module close-up: 1px ink line, coral dot with a white ring.
- Navy ink type in Sora 400 to 600, display at 550; Geist Mono only on data labels and the build badge.
- Coral as text only for "Wearable Ease." and "1 in 3"; red for the wordmark, the action, the ask and errors.
- Two kinds of motion: one load arrival, one scroll-scrubbed scene.

## Colors

A cool, near-monochrome navy-on-grey sheet with two warm accents rationed by name, plus one dark stage for the closing scene.

### Primary
- **Wordmark Red** (red): the CYPHIX wordmark in bar, comparison header and footer; the "Request the deck" primary pill; the $1.9M ask figure; the TAM/SAM chart marker rings; form error text and invalid-field borders; the Cyphix label on the phone comparison cells. It means "this is us, and this is the action".
- **Pressed Red** (red-deep): primary pill hover only.

### Secondary
- **Electrode Coral** (coral): as type, exactly two phrases: the hero's second line "Wearable Ease." and "1 in 3" in the need statement. As marks: callout dots, the active step bar on the dark stage, the focus ring, the caret, the selection tint (22% alpha), the TAM/SAM circle fills (7% to 26% alpha), the ring on the next milestone dot, and the stage's floor wash (8% alpha).

### Neutral
- **Cool Sheet** (ground): the page itself, the frosted light bar after scroll (88% alpha), the resting fill of form fields.
- **Sheet Shadow** (ground-2): placeholder fill behind team portraits.
- **White Surface** (paper): the comparison's Cyphix column, the form panel, a focused field, the hero's studio glow (95% alpha radial), the bar's pill over the dark stage.
- **Navy Ink** (ink): headlines, table row heads, callout lines, the "yes" marks, milestone line and dots, the light bar's pill.
- **Lifted Navy** (ink-lift): ink pill hover.
- **Slate** (ink-2): body copy, ledes, nav links, table cells, callout subs, market descriptions.
- **Quiet Slate** (ink-3): captions, field hints, mono labels, the build badge, footer column heads, the legal note.
- **Hairline** (hair) and **Faint Hairline** (hair-2): every rule on the light sheet.
- **Wash Blue** (wash-blue): only as a radial wash at 13% to 16% alpha: top-right of the hero, behind the form, and around the product on the dark stage. Never a fill, never text.

### The Dark Stage
- **Stage Black** (stage) to **Stage Floor** (stage-floor): the closing scene's vertical gradient, with a wash-blue radial (16%) around the product and a coral radial (8%) rising from the floor. The reduced-motion stills sit on the same gradient without the washes.
- **Stage Text** (stage-text): the stage's base text; titles are pure white. Secondary greys on the stage are component values (see Components: Dark Stage).
- **Dark Bar** (bar-dark): the bar's frosted fill while it sits over the stage.

### Named Rules
**The Two Phrases Rule.** Coral is a text colour for "Wearable Ease." and "1 in 3" and nothing else. Every other coral is a mark (dot, ring, bar, circle, focus, caret, wash), never a word.

**The Red Means Us Rule.** Red is the wordmark, the primary action, the ask and errors. A red word that is not one of those is a mistake.

**The One Stage Rule.** The light sheet holds every section. The dark stage exists once, for the closing "One strap. Any watch." scene; a second dark section breaks the page's single change of light.

## Typography

**Display Font:** Sora (variable, self-hosted, with ui-sans-serif / system-ui fallback)
**Body Font:** Sora
**Label/Mono Font:** Geist Mono (variable, self-hosted, with ui-monospace fallback)

**Character:** One geometric grotesk does everything, from the 76px headline to 12.5px legal type, carried by weight and tight tracking rather than a second family. Geist Mono is a whisper on data labels only.

### Hierarchy
- **Display (hero)** (550, clamp(44px, min(5vw, 9.4vh), 76px), 1.02, -0.04em): "Clinical Depth. / Wearable Ease." only, two masked lines that never wrap. On phones clamp(40px, 11.6vw, 56px).
- **Display (stage)** (550, clamp(40px, 5vw, 72px), 1.02, -0.04em, white): the closing scene's step titles and the stills' title.
- **Statement** (500, clamp(36px, 4.6vw, 64px), 1.04, -0.038em): the need section's opening line, max 12em.
- **Figures** (600, tabular numerals, -0.04em): the ask at clamp(60px, 7vw, 104px) in red; TAM/SAM values at clamp(32px, 3.4vw, 50px) in ink.
- **Headline** (500, clamp(32px, 3.7vw, 52px), 1.08, -0.032em): every section title.
- **Title** (500, clamp(22px, 2vw, 28px), 1.22): sub-heads inside a section.
- **Callout** (600, 15.5px, -0.01em): part names on the module close-up, over a 400 slate sub-line.
- **Body large** (400, clamp(17px, 1.3vw, 19px), 1.6, slate, max 34em): section ledes; the hero lede and stage text use the same clamp from 16.5px.
- **Body** (400, 16px, 1.65, slate, max 36em): running copy.
- **Caption** (400, 13px, 1.5, quiet slate): figure captions.
- **Label** (Geist Mono 400, 11.5px, 0.14em, uppercase, quiet slate): TAM, SAM and Seed ask only.

Secondary sizes outside the ramp, kept as component values: 14px (small pill, comparison header), 14.5px (nav links, callout subs), 18px (team names), 26px (the form's sent heading).

### Named Rules
**The Mono Whisper Rule.** Geist Mono is used for exactly two jobs: the TAM / SAM / Seed ask labels and the build badge. It never sits above a heading as a kicker.

**The Tracking Floor Rule.** Display sizes track tight but never tighter than -0.04em.

## Layout

A centred 1200px column with a fluid gutter (clamp(20px, 4vw, 48px)); sections separated by clamp(104px, 11vw, 168px) of top padding. The fixed 72px bar (64px on phones) is transparent over the hero, frosts to the cool sheet once the page moves, and turns dark over the stage.

The hero is a two-column split (1 : 1) filling the first viewport: copy on the left (headline, lede at max 31em, red pill plus "See it on any watch" link), the three-quarter render on the right at min(100svh minus bar minus 150px, 720px) tall, on a white radial studio glow centred at 72% / 52%, captioned beneath. The render is fully visible above the fold at 1440 by 900 and 1280 by 720.

Below the hero, sections alternate between a two-column head (headline left, lede right, bottom-aligned) and a centred head (product). Evidence sits in grids: the comparison table (34% feature column), the module close-up in a 1234 by 764 frame (max 980px) with the render in its middle 54.62% and room for labels either side, the app row (1.3 : 1), the five-step milestone line, a 1.75 : 1 market band, a two-up team grid, a 0.9 : 1.1 contact grid.

The closing scene is a 400vh section with a sticky 100svh stage. On wide stages (aspect at or above 1.15) the product sits right of centre at about 72% of the stage height beside the copy on the left; on tall stages the copy sits at the top under the bar and the product below at about 80% of the width. The step indicator is centred at the bottom.

Tablet (max-width 1023px): heads and the need lead stack; the hero stacks with the render at min(60vh, 560px); the module close-up narrows to 420px and its callouts become a three-column legend; milestones go three across; the market band stacks; the stage copy moves to the top; the footer goes two-up.

Phone (max-width 719px): the nav hides and the pill moves right; the hero render goes full width (max 460px tall); the comparison becomes one block per capability; the legend and the stills go one column; milestones turn vertical; market circles shrink to 120px beside their rows.

## Elevation & Depth

Mostly flat and tonal on the light sheet; physical depth belongs to the product. White surfaces sit on the cool sheet, navy-tinted ambient shadows sit under physical things, and the renders carry their own studio contact shadow. No hard shadows, no stacked cards.

### Shadow Vocabulary
- **Primary glow** (`box-shadow: 0 12px 24px -14px rgba(199, 54, 44, 0.75)`, hover `0 16px 28px -14px rgba(199, 54, 44, 0.85)`): under the red pill only.
- **Panel lift** (`box-shadow: 0 1px 2px rgba(11, 26, 48, 0.04), 0 32px 64px -32px rgba(11, 26, 48, 0.26)`): the form panel.
- **Device drop** (`filter: drop-shadow(0 30px 40px rgba(11, 26, 48, 0.18))`): the app screenshot.
- **Studio contact shadow** (rendered, not CSS): a height-limited, blurred depth shadow under the product on light plates (3.5cm capture height, plane raised 12mm into the footprint), baked into every light render.
- **Market floor** (radial ellipse, rgba(11, 26, 48, 0.14) to transparent): under the market circles.
- **Callout dot** (`filter: drop-shadow(0 2px 3px rgba(11, 26, 48, 0.3))`, with a 2px white stroke): lifts each coral dot off the render.
- **Field focus** (`box-shadow: 0 0 0 4px rgba(11, 26, 48, 0.08)`): a soft ink halo on a focused input.
- **Bar edge** (`box-shadow: 0 1px 0` hair-2 on light, `rgba(255, 255, 255, 0.07)` on the stage): the scrolled bar's bottom hairline.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px navy hairlines at 12% or 7%; a container earns a white surface only when it is the answer (the Cyphix column) or the action (the form).

**The One Studio Rule.** Every product image is rendered from public/models/cyphix.glb through src/lib/studio.ts: the softbox environment, the named PBR materials, the wordmark screen and dial, and the contact shadow. A product image from anywhere else (generated art, a different model, a flat concept render) does not belong on this page.

## Shapes

Round where the hand touches, square where the reader scans. Pills (999px) for buttons and the build badge. Surfaces softly rounded: the form panel at 28px, the comparison's Cyphix column and team portraits at 20px, fields and phone comparison cells at 14px. Marks are circles: yes/no marks (24px), milestone dots (14px), callout dots, market circles. The stage's step bars are 2px with 2px ends. Rules and table rows stay square. Focus outlines take 8px. Minor radii kept as component values: the brand link's focus at 6px and the scrollbar thumb at 11px.

## Components

### Buttons
Confident, round, and few.
- **Shape:** full pill (999px), 52px tall; the bar's small variant is 40px at 14px.
- **Primary:** red fill, white Sora 500 at 15.5px, trailing arrow, primary glow. "Request the deck" in the hero, after the ask, and on the form submit.
- **Ink:** navy fill, white text: the bar's compact "Request the deck". Over the dark stage it inverts to a white pill with ink text (hover #e4e8ef).
- **Hover / Focus:** fill darkens over 0.25s, the arrow slides 3px; active nudges down 1px; focus is the global 2px coral outline at 3px offset.
- **Link:** unboxed ink text with a down arrow ("See it on any watch") that slides down 3px on hover.

### Cards / Containers
- **Corner Style:** 28px for the form panel; 20px for the comparison column.
- **Background:** white on the cool sheet.
- **Shadow Strategy:** panel lift on the form only; the comparison column is flat.
- **Border:** none; inner rows use the faint hairline.
- **Internal Padding:** clamp(24px, 3.4vw, 44px) for the panel; 20px by 24px table cells.

### Inputs / Fields
- **Style:** cool-sheet fill, transparent 1px border, 14px radius, 14px by 16px padding, Sora 16px, coral caret. Labels above in Sora 500 at 13.5px slate with quiet "optional" hints. Hover deepens the fill to #eaedf2.
- **Focus:** fill turns white, border turns navy, soft 4px navy halo; no outline.
- **Error / Disabled:** red border on #fff6f5, red message text; a disabled submit drops to 60% opacity with a progress cursor.

### Navigation
The bar: red wordmark left (18px, 16px on phones), then Product · Stage · Market · Team in slate 14.5px with a 1px underline that wipes in from the left, then the ink pill. Transparent at rest, frosted cool sheet with a faint hairline once scrolled. While its midline is over the dark stage it turns dark: dark bar fill, nav links #b7c0cf hovering to white, the white pill. On phones the links hide.

### Product Render (the studio)
Every product image is the GLB dressed by the shared studio:
- **Environment:** a dark cyclorama baked to PMREM with an overhead softbox, a tall key strip front-left, a cool rim strip back-right, a back-left kicker, a low warm bounce and a front-high fill, so polished metal shows long crisp highlights. Light plates use the lighter wall; the dark stage uses the darker wall plus a white key and a cool (#cfe0ff) rim light, ACES filmic tone mapping at exposure 1.0.
- **Materials:** slate silicone strap with sheen and an object-space moulded grain; clearcoated aluminium case; satin brushed-titanium module; bright polished steel electrodes with a full clearcoat; clearcoat glass over the screen; polished steel and dark-steel hands on the analog. Exact values live in the sidecar.
- **Faces:** the real CYPHIX wordmark on the watch screen; the analog has a warm white dial with baton indices (double at 12), a minute track and a small seconds sub-dial.
- **Assembly:** the lug adapters belong to the strap, so the strap alone has finished ends and any watch clips into them.
- **Light plates:** the height-limited contact shadow, with an ambient-occlusion pass, on a transparent background over the white studio glow.
- **Caption:** every render is labelled "Concept rendering from the Cyphix 3D model" (13px quiet slate), and the footer's small print says product images are concept renderings from the 3D model.

### Leader-Line Callout (module close-up)
A 1px ink line (non-scaling stroke) runs horizontally from a part of the render to a label outside it, starting at a 6px-radius coral dot with a 2px white ring and the callout-dot shadow. The label is a Sora 600 title at 15.5px over a 14.5px slate sub. Dots are projected from the 3D model into the render's coordinates, so they stay on the product at every width. Below 1024px the lines and labels give way to a legend under the image, each item over a top hairline.

### Dark Stage ("One strap. Any watch.")
The signature. A sticky stage on the stage gradient renders the GLB live in WebGL, loaded lazily as the section nears. Scroll progress drives a monotone-cubic turn (no stutter at keys): the strap turns to show the electrodes and returns to three-quarter (0 to 0.44), the smartwatch unclips (0.44 to 0.48) and rises out of frame opaque (0.47 to 0.56), the strap holds alone (0.56 to 0.66), the analog comes down (0.66 to 0.76) and clicks into the same adapters (0.76 to 0.80), then holds. A cool additive pool of light sits on the floor under the product. Copy windows run back to back ("It lives in the strap." / "One strap." / "Any watch.") with 0.02 fades and a 14px rise, so one line always holds the stage. Step text is #b7c0cf; the three-step indicator at the bottom is 13px #6f7a8c over 2px bars at 14% white, and the active step turns white over a coral bar. The note "Rendered live from the Cyphix 3D model · concept" sits bottom-right at 12.5px #6f7a8c (hidden below 1024px). A thin spinner shows only while the model loads. Reduced motion or no WebGL renders the same three states as stills in a three-up row (one column on phones), each labelled in Sora 600 at 15px.

### Comparison Table
Three answers against a feature column. Rows are hairlines; the Cyphix column is a white rounded surface with the red wordmark as header. Answers pair a 24px round mark (navy with a white check for yes, a hairline ring with a dash for no) with short ink text. On phones each row becomes the question over three labelled cells.

### Milestone Line
A 2px ink line with 14px ink dots for done steps, fading to a hairline into the last step, whose dot is hollow with a coral ring. Horizontal five-up on desktop, vertical on phones.

### Build Badge
A hairline pill in the footer with the version in Geist Mono 11px, 0.06em, quiet slate.

### Named Rules
**The Two Motions Rule.** Motion has exactly two kinds. The hero arrives once on load with cubic-bezier(0.16, 1, 0.3, 1): headline lines rise from their masks (1.1s, second line +0.09s), lede and actions fade up (0.9s at 0.22s and 0.32s), the product settles from 24px below at 98% scale (1.5s at 0.25s), the caption fades in at 0.8s. The closing scene is scrubbed by scroll only, nothing on a timer, a frame drawn only when progress or size changes. Both sit behind prefers-reduced-motion. Everything else moves only as hover feedback.

**The Opaque Exit Rule.** In the closing scene the watches move physically and stay opaque: they unclip, rise and come down. They never fade, dissolve or cross-fade.

## Do's and Don'ts

### Do:
- **Do** render every product image from public/models/cyphix.glb through the shared studio (src/lib/studio.ts) and caption it "Concept rendering from the Cyphix 3D model".
- **Do** keep every section on the cool sheet (ground) and lift only the Cyphix comparison column and the form onto white (paper).
- **Do** keep the dark stage for the closing "One strap. Any watch." scene alone, and turn the bar dark only over it.
- **Do** use red for the wordmark, the primary "Request the deck" pill, the ask figure and errors, and coral as text only for "Wearable Ease." and "1 in 3".
- **Do** annotate the module close-up with leader-line callouts: 1px ink line, coral dot with a white ring, Sora 600 title over a slate sub; a legend below 1024px.
- **Do** separate content with 1px hairlines (hair, hair-2) and let section padding, not boxes, make the rhythm.
- **Do** set display type in Sora 550 and headlines in Sora 500, tracking between -0.02em and -0.04em, body copy slate at 16px to 19px.
- **Do** restrict Geist Mono to the TAM, SAM and Seed ask labels and the build badge.
- **Do** give every scroll-driven scene a still fallback for reduced motion and missing WebGL.

### Don't:
- **Don't** add motion beyond the hero's one arrival and the closing scene's scroll scrub: no timers, no autoplay, no scroll-linked reveals on other sections.
- **Don't** simulate a live signal: no sweeping or animated ECG traces anywhere on the page.
- **Don't** fade the watches out in the closing scene; they leave and arrive physically, opaque.
- **Don't** use generated imagery or flat concept art for the product.
- **Don't** put Geist Mono or an uppercase label above a headline as a kicker.
- **Don't** use coral for any word beyond the two phrases, or red for anything beyond the wordmark, the action, the ask and errors.
- **Don't** wrap sections in bordered or shadowed cards; the form panel is the only lifted surface.
- **Don't** track display type tighter than -0.04em.

<!-- v0.8.0 — design system re-derived from the 3D-model build (index.css :root and rules, studio.ts, strapScene.ts, OneStrap/Hero/Product/Header, render provenance sidecars, review captures) by the Impeccable documenter; supersedes v0.7.0 -->
