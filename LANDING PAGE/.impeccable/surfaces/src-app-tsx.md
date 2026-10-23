---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Landing page (investor home)

Scope: the whole single-page site in `src/App.tsx`. Visitor mode: **Persuade**.

Audience: seed investors arriving cold from a link. Job: decide in a minute whether CYPHIX is worth a meeting. Action: the "Request the deck" form (posts a lead, `orgType: "other"`, fund in `organization`). Proof on hand: the team's own 3D model of the strap (three-d-stage export: smartwatch + strap, strap alone, analog watch + strap), the real app's limb-lead screen, prototype/patent/IIA facts, team, TAM/SAM, the $1.9M ask. Constraints: acquisition, never interpretation; renders labelled concept; no simulated live signal.

Chosen direction (2026-10-23, user-pinned): the user still found v0.7 unprofessional ("I still don't like it at all"), and pinned a signature themselves: near the end, a scroll scene where the watch rotates, becomes only the strap, then an analog watch, so "one strap on any watch" is understood. The product leads everywhere, rendered from their real model; the flat concept renders are retired.

Unresolved: Hebrew/RTL (L4); an `investor` lead type needs a shared + server change.

## Direction contract

THESIS: The real product leads. Every image is the team's own 3D model, rendered in one studio light, from a hero product shot to a closing scene where the watch turns, lifts away and is replaced: one strap, any watch. It refuses flat concept art, simulated signals and decoration standing in for the product.

OWN-WORLD: A product studio in the one-pager's colours. Light sections on cool sheet #F1F3F6 with a soft studio glow behind the product; one dark stage (#0A0D13 to #121826) for the closing scene, where aluminium and steel catch a cool rim light. Navy ink #0B1A30, slate #33415A / #52627B, coral #F2574C for "Wearable Ease." and "1 in 3", red #C7362C for the wordmark, the action and the ask. Sora 400–600; Geist Mono only on TAM, SAM and Seed ask and the build badge. Hairlines, pills, leader-line callouts on the module close-up.

STORY: Understands: a module on the strap of the watch a person already wears records a 6-lead ECG when symptoms occur and sends it to the clinician; the strap works with any watch. Believes: a real, modelled product; working prototype, patent pending, IIA Tnufa; a Samsung R&D founder with an MD advisor; a $4.53B market. Does: requests the deck.

FIRST VIEWPORT: 72px bar as before. Left column: "Clinical Depth." navy over "Wearable Ease." coral at about 80px, the lede, the red "Request the deck" pill and "See it on any watch" link. Right column: the 3D render of the Cyphix strap on the smartwatch, three-quarter view showing the CYPHIX screen and the module's electrodes, about 640px tall on a soft studio glow with a floor shadow, fully visible above the fold at 1440×900 and 1280×720.

FORM: User-pinned direction (2026-10-23, the user's own scene). seed:de6a0c32c2d8b437. The surface roll was run (2026-10-23, persuade) and recorded; the user's pinned scene beats it per new-work.md: "a user- or brief-pinned direction beats the roll, always". Signature interaction: "One strap. Any watch." A sticky dark stage near the end renders the GLB live in WebGL. Scroll turns the strap to show the electrodes, the smartwatch unclips and rises out of frame (opaque), the strap holds alone on its lug adapters, then the analog watch comes down and clicks into the same adapters. Copy changes with each phase. Motion grammar: scroll-scrubbed, eased keyframes, nothing on a timer; the hero arrives once on load; everything else is still. Reduced motion or no WebGL shows the three states as stills.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
