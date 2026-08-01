/* ==================================================================
   Dock metrics — ONE source for the bar's size and its distance from the
   screen edge, so `BottomDock` (which draws it) and `PatientShell` (which
   must keep content clear of it) can never disagree.

   ── Where these numbers come from ──
   `layout.css`, phone breakpoint (`@media max-width: 480px`):

     .bottom-dock        bottom: clamp(12px, 2.4vh, 24px)
     .bottom-dock-inner  padding 7px · gap clamp(2px, .8vw, 8px) · radius 999
     .dock-item          padding 8px · gap 3px · min-width 52px
     .dock-item-label    11px / line-height 1.1
     .dock-item-icon svg 20px
     .dock-item--home …  clamp(28px, 7.6vw, 33px)   ← a DESKTOP rule that
                                                      leaks into the phone
                                                      breakpoint on specificity

   Two deliberate departures from a literal copy, both because a phone is
   not a browser window:

   1. HOME_ICON is 26, not ~30. Because every item stretches to the tallest,
      Home's icon alone sets the bar's height — on the web it makes the pill
      ~77px tall on a phone-width viewport. That rule was written for the
      desktop dock and reaches the phone breakpoint only because
      `.dock-item--home .dock-item-icon svg` (0,2,1) outranks the media
      query's `.dock-item-icon svg` (0,1,1). Honouring the *intent* of the
      breakpoint keeps Home clearly emphasized (26 vs 20) without the bar
      eating the bottom of the screen.
   2. Padding is 6, not 7/8 — the same trim, applied where it costs nothing.

   Net: 67px tall instead of 77.
   ================================================================== */

/** .bottom-dock-inner padding */
export const BAR_PADDING = 6;
/** .dock-item padding */
export const ITEM_PADDING = 6;
/** .dock-item gap (icon → label) */
export const ITEM_GAP = 3;
/** .dock-item min-width */
export const MIN_ITEM_W = 52;
/** .dock-item-label font-size */
export const LABEL_SIZE = 11;
/** .dock-item-label line-height 1.1 */
export const LABEL_LINE = 12.1;
/** .dock-item-icon svg at the phone breakpoint */
export const ICON = 20;
/** Home stays emphasized, but no longer drives the bar's height. */
export const HOME_ICON = 26;
/** .bottom-dock-inner border */
export const BORDER = 1;
/** Max pill width so the dock never spans a tablet edge-to-edge. */
export const MAX_BAR_W = 420;

/** Every item stretches to the tallest — which is Home's larger icon. */
export const DOCK_ITEM_HEIGHT = ITEM_PADDING * 2 + HOME_ICON + ITEM_GAP + LABEL_LINE;

/** The glass pill's own height. */
export const DOCK_BAR_HEIGHT = DOCK_ITEM_HEIGHT + BAR_PADDING * 2 + BORDER * 2;

/** .bottom-dock { gap: clamp(2px, 0.8vw, 8px) } */
export function dockGap(screenW: number): number {
  return Math.min(8, Math.max(2, screenW * 0.008));
}

/**
 * How far the pill floats above the screen edge.
 *
 * The web's `bottom: clamp(12px, 2.4vh, 24px)` is measured from the viewport
 * edge, so the port must be too — adding the whole safe-area inset on top
 * (which an earlier version did) parked the dock 46px up on an iPhone, more
 * than twice as high as the web, and that is what made it read as floating
 * too high.
 *
 * The one case that DOES need the inset is Android's 3-button navigation bar,
 * which is opaque system chrome the dock must sit above. A home indicator or
 * a gesture pill is a thin overlay the pill may float over, exactly as the
 * web does in mobile Safari.
 */
export function dockBottomOffset(insetBottom: number, screenH: number): number {
  const web = Math.min(24, Math.max(12, screenH * 0.024));
  return insetBottom > 40 ? insetBottom + 8 : web;
}

/** Vertical space a screen must leave free at the bottom (bar + float + air). */
export function dockFootprint(insetBottom: number, screenH: number): number {
  return DOCK_BAR_HEIGHT + dockBottomOffset(insetBottom, screenH) + 12;
}

// v1.0.0 — Single source for dock size + float; fixes the double-counted safe area.
