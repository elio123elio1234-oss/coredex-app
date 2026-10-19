---
name: CYPHIX Landing
description: The one-pager at web scale. A cool off-white sheet, navy ink, coral light, and one dark display that holds six live leads.
colors:
  red: "#c7362c"
  red-deep: "#a92b22"
  coral: "#f2574c"
  ink-lift: "#17305a"
  ground: "#f1f3f6"
  ground-2: "#e7ebf1"
  paper: "#ffffff"
  ink: "#0b1a30"
  ink-2: "#33415a"
  ink-3: "#52627b"
  hair: "rgba(11, 26, 48, 0.13)"
  hair-2: "rgba(11, 26, 48, 0.07)"
  display: "#0e1116"
  display-text: "#b9c2cf"
  display-muted: "#8a95a7"
  trace-salmon: "#ff8c7c"
  trace-peach: "#f8b07a"
  trace-butter: "#eed37f"
  trace-mint: "#9ee0bd"
  trace-sky: "#8dcff1"
  trace-lavender: "#bca7f6"
  trace-quiet: "#9aa6b8"
  wash-blue: "#7aa0de"
typography:
  display-hero:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(40px, min(6.2vw, 11vh), 96px)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  display:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(36px, 5vw, 68px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  figure:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(64px, 7.6vw, 116px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.045em"
    fontFeature: "\"tnum\" 1"
  headline:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(26px, 3vw, 40px)"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  statement:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(18px, 1.6vw, 24px)"
    fontWeight: 500
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body-lg:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  small:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15.5px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.005em"
  label:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "11.5px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.12em"
rounded:
  pill: "999px"
  display: "40px"
  display-compact: "26px"
  figure: "32px"
  panel: "28px"
  photo: "20px"
  field: "14px"
  focus: "8px"
  tag: "6px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  section: "clamp(112px, 13vw, 196px)"
  wrap: "1200px"
  display-inset: "16px"
  display-pad: "32px"
  column: "48px"
  stack: "24px"
  field: "18px"
components:
  button-primary:
    backgroundColor: "{colors.red}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 22px 0 24px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.red-deep}"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 15px 0 18px"
    height: "40px"
  button-ink-hover:
    backgroundColor: "{colors.ink-lift}"
  button-link:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "12px 2px"
  nav-link:
    textColor: "{colors.ink-2}"
    padding: "8px 0"
  nav-link-hover:
    textColor: "{colors.ink}"
  input-field:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  input-field-focus:
    backgroundColor: "{colors.paper}"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "clamp(24px, 3.4vw, 44px)"
  figure-tile:
    backgroundColor: "{colors.ground-2}"
    rounded: "{rounded.figure}"
    padding: "clamp(28px, 4vw, 56px) clamp(16px, 4vw, 56px) 60px"
  display-screen:
    backgroundColor: "{colors.display}"
    textColor: "{colors.paper}"
    rounded: "{rounded.display}"
    padding: "{spacing.display-pad}"
  caption:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
  badge:
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  portrait:
    backgroundColor: "{colors.ground-2}"
    rounded: "{rounded.photo}"
    width: "clamp(104px, 9vw, 136px)"
---

# Design System: CYPHIX Landing

## Overview

**Creative North Star: "The One-Pager, at Web Scale"**

The page is the PDF one-pager grown to a screen: a cool off-white sheet lit by two soft washes of coral and blue, navy ink set in Sora, hairline rules, pill buttons, and concept renders annotated with leader-line callouts. It reads as the same company as the PDF and the deck. Density is low and deliberate. Each section makes one claim and puts its evidence beside it, and the white space is the one-pager's margin at a larger size.

Against that light sheet there is exactly one dark object: the CYPHIX display. The visitor lands inside it, six limb leads sweeping in their pastel render colours, and scrolls out until it is the screen of the watch. Everything else on the page is drawn, not filled: lines write themselves, strike-throughs strike, and the stage timeline draws its own track. The motion grammar is exponential ease-out from visible defaults, and every animated element has a still, legible reduced-motion form.

The system is clinical without being cold. Coral marks what is live, red marks the brand and the one action, and mono type marks what is measured. It refuses decoration that the one-pager does not carry: no dark sections, no card grids, no eyebrows over headings, no glyph icons.

**Key Characteristics:**
- One cool light ground (#f1f3f6) with radial coral and blue light washes; no section changes the ground colour.
- One dark object, the display (#0e1116), which carries the only saturated multi-colour on the page: the six trace pastels.
- Sora 400 to 600 for everything set; Geist Mono only for leads, measurements, captions and figure labels.
- Hairlines separate, pills act, generous radii (20 to 40px) hold figures and the one panel.
- Lines draw in (scaleX, clip-path, pen sweep) on exponential ease-out; nothing bounces.
- Every trace is labelled illustrative and every render a concept rendering, within sight of it.

## Colors

A cool, low-chroma navy-and-paper palette with two warm voices, coral for life and red for action, and a sealed set of six pastels that live only on the display.

### Primary
- **Wordmark Red** (`red`): the CYPHIX wordmark in the bar and footer, the primary "Request the deck" button, the $1.9M seed-ask figure, the "Next step" milestone label, the ring of the market dots, the contact check, and form errors and invalid borders. White on it holds 5.3:1; on the ground it holds 4.7:1.
- **Pressed Red** (`red-deep`): the primary button's hover. Nowhere else.

### Secondary
- **Live Coral** (`coral`): what is live or moving. The recording dot, the trace pen's glow, the 2px focus outline, the form caret, the scroll-progress hairline under the bar, the nav underline, every strike-through, callout and next-milestone dots, the contact icons, and the words "Wearable Ease.", "1 in 3" and "and". At low alpha it is the page's warm light: radial washes at 7 to 10%, the market circles at 8 to 30% fill with 32 to 42% borders, the Lead II strip's 16px graph-paper grid at 7.5%, and text selection at 24% (45% on the display).

### Tertiary
- **The Render's Six** (`trace-salmon`, `trace-peach`, `trace-butter`, `trace-mint`, `trace-sky`, `trace-lavender`): one per limb lead, in the fixed order I, II, III, aVR, aVL, aVF, taken from the watch render's own screen. Used for the trace strokes, the pen-head glow and the mono lead labels, and nowhere outside the display.
- **Blue Light** (`wash-blue`): never solid. Radial washes at 14 to 16% (top-right of the hero stage, behind the contact form) that cool the ground opposite the coral light.

### Neutral
- **Cool Sheet** (`ground`): the page ground, the bar once the page moves (at 95% with a 14px blur), the input fill, and the hollow centre of pending milestone dots.
- **Mist** (`ground-2`): the portrait well and the figure tile's gradient (the tile itself is set as #e6eaf0 fading to Mist at 35%).
- **Paper White** (`paper`): the contact panel, a focused input, white text on red, navy and the display, and the 2px ring around callout dots.
- **Navy Ink** (`ink`): headings, body emphasis, callout leader lines, the done-milestone dots and the drawn timeline, focused-input border, and the bar's "Request the deck" pill. White on it holds 17.4:1.
- **Lifted Navy** (`ink-lift`): the navy pill's hover.
- **Slate** (`ink-2`): body-large copy, nav links, form labels, person roles (9.2:1 on the ground).
- **Pale Slate** (`ink-3`): captions, figure descriptions, the struck "left out" list, small print, the badge (5.6:1 on the ground; the floor for any text on the light sheet).
- **Hairline** (`hair`) and **Faint Hairline** (`hair-2`): 1px rules. Hairline draws the bands (team, market, ask, footer, timeline track, badge border); Faint Hairline draws the quieter ones (the Lead II strip, the bar's moved-state rule).
- **Display Black** (`display`): the display, and only the display.
- **Screen Grey** (`display-text`) and **Screen Dim** (`display-muted`): text on the display. The lede is Screen Grey (10.5:1), the mono meta Screen Dim (6.3:1); the "6-lead ECG" sub sits between at #a2acbb and the light "See the device" link above at #d5dce6, turning white on hover.
- **Quiet Trace** (`trace-quiet`): the only trace colour allowed on the light ground (the Lead II strip).

### Named Rules
**The One Dark Object Rule.** Display Black belongs to the display alone, at hero scale and at watch scale. No section, band, card, panel or footer goes dark.

**The Red Means Act Rule.** Red is the wordmark, the primary action, the ask, "Next step" and errors. Nothing decorative is red.

**The Coral Is Alive Rule.** Coral marks what is live or what changes. As text it appears only at display size (34px and up) on the light ground, because it holds 3.0:1 there; on the display it holds 5.6:1.

**The Pastels Stay On The Screen Rule.** The six trace colours are set only inside the display, one per lead, in the order I, II, III, aVR, aVL, aVF. A trace on the light ground is Quiet Trace grey.

## Typography

**Display Font:** Sora (variable 100 to 800, self-hosted woff2), with ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto
**Body Font:** Sora, same stack
**Label/Mono Font:** Geist Mono (variable 100 to 900, self-hosted woff2), with ui-monospace, SFMono-Regular, Menlo, Consolas

**Character:** Sora's geometric, slightly wide forms at medium weight with tight negative tracking give the headlines the one-pager's calm authority; Geist Mono, small, uppercase and widely tracked, is the instrument voice that names leads and labels figures. Both faces are pinned by the one-pager PDF, which embeds exactly these two.

### Hierarchy
- **Display Hero** (500, clamp(40px, min(6.2vw, 11vh), 96px), 0.98, -0.04em): the two-line "Clinical Depth. / Wearable Ease." on the display only. The height term keeps it the largest type on short laptops. Compact: clamp(34px, 10.6vw, 54px).
- **Display** (500, clamp(36px, 5vw, 68px), 1.02, -0.035em): every section heading ("Six leads. Recorded when it happens.", "Where we are.", "The team."). The need statistic and the trade-off line use the same voice at clamp(34 to 36px, 4.6vw, 66px), the trade-off at 1.06 leading.
- **Figure** (600, clamp(64px, 7.6vw, 116px), 0.95, -0.045em, tabular figures): the seed ask in red. The TAM and SAM figures use the same treatment at clamp(36px, 3.8vw, 54px) (30px compact). Figures count up once on first sight.
- **Headline** (500, clamp(26px, 3vw, 40px), 1.25, -0.02em): the struck "left out" list, in Pale Slate.
- **Statement** (500, clamp(18px, 1.6vw, 24px), -0.015em): the sentence under the device pair; 20px on the reduced-motion plate.
- **Title** (600, 18px, -0.015em): person names. Callout labels are the same weight at 14.5px; the sent-state heading is 600 at 26px.
- **Body Large** (400, clamp(17px, 1.35vw, 19px), 1.6): the paragraph beside each section heading, in Slate, max 34em. Side notes run clamp(17px, 1.4vw, 20px), max 24em.
- **Body** (400, 16px, 1.6): base copy, inputs, milestone text (16px, 1.45). The display's lede is 15.5px.
- **Small** (400, 13 to 15px, 1.4 to 1.65): figure descriptions (15px), form notes and callout subs (13px), footer small print (13px, 1.65, max 62ch).
- **Button** (500, 15.5px, 1, -0.005em): pill labels; 14px in the bar.
- **Label** (Geist Mono 400, 11.5px, 1.5, 0.12em, uppercase): captions, figure labels (TAM, SAM, Seed ask), the "illustrative" notes. On the display the meta is 11px at 0.12em and the lead labels 12px at 0.04em in their trace colours. The build badge is mono 11px at 0.08em, not uppercased.

### Named Rules
**The Mono Is Measurement Rule.** Geist Mono sets lead names, measurements, captions, figure labels and the build badge. It never sets a heading, a sentence or a button, and a mono caption never sits above a section heading as an eyebrow.

**The Medium Display Rule.** Headlines are Sora 500 with negative tracking between -0.035em and -0.045em; 600 is for figures, names and labels. The set weights run 400 to 600; scale and tracking, not heaviness, carry the hierarchy.

## Layout

A single centred column, `wrap` (1200px) wide with `gutter` (clamp(16px, 4vw, 48px)) sides, and every section opened by `section` (clamp(112px, 13vw, 196px)) of top padding; the contact section closes with the same at the bottom. The rhythm is loose and editorial: large vertical gaps, few elements per screen.

Sections are pairs. A section head is a two-column grid (1.25fr / 1fr, 48px gap, bottom-aligned) of a display heading and its body-large paragraph, followed by clamp(48px, 6vw, 88px). Content grids are deliberately unequal and bottom- or centre-aligned: need 1.6fr / 1fr, six leads 0.8fr / 1.2fr, contact 0.9fr / 1.1fr, market chart against the ask across a vertical hairline, team as a heading against a right-aligned row of people between two hairlines. Gaps scale with clamp(32 to 40px, 6vw, 96px).

The hero is a scroll scene, not a section: 330svh tall (290svh compact) with a sticky 100svh stage. At rest the display sits `display-inset` (16px; 10px compact) from the viewport edges below the bar, with `display-pad` (32px; 18px compact) inside; the bar's 48px side padding equals 16 + 32, so the wordmark aligns with the display's inner edge. Leads take 48% of the display height (42% when the viewport is 760px tall or less, 36% compact).

There is one breakpoint, compact below 900px. The bar drops to 60px and hides its anchors, the CTA reads "The deck", every grid collapses to one column with 24px gaps, the timeline turns vertical, the ask moves under the market chart behind a top hairline, people stack, and the form's two-up row becomes one. Anchored sections clear the bar with a 72px (60px compact) scroll margin.

## Elevation & Depth

The page is flat and tonal. Depth comes from light, not from stacked surfaces: radial coral and blue washes on the ground, a faint white highlight across the display's top-left, and the dark display itself. Shadows are reserved for things that would physically cast one.

### Shadow Vocabulary
- **Action glow** (`box-shadow: 0 12px 24px -14px rgba(199, 54, 44, 0.8)`; hover `0 16px 28px -14px rgba(199, 54, 44, 0.9)`): a tight red pool under the primary button only.
- **Lifted sheet** (`box-shadow: 0 1px 2px rgba(11, 26, 48, 0.04), 0 32px 64px -32px rgba(11, 26, 48, 0.28)`): the contact panel, the only raised surface on the page.
- **Object shadow** (`filter: drop-shadow(0 34px 44px rgba(11, 26, 48, 0.24))`): the cut-out phone render.
- **Floor shadow** (28px-tall ellipse, `radial-gradient(closest-side, rgba(11, 26, 48, 0.24), transparent)`): under the module and watch renders once they stand side by side.
- **Marker lift** (`box-shadow: 0 2px 8px rgba(11, 26, 48, 0.28)`): callout dots, so they read on top of the renders.
- **Focus halo** (`box-shadow: 0 0 0 4px rgba(11, 26, 48, 0.08)`): a focused input.
- **Live pulse** (ring from `0 0 0 0 rgba(242, 87, 76, 0.55)` to `0 0 0 9px` transparent, 1.8s): the recording dot and the next milestone.

### Named Rules
**The Objects Cast, Surfaces Don't Rule.** Renders, the one action and the one panel cast shadows. Sections, bands, figure tiles and the display are flat.

**The Moved Bar Rule.** The bar has no surface over the hero. Once the page moves 8px it takes the ground at 95% with `backdrop-filter: saturate(1.4) blur(14px)` and a Faint Hairline under it, never a shadow.

## Shapes

Three forms carry the system. **Pills** (999px) for every action and the badge. **Hairlines** (1px) for every separation: bands between two rules, a rule between chart and ask, a rule over the footer. **Generous rounded rectangles** for anything that holds content: the display at 40px (26px compact), the figure tile at 32px, the contact panel at 28px, portraits at 20px on a 4:5 crop, inputs at 14px. Small radii (8px focus outline, 6px brand link and strip tag) exist only to round interaction affordances.

The display's corner is not fixed. As the hero zooms out its clip-path radius interpolates from 40px to the watch screen's own corner (108px at the render's native size, scaled), so the dark rectangle becomes the watch's rounded screen without a cut.

Circles are markers and data: the 8px recording dot, 12px callout and market dots (coral with a 2px white ring, or white with a 2px red ring), 15px milestone dots, and the equal-area TAM and SAM circles, the smaller one 0.78 of the larger's diameter (the square root of 2.76 / 4.53). Strike-throughs are rounded bars 0.07 to 0.075em thick. Icons are authored line SVG on a 24px box at a single 1.6 stroke (2 for the check), round caps and joins, in currentColor.

## Components

### Buttons
Pills that move only where they point.
- **Shape:** full pill (999px), 52px tall (48px in the compact hero, 40px in the bar).
- **Primary:** Wordmark Red with white Sora 500 at 15.5px, 0 22px 0 24px padding, a trailing 18px arrow, and the action glow. Hover deepens to Pressed Red and widens the glow; the arrow slides 3px right on the shared ease-out (0.4s); press drops the pill 1px; disabled is 60% opacity with a progress cursor and "Sending…".
- **Ink (bar):** Navy Ink pill at 40px, 14px label, 0 15px 0 18px padding; hover lifts to Lifted Navy. It is the bar's only button and reads "Request the deck" (compact: "The deck").
- **Link:** no box. Sora 500 at 15px with a trailing arrow-down that drops 3px on hover. On the display it is set in #d5dce6 and turns white on hover.

### Navigation
- **Bar:** fixed, 72px (60px compact), transparent over the hero; the moved state is described under Elevation. Red wordmark 19px tall (16px compact) on the left; four anchors (Device, Stage, Market, Team) at 14.5px in Slate, 32px apart; the ink pill on the right.
- **Anchor hover:** text goes to Navy Ink while a 1px coral underline draws in from the left and, on leave, retracts to the right (0.45s ease-out).
- **Progress:** a 2px coral line along the bar's foot scales with page progress through a spring (stiffness 220, damping 40).
- **Compact:** anchors hidden; wordmark and pill only.

### Inputs / Fields
- **Style:** filled, not outlined. Cool Sheet fill, 1px transparent border, 14px radius, 14px 16px padding, 16px Sora, a coral caret. Labels sit above in Slate 13.5px 500, with an "optional" in Pale Slate 12.5px.
- **Hover:** the fill darkens a step to #eaedf2.
- **Focus:** fill turns Paper White, the border Navy Ink, plus the 4px navy focus halo; no outline.
- **Invalid:** Wordmark Red border on a #fff6f5 fill, with a red 14px message below the fields.
- **Layout:** fields 18px apart; name and e-mail two-up above 900px.

### Cards / Containers
- **Contact panel:** Paper White, 28px radius, clamp(24px, 3.4vw, 44px) padding, the lifted-sheet shadow. The page's only card. Its sent state replaces the form with a 52px coral-tinted circle holding a red check, a 26px heading and Slate copy.
- **Figure tile:** the exploded render on a 32px-radius tile fading from #e6eaf0 to Mist, no shadow, a mono caption bottom-left.
- **Bands:** the team and the market are not cards; they are content between hairlines.

### Captions and Badge
- **Caption:** Label type in Pale Slate. It names the evidence it sits beside: "Concept rendering · module, strap, watch", "Lead II · illustrative", "The Cyphix app · limb-lead view", "TAM", "SAM", "Seed ask". Multi-part captions join with " · " and wrap only between parts.
- **Badge:** the build version in mono 11px at 0.08em, Pale Slate, 4px 10px in a Hairline pill, bottom-right of the footer.

### The Display (signature)
The single dark object and the hero.
- **Body:** Display Black, 40px radius, inset 16px under the bar, with a faint white radial highlight at the top-left (6%).
- **Top band:** "CYPHIX" in Sora 600 at 27px over "6-lead ECG" in 15px #a2acbb with a pulsing coral recording dot; on the right, "Illustrative signal · not patient data" in mono 11px Screen Dim.
- **Leads band:** a 24px grid of 4% white lines, masked to fade at both ends; mono lead labels I to aVF in their trace colours in a 44px gutter; one canvas drawing all six leads in scroll mode (the strip moves, the pen stays at the right edge) at 148px/s (88 compact), 1.9px strokes (1.5 compact), round joins, a glowing pen head of radius 1.8 × stroke.
- **Bottom band:** the Display Hero headline left ("Wearable Ease." in coral), and on the right a 400px column with the Screen Grey lede, the red primary button and the light link.
- **Arrival:** the head fades (0.9s), the leads wipe in left to right by clip-path (1.8s ease-out), each headline line rises from behind its own mask (1.15s, 0.12s apart), the side column fades up 12px (0.6s delay).
- **Scroll:** the headline band fades and lifts first; the display then scales and crops onto the frontal watch render's screen, the watch steps right while the module render arrives on its left, floor shadows settle, the callouts draw and a statement with its concept caption appears. A mono "illustrative" note bridges the gap between the in-screen label and the caption.
- **Reduced motion:** the display stands still and the module and watch appear below it as a plain two-up figure with the same statement and caption.

### ECG Trace
A pen, not a chart. One canvas per strip, one row per lead at equal heights, devicePixelRatio-aware (capped at 2) and paused off-screen. Two modes: **scroll** (watch strip, used on the display) and **sweep** (bedside monitor: the pen travels left to right and erases a 26px gap ahead of itself). On the light ground the single Lead II strip is Quiet Trace grey at 1.4px, 104px tall (84px compact), between two Faint Hairlines over a 16px coral graph-paper grid, with a mono caption on a ground-coloured 6px tag. Traces carry lead names and nothing else.

### Leader-line Callout (signature)
The one-pager's annotation device. A 1px Navy Ink line drawn by scaleX from the label side outward, ending on a 12px coral dot with a 2px white ring and marker lift, which scales in with it; the label (14.5px 600 Navy Ink, optional 13px Pale Slate sub) slides 12px and fades in. The four callouts start 0.14 apart along the callout phase (the last 15% of the scene's scroll). On compact screens they become plain 13px 600 tags under each render.

### Milestone Line (signature)
Five steps on one drawn line. A 1px Hairline track; on first sight a 2px Navy Ink line draws over 2s (cubic-bezier(0.65, 0, 0.35, 1)) and stops on the fifth dot. Each 15px dot starts hollow (Cool Sheet with a 22% navy ring) and fills Navy Ink as the pen passes, 0.4s apart, while its 16px Slate text rises 6px from 40% opacity. The last step is the open next step: a coral-ringed dot that fills coral and pulses, its text in Navy Ink 500 under a 14px 600 red "Next step". Compact: the line runs vertically down a 38px left gutter.

### Strike-through and Swap
Coral bars, 0.07em thick, draw across words by scaleX (0.7s ease-out). In the "left out" list they strike "Adhesive patches", "Wires", "Professional setup" one after another (0.24s apart). In the trade-off line the struck "or" lifts away and a coral "and" rises into its place; screen readers get "and" directly.

### Market Circles
Two equal-area nested circles in coral light (TAM: radial 8% to 20% fill, 32% border; SAM: 30% fill, 42% border), grown from the bottom (scale 0.55 to 1, 1.3s, SAM 0.22s later). A white dot ringed in red marks each, and a Pale Slate leader line draws to its mono label and count-up figure. The ask stands beyond a vertical Hairline: "Seed ask" caption, the red Figure, the primary button.

### Portrait
4:5 crop, 20px radius, Mist well, clamp(104px, 9vw, 136px) wide (96px compact). On hover the photo zooms 4% over 1.4s. Name in Title type, role in Slate 15px with " · " between parts.

## Do's and Don'ts

### Do:
- **Do** keep the page on one ground, Cool Sheet (#f1f3f6), and add depth with radial coral and blue washes at 7 to 16%, never with a second ground colour.
- **Do** set every heading in Sora 500 with -0.035em to -0.045em tracking, and every lead name, measurement, caption and figure label in Geist Mono 11 to 12px, uppercase, 0.12em.
- **Do** use Wordmark Red (#c7362c) only for the wordmark, the primary action, the ask figure, "Next step" and errors, and Live Coral (#f2574c) for what is live: the recording dot, pen glow, focus ring, caret, progress line, underlines, strike-throughs and markers.
- **Do** make actions full pills (999px) at 52px (40px in the bar), and separate content with 1px hairlines at 13% or 7% navy.
- **Do** bring lines in by drawing them (scaleX or clip-path from an origin) on the shared ease-out, cubic-bezier(0.16, 1, 0.3, 1); the milestone track's 2s ease-in-out is the one paced exception. Give every animated element a still, complete reduced-motion form.
- **Do** caption every trace "illustrative" and every render "concept rendering" within sight of it, in the mono Label style.
- **Do** keep text on the light sheet at Pale Slate (#52627b, 5.6:1) or darker.

### Don't:
- **Don't** add a second dark surface: no dark section, band, card or footer. Display Black (#0e1116) is the display's alone.
- **Don't** set the six trace pastels anywhere outside the display; a trace on the light ground is Quiet Trace (#9aa6b8).
- **Don't** set coral text below display size (34px) on the light ground; it holds only 3.0:1 there.
- **Don't** use Geist Mono for headings, sentences or buttons, and don't put a mono caption above a section heading as an eyebrow; captions label figures, data and renders.
- **Don't** give sections, bands, figure tiles or the display a drop shadow; only renders, the primary button and the contact panel cast one.
- **Don't** annotate a trace with a finding, marker or verdict; traces carry lead names and the "illustrative" label only.
- **Don't** use icon fonts, emoji or library icons; icons are authored line SVG at a 1.6 stroke in currentColor.
- **Don't** reach past Sora 600 for emphasis; use size, tracking or Navy Ink instead.

<!-- v0.6.0 — design system recorded from the built "one-pager at web scale" redesign (src/index.css :root, components, lib/heroScene.ts, lib/ecgModel.ts) -->
