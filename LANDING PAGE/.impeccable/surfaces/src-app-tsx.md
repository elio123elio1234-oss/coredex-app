---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Landing page (investor home)

Scope: the whole single-page site in `src/App.tsx`. Visitor mode: **Persuade**.

Audience: seed investors arriving cold from a link. Job: decide in a minute whether CYPHIX is worth a meeting. Action: the "Request the deck" form (posts a lead, `orgType: "other"`, fund in `organization`). Proof on hand: the team's own 3D model of the strap (three-d-stage export: smartwatch + strap, strap alone, analog watch + strap), the real app's limb-lead screen, prototype/patent/IIA facts, team, TAM/SAM, the $1.9M ask. Constraints: acquisition, never interpretation; renders labelled concept; no simulated live signal.

Chosen direction (2026-10-23, second message, user-pinned): "look at this style: https://alivecor.com/ — do it like that but for my product; where a visualisation image is needed, write me a prompt for Gemini". The page follows AliveCor's structure and component language in Cyphix's colours; the four photograph slots carry Gemini prompts (gemini/PROMPTS.md) and show renders of the 3D model until the photos arrive. The user's earlier "One strap. Any watch." scene stays, near the end.

Unresolved: Hebrew/RTL (L4); an `investor` lead type needs a shared + server change.

## Direction contract

THESIS: A medical-device company's homepage in AliveCor's grammar: an announcement bar, a slate product hero, a navy facts band, photo-and-text splits, a full-bleed photograph under a navy card, list rows with line icons, pale bands, a link-column footer. It refuses spectacle in every section but the user's own closing scene.

OWN-WORLD: White ground with pale mist bands (#e3e8ef, #f2f5f9); slate hero #363a43; navy #0f2f56 for the facts band and cards; action blue #1d4f8b for buttons, the announcement and footer headings; sky #a8bfdf for copy on slate; coral #f2574c only for "Wearable Ease." and "1 in 3"; red #c7362c for the wordmark and the ask. Sora 400–600; Geist Mono only on TAM, SAM, Seed ask and the badge. Square-cornered panels, 10px-radius solid buttons with uppercase tracked labels, 1.4-stroke navy line icons, headings followed by a hairline rule.

STORY: Understands: a module on the watch strap records a 6-lead ECG when symptoms occur and sends it to the clinician; one strap, any watch. Believes: a real modelled product, working prototype, patent pending, IIA Tnufa, a Samsung R&D founder with an MD advisor, a $4.53B market. Does: requests the deck.

FIRST VIEWPORT: Navy announcement "Now raising a $1.9M seed round | Request the deck"; a white 72px bar with the red wordmark, four links, the phone number and a solid blue button; a slate band split in half, the left centred with a "In development · Not for sale" chip, "Clinical Depth." white over "Wearable Ease." coral, a sky lede and a solid blue button, the right holding the product (Gemini wrist photo slot, interim: the 3D render).

FORM: User-pinned reference (alivecor.com, 2026-10-23). seed:de6a0c32c2d8b437 (the surface roll recorded earlier today; the user's pinned reference beats it per new-work.md). Signature: the hero product on slate, and near the end the scroll-scrubbed "One strap. Any watch." scene. Motion grammar: the hero copy arrives once; the closing scene scrubs; nothing else moves.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
