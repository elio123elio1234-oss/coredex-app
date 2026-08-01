/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.8.0';
export const APP_BUILD_LABEL =
  'exam rebuilt from the web 1:1 — one rotation, 2×3 lead grid, Settings under Profile';

// v0.8.0 — v0.7.0 blamed the flicker on laying out mid-rotation and only hid it.
//          The cause was two writers of the same iOS orientation API; the
//          imperative lock is gone. LimbPrep and the live monitor are now ports
//          of the web layouts, and Settings has been built.
