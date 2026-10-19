---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Landing page (investor home)

Scope: the whole single-page site in `src/App.tsx`. Visitor mode: **Persuade**.

Audience: seed investors arriving cold from a link. Job: decide in a minute whether CYPHIX is worth a meeting. Action: the "Request the deck" form (posts a lead, `orgType: "other"`, fund in `organization`). Proof on hand: concept renders, the real app's limb-lead screen, prototype/patent/IIA facts, team, TAM/SAM, the $1.9M ask. Constraints: acquisition, never interpretation; every trace labelled illustrative; renders labelled concept.

Chosen direction: "Out of the screen" (re-roll 1 lead, user locked it 2026-10-19). Memorable moment: scrolling out of a live 6-lead display until it is the screen of the watch, then the module and the one-pager callouts.

Unresolved: Hebrew/RTL (L4); an `investor` lead type needs a shared + server change; deployment is the user's call.

## Direction contract

THESIS: The page opens inside the device. The visitor lands on the CYPHIX display recording six leads and scrolls out to find it is the watch they already wear. It refuses the headline-over-subcopy-beside-a-product-shot hero.

OWN-WORLD: The one-pager, at web scale. Cool off-white ground #F1F3F6 with soft coral and blue light washes; navy ink #0B1A30, slate #33415A / #52627B; coral #F2574C for "Wearable Ease." and live accents; red #C7362C for the wordmark and primary actions. Sora 400–600 for everything set, Geist Mono only for measurements, lead names and captions. The single dark object is the watch display (#0E1116) carrying the render's six pastel traces (salmon, peach, butter, mint, sky, lavender). Hairline rules, pill buttons, concept renders with leader-line callouts.

STORY: Understands: a module on the watch strap records a 6-lead ECG when symptoms occur and sends it to the clinician. Believes: working prototype, patent pending, IIA Tnufa, a founder from Samsung R&D with an MD advisor, a $4.53B market. Does: requests the deck.

FIRST VIEWPORT: A 72px bar with the red CYPHIX wordmark left, four anchor links and a navy "Request the deck" pill right. Below it, the dark display, inset 16px with a 40px radius, fills the rest of the viewport. Its top band carries "CYPHIX / 6-lead ECG" left and "Illustrative signal" in mono right. Six full-width live sweeping leads, labelled I to aVF, run through the middle. The bottom band sets "Clinical Depth." in white over "Wearable Ease." in coral at about 88px on the left, with the lede, a red "Request the deck" button and a "See the device" link on the right.

FORM: "Out of the screen", position 7 on the re-roll-1 list, seed:361ba15f60aa0961. Signature interaction: scrolling zooms out of the display into the frontal watch render (the live display stays the watch's screen), then the module render slides in and the one-pager's four callouts draw. Motion grammar: exponential ease-out reveals from visible defaults, a pen-sweep for every trace, line drawing for callouts, the stage timeline and the strike-throughs.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
