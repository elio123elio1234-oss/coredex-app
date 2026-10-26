# Changelog — CYPHIX One-Pager

## v1.3.0 — 2026-10-26 — the landing page's opening line

**Why.** The user: "And you're missing the sentence that it's on the watch the user already
wears, like in the landing page's opening. That's an important sentence."

**What changed.**
- **The hero's lede** is now the landing page's own, word for word: "A 6-lead ECG module on
  the strap of the watch you already wear. It records when symptoms occur and sends the
  recording directly to the clinician."
- **The navy band's third fact** was the same sentence. It now carries the part of the old
  lede that would otherwise be lost: "No adhesive patches, wires or professional setup."
- The lede is two lines now, so the headline sits a little lower (64 px from the band's top)
  to keep the hero balanced.

## v1.2.2 — 2026-10-26 — no address, no "not for sale"

**Why.** The user: "Why do we need cyphix-landing.vercel.app, and that it's not for sale? Of
course it's not for sale if I'm submitting to a venture capital fund. Come on."

**What changed.**
- The bar holds the red wordmark alone; the site's address is gone.
- The hero has no "In development · Not for sale" chip. The headline sits a little lower
  (54 px from the band's top, up from 34), so the hero stays balanced.
- The page's only links are now the e-mail and the phone.

## v1.2.1 — 2026-10-26 — the tablet back to its earlier size

**Why.** The user: "Actually, put the iPad back to the previous size."

**What changed.**
- The tablet is back to its v1.1.0 size, 0.84 of the hand's height (349 px wide).
- It stays centred, as asked in v1.2.0; the hand has not moved.

## v1.2.0 — 2026-10-26 — a larger tablet, centred; no callouts

**Why.** The user, on v1.1: "I'd make the iPad behind a bit bigger and centre it (I wouldn't
touch the hand), remove the arrows that explain what each thing is, and put our photos in
colour, not black and white. And why is there a 'Request the deck' button at the top? You do
know it's a PDF?"

**What changed.**
- **The tablet:** 420 px wide, up from 349, and centred on the page. The hand keeps its exact
  place and size; its box is now anchored where it stood, not centred on itself. The thumb
  now rests on the right end of the traces, as the site's hand does, and all six leads still
  read.
- **No callouts:** "6-lead ECG" and "Cyphix module" are gone.
- **The portraits are in colour.**
- **No deck request:** the blue line says only "Now raising our seed round"; a PDF has no
  button. The e-mail, phone and site at the foot stay as links.
- The PDF is 1.7 MB (the colour portraits, the larger tablet).

## v1.1.0 — 2026-10-26 — minimal, after the user's own one-pager

**Why.** The user, on v1.0: "No, no, you made it too crowded. Look at my one-pager, the one
with the two watches in the centre: see how very minimal it is. Do it in that style, just with
my landing page's design. It doesn't need all the information, it only has to spark interest.
The landing page's main picture can sit in the middle, with its background. Make the iPad a
bit bigger, so they really get that it records leads."

**What changed.** The sheet now follows the layout of `Cyphix-One-Pager-phone-test-3.pdf`:
- **The hero:** the landing page's slate hero, centred; the one-pager's headline and lede; the
  site's hand and tablet in the middle.
  - The tablet is larger against the hand: 0.84 of the hand's height, against the site's 0.67.
  - The hand now covers only the screen's side panel, so all six leads are in full view.
  - Two callouts in the one-pager's manner: a label, a hairline and a coral dot. "6-lead ECG"
    with the leads' names, and "Cyphix module" on the strap.
- **The navy band:** $4.53B TAM, $2.76B SAM and "6-lead ECG on the watch you already wear".
- **The text:** the need, the trade-off and where we are, in the one-pager's words.
- **The close:** the team and the contact.

**Removed:** the compromise columns, the four watches with the solution card, the technology
paragraph, the business model, the roadmap and the glass footer. Their pictures were taken out
of `assets/` too. The seed amount stays off, and so does the tablet's reading. The PDF is now
1.3 MB.

## v1.0.1 — 2026-10-26 — a print floor for the smallest type

**Why.** The design check flagged the sheet's type. The real finding: the mono labels ("Who
pays", "Patches") were 6.5 px, about 4.9 pt, and the notes and small print 7 to 7.5 px. Those
are too small even on paper.

**What changed.**
- Labels, notes, the chip and the small print are now 7.5 to 8 px (about 6 pt).
- Running text is now 9.5 px or more.
- The announcement line, the bar's date and the roles are now 9 px.
- The sheet still fits on one page, with 5 px to spare. The PDF is 1.4 MB.

**Not changed, on purpose.** The screen-reading floors (12 px body, 11 px UI) do not apply to a
printed A4 sheet, where 1 CSS px is 0.75 pt and 9.5 to 11 px is 7 to 8 pt. The hero's
forearm also stays where it is: it rises from the band's lower edge on purpose. Both
exceptions are recorded in the shared Impeccable config, scoped to `one-pager.html` only.

## v1.0.0 — 2026-10-26 — the landing page on one page

**Why.** The user: "Open a new folder named CYPHIX_ONE_PAGER and make a one-pager there from my
landing page, with the landing page's design, but as a short, sharp, beautiful PDF."

**What it is.** One A4 page, printed from HTML by headless Chrome. It uses the site's tokens,
fonts and bands (landing v0.35.0), in the site's order:
- the blue announcement line and the bar with the red wordmark;
- the slate hero with the coral "Wearable Ease." and the forearm before the tablet;
- the navy figures band;
- the need and today's three compromises;
- the four watches on slate under a navy card, which pairs "Our solution" with "Noise, solved
  in hardware.";
- the business model beside the team;
- one milestone line from what is done to what comes next;
- the white glass over the heart-hands, with the contact.

**Choices.**
- **Every claim is one the site makes.** The copy is the site's, shortened.
- **No amount for the round, no partner names, competitors by category.** The figures are the
  site's $4.53B / $2.76B, not the deck's 2026 forecast.
- **Data, never a reading.** The tablet keeps the site's illustrative recording as vector (sharp
  at any zoom). Its copy drops the axis and rhythm verdicts, the normal-range sector and the red
  ST marks, which the site's hero still shows.
- **Print, not screen.**
  - The footer's glass is the photograph blurred in advance (print does not carry
    backdrop-filter).
  - The cut-outs are sized to about 340 dpi at their size on the page, so the PDF is 1.5 MB.
  - Links work: the deck request (mailto), the e-mail, the phone and the site.

**Checked.**
- `build.mjs` passed: nothing overflows, every font and picture loaded, and the PDF has one page.
- The PDF was rendered back (PyMuPDF):
  - Sora is embedded;
  - five links work;
  - nothing on the page reads the ECG, names an amount or names a partner.

<!-- v1.0.0 — first release -->
