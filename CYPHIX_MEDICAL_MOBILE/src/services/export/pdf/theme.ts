/* ==================================================================
   THE REPORT'S GEOMETRY AND PALETTE — one source, in millimetres.

   ══ WHY EVERYTHING HERE IS A NUMBER IN MILLIMETRES ══
   Reported: *"the PDF is not laid out for the page, the graphs stretch
   across two pages, the tables are dated and colourless, it is ugly."*

   The stretching was not a styling mistake, it was a MISSING CONSTRAINT.
   The old sheet drew each strip as `<svg width="100%">` with a viewBox and
   no height, so the height was INFERRED from the aspect ratio against
   whatever width the print engine had decided the column was — and the page
   itself had no height ceiling at all. Any growth anywhere above (a longer
   device name wrapping the letterhead onto a second line is enough) pushed
   the last band past 297 mm, and the engine did the only thing it can: it
   started a new page in the middle of a lead.

   So the rule for this whole folder, without exception:

     ★ EVERY BOX HAS AN EXPLICIT HEIGHT IN MILLIMETRES, AND THE HEIGHTS ON
       A PAGE ARE ASSERTED TO SUM TO NO MORE THAN 297.

   Nothing is `auto`, nothing is `100%`, nothing wraps. `assertFits()` at
   the bottom is run by the builder for every page, so a layout that would
   overflow throws while building instead of silently producing a torn
   report a patient hands to a doctor.

   ══ THE PALETTE IS THE BRAND, ON PAPER ══
   Taken from `theme/tokens.ts` — the same navy the wordmark is set in, the
   same instrument green, the same gold and red. Two deliberate print
   departures, both because paper is not a screen:

     · the page ground is white, always. The dark theme's green-on-navy is
       a screen affordance; on a printer it is a solid navy rectangle that
       empties a toner cartridge and cannot be written on.
     · text colours are DARKER than their screen tokens. Ink on paper has
       no backlight, and a 4.5:1 grey that is comfortable on an OLED is
       faint under a fluorescent tube in a clinic.
   ================================================================== */

/* ══════════════════ Page ══════════════════ */

/** A4 portrait, in millimetres. Not negotiable and not a variable. */
export const PAGE_W = 210;
export const PAGE_H = 297;

/**
 * ★ WHAT THE PAGE BOX IS ACTUALLY DRAWN AT, AND WHY IT IS NOT 297.
 *
 * ⚠️ THIS ONE MILLIMETRE IS A BUG FIX, NOT A MARGIN. Reported: "why is there
 * a blank page after every page?" — and there was, exactly one, after every
 * single sheet.
 *
 * A box declared `height: 297mm` inside a 297 mm page is not safe. WebKit
 * lays print out in CSS pixels: 297 mm is 1122.52 px, which it rounds UP to
 * 1123. The box is then half a pixel taller than the page it sits in, the
 * engine honours `page-break-after: always` on a box that has ALREADY
 * overflowed, and the overflow — half a pixel of nothing — becomes a page.
 *
 * Drawing at 296 mm puts the box comfortably inside the rounding on every
 * engine and every paper size that claims to be A4. The millimetre costs
 * nothing: it sits below the footer, where there is already white space.
 */
export const PAGE_BOX_H = 296;

/** Side margin. 12 mm leaves 186 mm of column — a multiple of 6, so the
    two- and three-column grids below divide without a remainder. */
export const MARGIN_X = 12;
export const MARGIN_TOP = 10;
export const MARGIN_BOTTOM = 8;

/** The usable column. */
export const COL_W = PAGE_W - MARGIN_X * 2;
/** The usable height between the margins. */
export const COL_H = PAGE_BOX_H - MARGIN_TOP - MARGIN_BOTTOM;

/** The letterhead band at the top of every page. */
export const HEADER_H = 16;
/** The footer rule at the bottom of every page. */
export const FOOTER_H = 7;
/** What is left for content once the chrome is taken out. */
export const BODY_H = COL_H - HEADER_H - FOOTER_H;

/* ══════════════════ The ECG sheet (page 1) ══════════════════ */

/** Space reserved at the left of each strip for the calibration pulse. */
export const CAL_W = 9;

/**
 * One lead band's height.
 *
 * Chosen so SIX of them fill the body exactly rather than by taste:
 * `BODY_H` is 256 mm, six bands of 40 mm is 240 mm, and the 16 mm left over
 * carries the scale caption under the sheet. A multiple of 5 so the 5 mm
 * major grid tiles unbroken from lead I straight through to aVF, which is
 * what makes six separate SVGs read as one continuous piece of ECG paper.
 */
export const STRIP_H = 40;
export const STRIP_COUNT = 6;
export const SHEET_H = STRIP_H * STRIP_COUNT;
/** The caption strip under the sheet — scale, window, page number. */
export const SHEET_CAPTION_H = 8;

/* ══════════════════ Palette ══════════════════ */

export const INK = '#0A2540';
export const NAVY = '#0D2041';
export const SLATE = '#5A6478';
export const MUTED = '#7A829E';
export const HAIRLINE = '#DFE5EE';
export const SURFACE = '#F6F8FC';
export const PAPER = '#FFFFFF';

/** ECG paper. The brand's blue rather than the classic pink — it is what
    the web report and the on-screen viewer already print with, and a ruler
    laid on one has to agree with a ruler laid on the other. */
export const GRID_MINOR = 'rgba(0, 82, 255, 0.14)';
export const GRID_MAJOR = 'rgba(0, 82, 255, 0.30)';
export const TRACE = '#0A2540';
export const MARKER = 'rgba(47, 107, 216, 0.60)';

/** Instrument green — the same token the app draws the ECG ID in. */
/* ★ THE BRAND IS NAVY, AND THE REPORT IS NAVY.
   The first version drew a clear result in the app's instrument green.
   Reported, correctly: "green is not my brand colour." It is not — the
   wordmark is #0D2041 lettering on a #0A2540 mark with #7A829E for
   "MEDICAL", and a document with a green ring at the top of it belongs to
   some other company. Green survives ONLY as the thin reference band on the
   interval bars, where it is not identity but the universal chart
   convention for "inside the normal range". */
export const BRAND = '#0D2041';
export const BRAND_DEEP = '#0A2540';
export const BRAND_SOFT = '#EEF1F7';
export const BAND_OK = '#2E9E6B';
export const BAND_OK_SOFT = 'rgba(46, 158, 107, 0.16)';

export const BLUE = '#2F6BD8';
export const BLUE_SOFT = '#E8F0FD';

export const GOLD = '#C4881F';
export const GOLD_SOFT = '#FBF1DC';

export const RED = '#D32B21';
export const RED_SOFT = '#FBE6E4';

export const GREY_SOFT = '#EEF1F6';

/** Level → (ink, fill). One table, so the ring, the chips and the finding
    rules can never disagree about what amber means. */
export const LEVEL_COLOR: Record<string, { ink: string; soft: string }> = {
  /* Navy, not green — see BRAND above. A clear result is the brand speaking
     in its own voice; amber and red are kept because on a clinical document
     those two are not decoration, they are the convention a reader triages
     by and inventing a house colour for "act now" would cost a second. */
  clear: { ink: BRAND, soft: BRAND_SOFT },
  attention: { ink: GOLD, soft: GOLD_SOFT },
  urgent: { ink: RED, soft: RED_SOFT },
  inconclusive: { ink: SLATE, soft: GREY_SOFT },
};

/* ══════════════════ helpers ══════════════════ */

export const esc = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Millimetres, at two decimals — enough for a 600 dpi printer (0.04 mm). */
export const mm = (v: number): string => `${v.toFixed(2)}mm`;

/**
 * ★ THE GUARD THAT MAKES "no overflow between pages" A FACT, NOT A HOPE.
 *
 * Every page builder passes the heights of its own blocks. If they sum past
 * the body, this THROWS while the HTML is being built — long before a
 * printer is involved and long before anyone emails the result to a doctor.
 *
 * A silent overflow is the worst available failure here precisely because
 * it looks fine on the phone that made it: `printToFileAsync` reports
 * success, the file opens, and the damage is a lead sliced in half on page
 * two of a document somebody is about to treat a patient from.
 */
export function assertFits(page: string, blocks: number[], available = BODY_H): number {
  const total = blocks.reduce((a, b) => a + b, 0);
  if (total > available + 0.01) {
    throw new Error(
      `PDF layout overflow on "${page}": blocks total ${total.toFixed(2)} mm ` +
        `but only ${available.toFixed(2)} mm is available. ` +
        `Adjust the block heights in services/export/pdf/ — never let it wrap.`,
    );
  }
  return available - total;
}

// v1.1.0 — PAGE_BOX_H is 296, not 297: a box declared at exactly the page
//          height rounds UP to 1123 px in WebKit's print layout, overflows the
//          page by half a pixel, and that half pixel became a BLANK PAGE after
//          every sheet. Palette moved off green onto the wordmark's own navy.
// v1.0.0 — Page geometry in millimetres and the print palette. Every box has an
//          explicit height and `assertFits` throws rather than letting a page
//          overflow, which is what tore the old report across two sheets.
