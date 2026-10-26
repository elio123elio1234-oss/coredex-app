# Changelog — CYPHIX One-Pager

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
