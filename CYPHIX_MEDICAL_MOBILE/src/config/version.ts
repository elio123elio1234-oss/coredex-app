/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.24.2';
export const APP_BUILD_LABEL = 'Selection gets a moment of its own: the tab that lands pops';

// v0.24.2 — From a suggested "custom tab bar button with a spring" pattern.
//           Most of it this dock already had and has had for releases — it is
//           wired with `tabBar={}` (RootNavigator:96), which replaces the WHOLE
//           bar, so `tabBarButton` is never consulted by React Navigation at
//           all; `DockItem` IS the custom button, and the spring, the growing
//           backdrop and the haptics are all in. But one thing in it was real
//           and missing: **selection had no moment of its own.** The pill slid
//           and the icon filled — both STATES, not events — so committing a tab
//           felt like the bar catching up rather than like the tap doing
//           something. The tab that lands now pops its icon and label: timing
//           up (110 ms, identical every time), spring back (the only part that
//           should feel physical). Not on first paint — an app that pops its
//           tab bar while opening is announcing something nobody did.
//           ★ On the CONTENT, not on the pill, and that is arithmetic not
//           taste: the pill's scale already carries the press swell, and a hold
//           released on the OUTERMOST tab would put 1.13 and 1.10 on one
//           transform — wide enough to be cut by the bar's rounded cap. Content
//           pops inside its own item box, where nothing can clip it.
//           NOT taken from the suggestion: a per-tab translucent halo at 20 %
//           white. That is exactly the bug v0.24.1 was spent on — a highlight
//           defined relative to the material under it disappears the moment the
//           material changes. And not a persistent 1.15 scale on the selected
//           tab: at 68.9 pt of item width a permanently enlarged label is a
//           truncated label in every language, and Hebrew truncates first.

// v0.24.1 — v0.24.0 ERASED THE CURRENT-TAB INDICATOR, and the cause is worth
//           more than the fix. The pill was a TRANSLUCENT white (0.85 / 0.16).
//           It was never visible in its own right — it was visible *because it
//           was brighter than the bar*. So when the same release made the bar
//           glassier (tint 55 % → 32 %, rim removed) to look more like the
//           system's, the pill lost the only thing it was contrasting against
//           and the dock stopped showing which tab you were on. The dock's own
//           dressing destroyed the one thing it exists to show, and every
//           check available on this machine passed while it did.
//           The pill is now a SOLID colour, and it is THE SAME CONSTANT the
//           active icon's inner details are cut out in. Those two were always
//           required to match — the cut-outs sit directly on the pill — and
//           while they were merely similar they drifted with every change to
//           the bar. Now they cannot. Plus its own hairline and small shadow,
//           so it reads as a puck ON the bar rather than a lighter patch OF
//           it, which is what a system segmented control does.
//           ★ `isInteractive` IS OFF THE BAR. Reported as "no glass effect
//           like iOS has to offer". It was the one prop flagged as
//           unverifiable from Windows, and it was applied against its grain:
//           Apple's interactive glass is for a button-sized control inside a
//           glass container, not for a whole bar. The hold-and-swell is
//           Reanimated and never depended on it, so nothing was lost.
//           The rim is back too — softer on the glass path. A floating object
//           with no edge stops reading as an object over a pale backdrop.
//           ⚠️ TWO CAUSES OF "IT DOESN'T LOOK LIKE GLASS" ARE NOT IN THE DOCK.
//           (1) The phone may have no Liquid Glass at all: it needs iOS 26+
//           AND `expo-glass-effect` inside the running client. Settings ›
//           About now NAMES the material that resolved, because from a
//           Windows machine that question is otherwise unanswerable and
//           guessing at it costs a release each time.
//           (2) A material needs something BEHIND it. Apple Music's bar looks
//           like glass because artwork and lists scroll under it; this dock
//           floats over a soft flat backdrop, and glass with nothing to
//           refract renders as a plain translucent plate however it is tuned.
//           Same lesson as the blur inside a `Modal` (v0.18.0).

// v0.24.0 — THE BOTTOM DOCK STOPS BEING A PICTURE OF GLASS. It was already
//           Apple's Liquid Glass on iOS 26 and still did not feel like the
//           system's tab bar, and the reason is that glass on iOS is not a
//           LOOK — it is a material that answers your finger. Three things
//           were missing; all three are in.
//           (1) THE MATERIAL RESPONDS. `GlassSurface` gains an opt-in
//           `interactive`, which is Apple's own `UIGlassEffect.isInteractive`:
//           the glass brightens and its specular highlight tracks the touch.
//           Opt-in on purpose — a sheet you only READ that lights up because
//           a finger crossed it is noise. The dock is the one surface in the
//           app that IS the control, so it is the one caller.
//           (2) THE HIGHLIGHT FOLLOWS THE FINGER. Touch any tab and the pill
//           travels there at once; release commits, slide off and it springs
//           home. The lit icon now follows the PILL rather than the navigator
//           — which is not cosmetic: the filled icon's inner details are cut
//           out in the PILL's colour, so an icon left lit after the pill has
//           moved away would have its cut-outs sitting on glass. Screen
//           readers still hear the navigator's truth, not the preview.
//           (3) HOLD AND THE GLASS GROWS — the thing that was actually asked
//           for. Touch swells the pill 5 %, holding past 220 ms swells it 13 %
//           with a heavier haptic and grows the icon and label with it.
//           220 ms, not `delayLongPress`'s 500: that default is a threshold
//           for long-press MENUS and is far too slow to read as the surface
//           reacting to being held. And the swell is Reanimated, so ANDROID
//           GETS THE GESTURE even though only iOS 26 gets the material — the
//           material may differ per platform, the interaction may not.
//           ★ The pill is deliberately NOT a `GlassView` itself.
//           `UIGlassContainerEffect` MERGES nearby glass into one shape — that
//           is what the container is for — so glass-on-glass would dissolve
//           the pill into the bar and the selection indicator would stop
//           existing. Apple's own tab bar is one glass bar with a solid-ish
//           capsule riding on it, which is exactly what this is.
//           On iOS the bar also drops the hand-drawn 1 px rim (the material
//           lights its own edge; a second one is the tell that it is fake) and
//           takes a 32 % tint instead of the web's milky 55 % plate. The
//           border WIDTH stays, so `dockMetrics.DOCK_BAR_HEIGHT` is still
//           honest. Android keeps the web's values — an untinted BlurView over
//           a light page really is invisible (the v0.19.2 trap).
//           🔬 Unverified on a handset: the swell geometry is arithmetic
//           against the bar's `overflow: hidden` (60.0 pt inside a 65.1 pt
//           inner box), and `isInteractive` on a whole BAR rather than on a
//           button is the one judgement call here — if the entire bar bulges
//           instead of the tab, it is one prop to remove.

// v0.23.0 — The release that makes the REAL signal reachable on an iPhone,
//           plus the two gaps found while checking that it could be.
//           ★ Nothing was wrong with the ECG pipeline. The reason only a demo
//           signal was ever seen is that Expo Go contains no `cyphix-ble`, so
//           `requireOptionalNativeModule` returns null and `bleClient` falls
//           back to the simulator — exactly as designed. Reaching the hardware
//           needs a development build, which needs Xcode, which needs a Mac.
//           `IPHONE_SETUP.md` is that path written out end to end, for an
//           Intel MacBook and a FREE Apple ID, with the macOS 14.5 / Xcode
//           16.1 compatibility gate first — it is the one check that can cost
//           an evening, and it cannot be worked around.
//           (1) A STALENESS WATCHDOG. A BLE link stays "connected" while
//           delivering nothing: the phone locks, the app backgrounds, the
//           device slips. The last waveform just sits there, and a screen that
//           keeps calling it live is showing a frozen trace as a patient's
//           heart. After STREAM_STALE_MS (600 ms — six missed flushes of the
//           frozen 10 Hz cadence, so it is derived, not chosen by feel)
//           `isStreaming` goes false. AppState marks it on the way OUT to the
//           background, because a suspended app's timers do not run to notice
//           later, and only a real arriving batch clears it — saying "live
//           again" before a sample has landed is the same lie. An in-flight
//           capture is DISCARDED rather than run out against silence: ten
//           seconds of wall clock is not ten seconds of ECG, and a strip
//           padded with silence reads as asystole.
//           (2) ANDROID BLE PERMISSIONS WERE NEVER REQUESTED. The Kotlin
//           module is `@SuppressLint("MissingPermission")` and documents that
//           the UI must have asked already. Nothing asked. A manifest entry is
//           not a grant, and an unpermitted `startScan` returns no results and
//           throws no error — indistinguishable from "the device isn't here".
//           PARITY had Android as ✅; that was wrong and is corrected.
//           (3) The icon was still Expo's blue placeholder. It is now the
//           CYPHIX mark on white, rasterised by `scripts/make-icons.js` from
//           `BrandLogo`'s OWN path data — a hand-traced lookalike drifts from
//           the logo the first time either is touched.


// v0.22.0 — Two things. (1) The portrait can now be SET from the phone: the
//           avatar is a button with a camera badge — a tappable circle with
//           no affordance is a circle nobody taps — opening take / choose /
//           remove, saved to the RECORD so it shows in the browser too. The
//           sign-up wizard's photo is uploaded as well, best-effort, because
//           a failed picture must never be reported as a failed sign-up.
//           `expo-image-manipulator` is the one new dependency: the server
//           caps the data-URL at 1.5 M chars and a 12 MP square crop is
//           several times that, so it is resized to 512 px before encoding.
//           The picker's `quality` could not do it — it lowers JPEG quality,
//           never the pixel count.
//           (2) "The screen is blue and only then the picture comes up" —
//           not the file, the TIMING: nothing fetched the welcome photo
//           until that screen mounted, and in Expo Go a required asset is
//           pulled from Metro over Wi-Fi on first use. It is now warmed
//           during the splash the app already holds, and fades in over the
//           navy if it is still not ready.

// v0.21.0 — Sign-in was connected; the Profile tab was not. It read the
//           hard-coded fictitious DEMO_CARD, so a signed-in patient was
//           looking at "Test Patient Alpha". Now `usePatientCard` fetches
//           GET /patients/:id/card for the account's OWN linkedPatientId,
//           plus the portrait from /photo — which is why a picture set in
//           the browser now appears on the phone (the avatar had never
//           rendered a photo at all before, in any mode).
//           ★ A real account whose card fails does NOT fall back to the
//           demo record: printing a fictitious blood type and medication
//           list under a real person's name is the worst failure this
//           screen has. It shows a name-only card, says the record could
//           not be loaded — empty sections otherwise read as "you have no
//           conditions and no allergies" — and offers pull-to-refresh.
//           Still missing and named in PARITY: no way to SET the portrait
//           from the phone, and a clinician has no active patient yet.

// v0.20.1 — "CONNECTION ISSUE" on sign-in, and it was configuration, not code.
//           v0.20.0 pointed the app at the dev server on the laptop
//           (http://10.0.0.19:8080), which has to be running and on the same
//           Wi-Fi — and was not. The app was right: the fetch never landed,
//           so it said `network`. Now pointed at the deployed API,
//           https://cyphix-api.onrender.com, verified to be the SAME database
//           (the demo patient returns an identical user id and
//           linkedPatientId from both) and to pass the full client sequence.
//           ⚠️ EXPO_PUBLIC_* is inlined at BUNDLE time: changing .env needs
//           `npm start` restarted, not just the app reloaded.

// v0.20.0 — The app stopped having accounts of its own. With
//           EXPO_PUBLIC_API_BASE_URL set, sign-in goes to CYPHIX_SERVER — the
//           same Postgres the web app uses — so one person is one account
//           everywhere. `HttpAuthService` + a real `tokenStore` (rotating
//           refresh token in the enclave, single-flight exchange, because the
//           server kills a token family on replay) sit behind the same
//           `authService` object every onboarding step already talked to.
//           `useCurrentUser` now answers with the REAL principal when
//           connected: the server enforces RBAC and row scoping, so a client
//           claiming clinician while the server says patient only draws
//           buttons that come back 403. Offline: unchanged, demo clinician.
//           Contract verified end-to-end against the live server + DB; the
//           screens are unverified on a handset (PARITY 🔬).

// v0.19.5 — "זה לא ממורכז בכלל" was not an impression, it was arithmetic.
//           `BrandLogo`'s inherited viewBox is padded ASYMMETRICALLY: the ink
//           runs 41.34 → 181.45 inside a box declared 34 → 209, so 7.3 units
//           of air on the left against 27.6 on the right. Centre that box and
//           the artwork lands ~18 pt left of the screen's middle, and fills
//           only 80 % of the width it claims. Every other caller anchors the
//           logo to a corner, which is why it never showed before.
//           `crop` (new, opt-in, default byte-identical) draws the ink's own
//           measured box. The splash uses it and goes to 90 % of the window
//           capped at 520: 351 pt of real lockup on a standard iPhone against
//           256 pt in v0.19.4 — centred this time.

// v0.19.4 — v0.19.3 is REVERTED at the user's word: the splash is the navy
//           screen with the FULL `BrandLogo` (mark + CYPHIX + "MEDICAL")
//           again. Only the part that was actually asked for survives — the
//           size. It is 82 % of the window's width capped at 460, so ~320 pt
//           on a standard iPhone instead of the flat 210 pt that read as
//           small; a fixed point size is a guess that is right on exactly
//           one screen.
//           `CyphixLogo` is DELETED rather than left unused: three lockups
//           with only two callers is how the wrong one gets picked later.
//           It is one `git show 542a650` away if it is ever wanted.

// v0.19.3 — (superseded by 0.19.4) The splash became the mark + CYPHIX
//           lockup on WHITE. The white screen and the mark-only lockup were
//           not what the user wanted; the sizing fix from this version is
//           what carried forward.

// v0.19.2 — Two from an iPhone next to a Galaxy.
//           THE SIGN-OUT DIALOG HAD NO BACKGROUND ON iOS AND A PROPER PANEL
//           ON ANDROID, from ONE line in `GlassSurface`: the tint was passed
//           only to the BlurView branch, on the reasoning that Liquid Glass
//           "tints itself". It does not — `glassEffectStyle="regular"` with no
//           `tintColor` over a light page is very nearly CLEAR, so on iOS 26
//           the panel was really there and really invisible. The tint now
//           reaches both materials, which fixes every sheet, the dock and the
//           report bar at once — none of which had been looked at on an iPhone
//           yet. The same call now passes `colorScheme` too, so the glass
//           follows the patient's theme choice instead of the phone's.
//           ConfirmDialog is SOLID regardless: a material is for a surface you
//           look past, and this is the one surface you must look at, right
//           before something irreversible.
//           And: a typed name capitalises itself ("elio" → "Elio").
//           `autoCapitalize` only suggests a shift state to the keyboard; the
//           VALUE is normalised now. It never lower-cases, so "McDonald"
//           survives, and it splits on spaces and hyphens but not apostrophes.

// v0.19.1 — Four corrections from the first look at v0.19.0, all of them the
//           kind only a person can see.
//           1. SIGN OUT IS ON PROFILE, at the bottom, under Settings — where
//              every app a patient already uses puts it. It was in Settings
//              only, which is one screen further than anybody looks.
//           2. The welcome hero carries the TEXT-ONLY wordmark ("CYPHIX",
//              no mark, no "MEDICAL"), as the reference does: a second line
//              of type directly over a headline argues with it.
//              `CyphixWordmark` is the brand file's own path, cropped to the
//              glyphs — the A4 page it was drawn on would have rendered the
//              word as a speck.
//           3. THE PULSING ECG MARK ON THE SPLASH IS GONE. It came from the
//              reference and it is not the CYPHIX identity — a thing that
//              behaves like a logo but is not one is worse than no thing.
//              The wordmark carries the splash alone now.
//           4. The navy panel behind "Clinical-grade ECG, recorded at home"
//              is a PHOTOGRAPH of the device being used. A navy gradient
//              scrim sits between the picture and the type, clear at the top
//              and opaque at the bottom, so white text is always on navy
//              whatever the image does underneath.

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
