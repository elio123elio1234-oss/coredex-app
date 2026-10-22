---
name: CYPHIX Landing
description: The one-pager played straight as a company homepage. A cool sheet, navy ink, coral for two phrases, red for the wordmark, the action and the ask.
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
typography:
  display-hero:
    fontFamily: "Sora, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(44px, min(6vw, 9.4vh), 92px)"
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
  button-link:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    padding: "14px 4px"
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
  build-badge:
    textColor: "{colors.ink-3}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
---

# Design System: CYPHIX Landing

## Overview

**Creative North Star: "The One-Pager, Played Straight"**

The investor one-pager carried to web scale and set like a serious medtech company's homepage. One cool sheet runs the full length of the page. Navy ink carries every word, slate carries the supporting text, and two warm voices are kept on a short leash: coral marks two phrases ("Wearable Ease." and "1 in 3"), red marks the wordmark, the primary action and the ask. The product renders do the selling. Leader-line callouts name their parts the way an industrial-design sheet would.

Density is calm and editorial. Every section opens with generous vertical space, a heavy Sora headline and a short slate paragraph, then one piece of evidence: the comparison table, the exploded render, the milestone line, the market circles, the team portraits, the form. Structure comes from hairlines and white surfaces, never from boxes on boxes.

Motion is a single arrival. On load the headline lines rise out of their masks, the renders settle in from either side, and the hero's callouts draw and their dots pop. After that the page holds still. Hover gives small feedback below the fold and nothing moves on scroll.

**Key Characteristics:**
- One cool sheet (ground) from bar to footer, with one faint coral glow behind the hero renders and blue washes top-right of the hero and behind the form.
- Navy ink type in Sora 400 to 600; the hero alone sits at 550.
- Coral as text only for "Wearable Ease." and "1 in 3"; red for the wordmark, the primary action and the ask.
- Hairline rules and white surfaces instead of cards; pill buttons.
- Leader-line callouts (ink line, coral dot) on the real product renders.
- One load arrival, then a still page.

## Colors

A cool, near-monochrome navy-on-grey sheet with two warm accents that are rationed by name, not by percentage.

### Primary
- **Wordmark Red** (red): the CYPHIX wordmark in bar, comparison header and footer; the "Request the deck" primary pill; the $1.9M ask figure; the TAM/SAM chart markers' rings; form error text, invalid-field borders and the Cyphix label on the phone comparison cells. It means "this is us, and this is the action".
- **Pressed Red** (red-deep): primary button hover only.

### Secondary
- **Electrode Coral** (coral): as type, exactly two phrases: the hero's second line "Wearable Ease." and "1 in 3" in the need statement. As marks: callout dots, the focus ring, the text caret, the selection tint (22% alpha), the TAM/SAM circle fills (7% to 26% alpha) and the ring on the next milestone dot. It is the colour of the product's electrodes, so it marks the product and the problem.

### Neutral
- **Cool Sheet** (ground): the page itself, the frosted bar after scroll (88% alpha), and the resting fill of form fields.
- **Sheet Shadow** (ground-2): placeholder fill behind team portraits.
- **White Surface** (paper): the comparison's Cyphix column, the form panel, a focused field.
- **Navy Ink** (ink): headlines, table row heads, callout lines, the "yes" marks, milestone line and dots, the bar's secondary pill.
- **Lifted Navy** (ink-lift): ink pill hover.
- **Slate** (ink-2): body copy, ledes, nav links, table cells, market descriptions.
- **Quiet Slate** (ink-3): captions, field hints, mono labels, the build badge, footer column heads and the legal note.
- **Hairline** (hair) and **Faint Hairline** (hair-2): every rule on the page: table rows, market band, footer dividers, the scrolled bar's bottom edge, the badge outline.
- **Wash Blue** (wash-blue): only as a 13% to 16% radial wash, top-right of the hero and behind the form. Never a fill, never text.

### Named Rules
**The Two Phrases Rule.** Coral is a text colour for "Wearable Ease." and "1 in 3" and nothing else. Every other coral on the page is a mark (dot, ring, circle, focus, caret), never a word.

**The Red Means Us Rule.** Red is the wordmark, the primary action and the ask. A red word that is not one of those (or an error) is a mistake.

## Typography

**Display Font:** Sora (variable, self-hosted, with ui-sans-serif / system-ui fallback)
**Body Font:** Sora
**Label/Mono Font:** Geist Mono (variable, self-hosted, with ui-monospace fallback)

**Character:** One geometric grotesk does everything, from a 92px headline down to 12.5px legal type, carried by weight and tight negative tracking rather than by a second family. Geist Mono appears as a whisper on data labels only.

### Hierarchy
- **Display (hero)** (550, clamp up to 92px, 1.02, -0.04em): "Clinical Depth. / Wearable Ease." only. On phones it runs clamp(40px, 11.6vw, 56px).
- **Statement** (500, clamp(36px, 4.6vw, 64px), 1.04): the need section's opening line, set left at 12em max.
- **Figures** (600, tabular numerals, -0.04em): the ask at clamp(60px, 7vw, 104px) in red; TAM/SAM values at clamp(32px, 3.4vw, 50px) in ink.
- **Headline** (500, clamp(32px, 3.7vw, 52px), 1.08, -0.032em): every section title.
- **Title** (500, clamp(22px, 2vw, 28px), 1.22): sub-heads inside a section ("Sent straight to the clinician.").
- **Callout** (600, 15.5px on the exploded figure; clamp(12px, 1.2cqw, 15px) in the hero, scaled to the figure): part names at the end of a leader line, with a 400 slate sub-line.
- **Body large** (400, clamp(17px, 1.3vw, 19px), 1.6, slate, max 34em): section ledes.
- **Body** (400, 16px, 1.65, slate, max 36em): running copy.
- **Caption** (400, 13px, 1.5, quiet slate): figure captions ("Concept rendering · ...").
- **Label** (Geist Mono 400, 11.5px, 0.14em, uppercase, quiet slate): the TAM, SAM and Seed ask labels only.

### Named Rules
**The Mono Whisper Rule.** Geist Mono is used for exactly two jobs: the TAM / SAM / Seed ask data labels and the build badge. It never sits above a heading as a kicker.

**The Tracking Floor Rule.** Display sizes track tight but never tighter than -0.04em.

## Layout

A centred 1200px column with a fluid gutter (clamp(20px, 4vw, 48px)) and sections separated by clamp(104px, 11vw, 168px) of top padding. The fixed 72px bar (64px on phones) is transparent over the hero and frosts to the ground colour once the page moves.

The hero is centred: headline, lede (max 41em), a red pill plus a "How it works" link, then the product pair placed in a 1200 by 520 frame whose width is also bound to viewport height so the renders show above the fold. Below the hero, sections alternate between a two-column head (headline left, lede right, bottom-aligned) and a centred head (product). Evidence is set in grids: the comparison table (34% feature column), the five-step milestone line, a 1.75 : 1 market band split by a vertical hairline, a two-up team grid, a 0.9 : 1.1 contact grid.

Tablet (max-width 1023px): heads and the need lead stack to one column; milestones go three across; the market band stacks with a horizontal hairline; the exploded figure's callouts become a three-column legend under the image; the footer goes two-up.

Phone (max-width 719px): the nav hides and the ink pill moves right; the hero pair becomes two renders side by side with tags beneath instead of callouts; the comparison becomes one block per capability with three answer cells; the exploded render crops to module and strap; milestones turn vertical; market circles shrink to 120px beside their rows; everything else is one column.

## Elevation & Depth

Mostly flat and tonal. Depth comes from white surfaces sitting on the cool sheet and from soft, navy-tinted ambient shadows under physical things (the form panel, the phone screenshot, the renders' floor ellipses). No hard shadows, no stacked cards.

### Shadow Vocabulary
- **Primary glow** (`box-shadow: 0 12px 24px -14px rgba(199, 54, 44, 0.75)`, hover `0 16px 28px -14px rgba(199, 54, 44, 0.85)`): under the red pill only.
- **Panel lift** (`box-shadow: 0 1px 2px rgba(11, 26, 48, 0.04), 0 32px 64px -32px rgba(11, 26, 48, 0.26)`): the form panel.
- **Device drop** (`filter: drop-shadow(0 30px 40px rgba(11, 26, 48, 0.18))`): the app screenshot.
- **Render floor** (radial-gradient ellipse, rgba(11, 26, 48, 0.2) to transparent): contact shadows under the hero renders and the market circles.
- **Callout dot** (`filter: drop-shadow(0 2px 3px rgba(11, 26, 48, 0.3))`, with a 2px white stroke): lifts each coral dot off the render.
- **Field focus** (`box-shadow: 0 0 0 4px rgba(11, 26, 48, 0.08)`): a soft ink halo on a focused input.

### Named Rules
**The Hairline Rule.** Structure is drawn with 1px navy hairlines at 12% or 7%; a container earns a white surface only when it is the answer (the Cyphix column) or the action (the form).

## Shapes

Round where the hand touches, square where the reader scans. Buttons and the build badge are full pills (999px). Surfaces are softly rounded: the form panel at 28px, the comparison's Cyphix column and team portraits at 20px, fields and phone comparison cells at 14px. Marks are circles: the 24px yes/no marks, the 14px milestone dots, the callout dots, the market circles. Rules and table rows stay square. Focus outlines take an 8px radius.

## Components

### Buttons
Confident, round, and few.
- **Shape:** full pill (999px), 52px tall; the small bar variant is 40px.
- **Primary:** red fill, white Sora 500 at 15.5px, trailing arrow icon, red glow underneath. Used for "Request the deck" in the hero, after the ask, and on the form submit.
- **Ink:** navy fill, white text, the bar's compact "Request the deck"; hovers to lifted navy.
- **Hover / Focus:** fill darkens over 0.25s, the arrow slides 3px forward; active nudges down 1px; focus shows the global 2px coral outline at 3px offset.
- **Link:** unboxed ink text with a down arrow ("How it works") that slides down 3px on hover.

### Cards / Containers
- **Corner Style:** 28px for the form panel; 20px for the comparison column.
- **Background:** white on the cool sheet.
- **Shadow Strategy:** panel lift on the form only; the comparison column is flat.
- **Border:** none; inner rows use the faint hairline.
- **Internal Padding:** clamp(24px, 3.4vw, 44px) for the panel; 20px by 24px table cells.

### Inputs / Fields
- **Style:** cool-sheet fill, transparent 1px border, 14px radius, 14px by 16px padding, Sora 16px, coral caret. Labels above in Sora 500 at 13.5px slate with quiet "optional" hints. Hover deepens the fill slightly (#eaedf2).
- **Focus:** fill turns white, border turns navy, soft 4px navy halo; no outline.
- **Error / Disabled:** red border on a faint red-white fill (#fff6f5), red message text; a disabled submit drops to 60% opacity with a progress cursor.

### Navigation
The bar: red wordmark left (18px tall), then Product · Stage · Market · Team in slate 14.5px with a 1px underline that wipes in from the left on hover, then the ink pill. Transparent at rest, frosted cool sheet with a faint bottom hairline once scrolled. On phones the links hide and only the wordmark and pill remain.

### Comparison Table
Three columns of answers against a feature column. Rows are hairlines; the Cyphix column is a white rounded surface with the red wordmark as its header. Answers pair a 24px round mark (navy filled with a white check for yes, a hairline ring with a dash for no) with short ink text. On phones each row becomes the question over three labelled cells.

### Leader-Line Callout (signature)
A 1px ink line (non-scaling stroke) from a part of the real render to a Sora 600 label, ending in a coral dot with a white stroke. In the hero the lines are horizontal and labels sit outside the pair; on the exploded figure short leaders drop into the render's own empty space and carry a title plus one slate sentence. Dots are placed in image coordinates so they stay on the product at every width. Below 1024px (exploded) or 720px (hero) callouts turn into a legend or tags under the image.

### Milestone Line
A 2px ink line with 14px ink dots for done steps; it fades to a hairline into the last step, whose dot is hollow with a coral ring. Horizontal five-up on desktop, vertical on phones.

### Build Badge
A hairline pill in the footer with the version in Geist Mono 11px, quiet slate.

### Named Rules
**The One Arrival Rule.** Motion happens once, on load, in the hero, with the exponential ease-out cubic-bezier(0.16, 1, 0.3, 1): headline lines rise (1.1s), lede and actions fade up, renders settle from 22px either side (1.5s), callout lines draw from 1.15s and dots pop at 1.55s. Everything sits behind prefers-reduced-motion. Below the hero only hover feedback moves.

## Do's and Don'ts

### Do:
- **Do** keep the whole page on the cool sheet (ground) and lift only the Cyphix comparison column and the form onto white (paper).
- **Do** use red for the wordmark, the primary "Request the deck" pill and the ask figure, and coral as text only for "Wearable Ease." and "1 in 3".
- **Do** annotate real product renders with leader-line callouts: 1px ink line, coral dot with a white stroke, Sora 600 label.
- **Do** separate content with 1px hairlines (hair, hair-2) and let section padding, not boxes, make the rhythm.
- **Do** set headlines in Sora 500 (550 for the hero only) with tracking between -0.02em and -0.04em, and keep body copy slate at 16px to 19px.
- **Do** restrict Geist Mono to the TAM, SAM and Seed ask labels and the build badge.
- **Do** caption every render as a concept rendering.

### Don't:
- **Don't** add scroll-driven scenes, scroll-linked animation or anything that moves after the hero's one arrival.
- **Don't** simulate a live signal: no sweeping or animated ECG traces anywhere on the page.
- **Don't** put Geist Mono or an uppercase label above a headline as a kicker.
- **Don't** use coral for any word beyond the two phrases, or red for anything beyond the wordmark, the action, the ask and errors.
- **Don't** wrap sections in bordered or shadowed cards; the form panel is the only lifted surface.
- **Don't** track display type tighter than -0.04em.

<!-- v0.7.0 — design system re-derived from the professional rebuild (index.css :root, components, Hero/Product callout frames) by the Impeccable documenter -->
