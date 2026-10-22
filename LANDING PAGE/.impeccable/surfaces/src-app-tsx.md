---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Landing page (investor home)

Scope: the whole single-page site in `src/App.tsx`. Visitor mode: **Persuade**.

Audience: seed investors arriving cold from a link. Job: decide in a minute whether CYPHIX is worth a meeting. Action: the "Request the deck" form (posts a lead, `orgType: "other"`, fund in `organization`). Proof on hand: concept renders, the real app's limb-lead screen, prototype/patent/IIA facts, team, TAM/SAM, the $1.9M ask. Constraints: acquisition, never interpretation; renders labelled concept; no simulated live signal anywhere.

Chosen direction (2026-10-22): the category standard played straight. The user rejected v0.6's "Out of the screen" scroll scene as "over simulation … doesn't seem like a professional company did it" and said "stop asking me questions", so the standing exit was taken in their words without a round. Craft bar: Withings ScanWatch pages, Neko Health, Apple Watch pages. Memorable moment: the one-pager's product pair under the headline, callouts drawing once.

Unresolved: Hebrew/RTL (L4); an `investor` lead type needs a shared + server change.

## Direction contract

THESIS: A medtech company's homepage played straight: the one-pager's centred headline over the real product pair, then the case an investor reads in order (need, positioning, product, stage, market and ask, team, request). It refuses scroll-driven scenes, simulated live signals and self-drawing decoration.

OWN-WORLD: The one-pager. Cool sheet #F1F3F6 with one faint coral glow behind the renders and a blue wash top-right; navy ink #0B1A30, slate #33415A / #52627B; coral #F2574C for "Wearable Ease." and "1 in 3" only; red #C7362C for the wordmark, the primary action and the ask. Sora 400–600; Geist Mono only for the TAM, SAM and Seed ask labels and the build badge. White surfaces for the comparison's Cyphix column and the form; the renders stand on the ground itself; hairline rows; pill buttons; leader-line callouts.

STORY: Understands: a module on the watch strap records six limb leads when symptoms occur and sends them to the clinician. Believes: working prototype, patent pending, IIA Tnufa, a Samsung R&D founder with an MD advisor, a $4.53B market. Does: requests the deck.

FIRST VIEWPORT: 72px bar: red wordmark left, Product · Stage · Market · Team, a navy "Request the deck" pill right. Centred "Clinical Depth." navy over "Wearable Ease." coral at about 88px, the one-pager lede under it at 19px, a red "Request the deck" pill and a "How it works" link. Below, the module render and the watch render side by side, about 480px tall and cut by the fold, with the one-pager's four leader-line callouts.

FORM: The category standard played straight: the standing exit, taken in the user's words on 2026-10-22. seed: none (no roll; user-pinned canon). No roll was run because the user's words pin the direction, and new-work.md exempts it: "a user- or brief-pinned direction beats the roll, always" and "When the user takes it (… plain words asking for the familiar or competitor-like path), convention becomes the commitment". The v0.6 roll is retired. Signature: the hero's single arrival (headline lines rise from their masks, the renders settle, the callouts draw once); after it the page holds still. Motion grammar: exponential ease-out, once, on load only; hover feedback only below the fold.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
