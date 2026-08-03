/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.19.0';
export const APP_BUILD_LABEL =
  'The app has a front door: splash, sign-in and a 13-step registration, built from the CYPHIX Onboarding reference';

// v0.19.0 — THE APP HAS A FRONT DOOR. Everything before the tabs, taken from
//           the "CYPHIX Onboarding" design reference and converted to React
//           Native: a navy splash whose ECG mark draws itself, a welcome hero,
//           sign-in (with Face ID / fingerprint where the device really has
//           one), password reset, and a registration wizard — credentials with
//           a live strength meter, phone and a six-digit code on an in-page
//           pad, then six health steps (sex, height, weight, blood type,
//           emergency contact, photo), a review screen that names what was
//           skipped, and "Profile created".
//           The reference's animations are PORTED, not approximated: `scrIn`
//           (16 px + fade, 320 ms, cubic-bezier(.22,.7,.3,1)) on every step,
//           `fadeUp` with its `both` fill mode staggering the splash,
//           `pulseRing` on two offset rings, and `sweep` drawing the trace by
//           animating strokeDashoffset — all on the UI thread.
//           What is deliberately NOT from the reference: the font (mobile
//           ships the system font per root CLAUDE.md §3.1, so the mono labels
//           keep their treatment and their tabular digits but not IBM Plex
//           Mono), and the emergency step, which types the number instead of
//           picking from the address book — a mis-tap in a list of real people
//           writes a real person into a medical record.
//           Registration is device-local for now: `authService` is the same
//           swap point the web has, accounts are held with SHA-256 digests and
//           the session token goes to the Keychain / Keystore. Sign out is live
//           in Settings — and is the only way back to the flow once it is done.

// v0.18.2 — The judder was never the animation, and v0.18.1 shortening it was
//           me guessing. ONE LINE caused it: `palette` was rebuilt inline on
//           every render of StudyViewerScreen, and it is a prop of six
//           `memo`-wrapped EcgReviewStrips — so the memo never held once, and
//           every re-render (opening a sheet, nudging a caliper, one frame of a
//           drag) re-ran `buildEcgPath` over four tiles × six leads, twice over
//           with a ghost. Memoised, the strips now skip entirely.
//           Dragging the ghost was worse still: it also re-entered
//           `useOverlayRecording`, which allocated six shifted Float32Arrays and
//           in warp mode re-ran `alignByFiducials` on all six leads — PER TOUCH
//           EVENT. A manual nudge is a pure translation, so it is now a `<G>`
//           transform at draw time and the signals are never re-derived.
//           And: leaving a comparison now leaves ghost mode with it. It did not,
//           so the "drag to move the grey trace" capsule stayed on screen with
//           nothing to drag — and the invisible full-sheet drag surface under it
//           stayed too, swallowing every touch.

// v0.18.1 — Two from the device, and one of them is me over-correcting.
//           SPEED: the scrim was a second full-screen blur under the panel's
//           own, and its opacity was ANIMATED — which makes a
//           UIVisualEffectView re-compute the whole effect every frame, and on
//           Android stacks two experimental dimezisBlurViews. That is what
//           "slow, and it flickers a bit" was. The scrim is now a plain
//           animated colour and the panel keeps the material, which is also
//           what the platform's own sheets do. Timings 260/170 → 210/140.
//           MOVING THE GHOST: the arrow pad is gone; the paper is draggable
//           everywhere again, with the labelled handle kept over it. Lining two
//           heartbeats up is judged continuously by eye, and 40 ms steps in a
//           list you have to look away at cannot close that loop. The drag was
//           never the problem — its invisibility was, and the handle fixes that
//           without taking the gesture away. The offset now reads out on screen
//           while dragging, so the sheet never has to be reopened for a number.

// v0.18.0 — Three from the device, two of them one root cause. React Native's
//           `Modal` is a SEPARATE WINDOW, and that fact caused both remaining
//           sheet complaints: (a) `UIVisualEffectView` and Android's
//           dimezisBlurView can only sample their own window, which inside a
//           Modal is empty — so every "glass" sheet shipped in v0.17.0 was, on
//           the device, exactly the grey rectangle it was written to replace;
//           (b) Modal defaults to portrait-only, so raising one while full
//           screen is landscape makes UIKit throw
//           UIApplicationInvalidInterfaceOrientation and the process DIES —
//           that is the MARKERS crash. Overlays are now rendered IN TREE
//           (`OverlayLayer`), where the page is really behind them.
//           Separately, comparison stops being three rows in the middle of the
//           filters sheet: it is its own toolbar tool and its own sheet, which
//           opens by saying what the grey trace IS and offers BUTTONS to move
//           it — one small square per tap — instead of only a drag nobody
//           could discover.

// v0.17.0 — Seven more from the device. The one that was a real bug: a
//           PanResponder rebuilt mid-gesture forgets its running totals, so a
//           dragged reference line ran away from the finger and then DELETED
//           itself on release (zero travel reads as a tap). Responders are now
//           built once and read live state through a ref. Also: every sheet
//           and dialog is a blurred glass material instead of a flat grey
//           rectangle; full screen insets the safe area (the Dynamic Island was
//           cutting the start of every trace in landscape), keeps its bar in
//           flow instead of over the paper, and carries a labelled way out; the
//           point being annotated is drawn on the trace while its sheet is
//           open; and the comparison status line is now the way in to moving
//           the ghost, which itself has a visible handle.

// v0.16.0 — Six things the device found that no compiler could. The big one:
//           NOTHING on the sheet was actually draggable, because a handle that
//           claims the gesture on MOVE loses to a ScrollView that has already
//           started panning — so grabbing a caliper scrolled the paper under
//           it. Every handle now claims on touch-down and freezes both scrolls
//           while held. Plus: the trace gets the screen back (icon toolbar,
//           one-line headline, words moved into a ⋯ sheet), a LANDSCAPE full
//           screen fitted to all six leads, the caliper readout out of the
//           trace's way, reference lines grabbable along their length, and R
//           peaks on every lead instead of only II.

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
