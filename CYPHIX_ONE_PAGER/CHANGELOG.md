# Changelog — CYPHIX One-Pager

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
