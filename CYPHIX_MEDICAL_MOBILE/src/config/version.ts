/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.15.0';
export const APP_BUILD_LABEL =
  'Scan History: list → study viewer, touch calipers, marks, cursors, compare, CSV/EDF/PDF export';

// v0.15.0 — The History tab becomes the module it is on the web. Captures file
//           themselves into an on-device store the moment an exam ends; the tab
//           lists them from a cached summary; opening one gives a tiled vector
//           sheet at the frozen 25 mm/s · 10 mm/mV with the whole web toolbox
//           re-thought for a finger: draggable calipers, tap-to-mark, reference
//           lines, a ghost trace with three alignments, filter stages, and
//           export by share sheet (CSV, EDF+, a built PDF). Every tool is behind
//           the same RBAC permission the web checks, and every read, write,
//           export and delete is audit-logged.

// v0.14.0 — The floating CYPHIX wordmark in the top-start corner is behind
//           `SHOW_SHELL_WORDMARK` and currently off, at the user's request.
//           Hidden, not deleted — and the 70pt of padding that existed only
//           to clear it follows the same switch, so nothing reserves space
//           for something that is not drawn.

// v0.13.0 — The app gets an i18n layer mirroring the web's: a language
//           registry, en/he locale tables typed against each other, a provider
//           backed by the pre-hydrated preferences slice (so the first paint is
//           already in the right language), and a Language picker at the top of
//           Settings → Appearance. Every user-facing string now comes from the
//           locale; adding a third language is one new file plus three lines.
