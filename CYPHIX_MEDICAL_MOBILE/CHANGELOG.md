# CHANGELOG — CYPHIX Medical Mobile

## v0.9.1 — 2026-08-01 — The ring comes back, and it is free

Follow-up to v0.9.0 on the user's note: keep the circle that shows how much
time is left, and tighten the seams between the traces.

### The countdown ring, at zero cost to the traces

v0.9.0 replaced the web's draining circle with a plain number to buy back the
footer. That was the right trade for the footer and the wrong conclusion about
the ring: the bar's height is set by the **Exit pill (~41 pt)**, so anything
shorter than that sits inside height the bar already had. A **40 pt ring fits
there for nothing.** The bar measures 57 pt with the ring and 57 pt without —
the traces do not pay a single point for it.

`CountdownRing` now gives a captionless ring its whole middle: the web's 0.29
number-to-diameter ratio is tuned for a 132 px ring that also carries a
caption, and at 40 pt it would have left an 11 px digit. With no caption to
share the space, the ratio is 0.40 (≈16 px). The label lives beside the ring
in the bar instead, and the ring carries an `accessibilityLabel`.

### Tighter seams

- Grid gap 10 → 6 px on short grids (< 400 pt). A phone was spending 20 of
  ~300 pt of grid on two horizontal seams, and a seam carries no signal. The
  web's 10 px stands on everything taller.
- The card's inner margin now rounds **down** (`floor(cardH × 0.06)`, was
  `round(… × 0.07)`). It is dead space between the card border and the ECG
  paper, so when it falls between two values the trace should get the spare
  point, not the whitespace.
- The stage no longer reserves the **home indicator's** inset. That pill is a
  thin translucent overlay and the grid beneath it is a display with nothing
  to tap, so reserving ~11 pt to protect a card border is a bad trade. The one
  bottom inset that IS opaque system chrome — Android's 3-button nav bar — is
  still cleared, using the same `> 40` test and for the same reason as
  `dockMetrics.dockBottomOffset`.

### Where the traces landed

Computed from the layout formulas (worst case), against the two earlier
versions:

| Device / state | v0.8.0 | v0.9.0 | **v0.9.1** |
|---|---|---|---|
| iPhone 15 Pro, recording | ~52 | 80 | **89** |
| iPhone 15 Pro, waiting | ~52 | 68 | **76** |
| iPhone SE 3rd gen, recording | ~52 | 78 | **83** |
| Pixel 7, recording | ~52 | 84 | **94** |

Widths are 311–425 pt. Net since v0.8.0: **+71 %** of trace height while
recording, with the web's countdown ring still on screen.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · geometry recomputed from the formulas, including an
Android 3-button-nav case. Still not a device test — `🔬` in `PARITY.md`.


## v0.9.0 — 2026-08-01 — A faithful port of a desktop layout is still a
##                        desktop layout

v0.8.0 got the structure right and the SCALE wrong. Every size came from the
web's CSS, which was measured on a viewport several times taller than a phone
held sideways (~390 pt). Rendered there, the chrome ate the content:

| | v0.8.0 | v0.9.0 |
|---|---|---|
| Prep photograph | ~259 × 146 | **393 × 221 – 462 × 260** |
| Trace, waiting | ~52 pt tall | **66 – 72 pt** |
| Trace, recording | ~52 pt tall | **78 – 84 pt** |

(Computed from the layout formulas for iPhone 15 Pro, iPhone SE 3rd gen and
Pixel 7, worst case — a two-line step title.)

### The set-up steps: the button was bigger than the instruction

An 18 px-padded button with 21 px text, a 34 px headline and 28 px gaps cost
~140 pt of height. On a desktop that is a tenth of the page; on a landscape
phone it is nearly half, and the photograph — the only thing step 1 has to
communicate — got what was left. You could not tell which wrist the watch was
on.

There are now two sets of metrics in `LimbPrep`, and below a 500 pt stage the
compact one applies: 13/16 button (still over the 44 pt tap-target floor),
~20 px headline, 10 px gaps, 7 px dots. **Nothing is hidden or truncated** —
the layout is identical, only tighter, and every pixel saved goes to the
picture. The headline also gets the full stage width instead of the web's
`max-width: 640px`, because at 20 px the longest step title then fits on one
line and the line it saves is worth ~30 pt of photograph.

### The live monitor: the traces are the screen now

Per the user's suggestion, **the capture clock moved into the top bar beside
the BPM**, styled the same way (big number + unit) so the two read as one
instrument panel. That was the load-bearing change: during a capture the foot
then has nothing left to say, so it is not rendered at all and the traces take
the entire screen below the bar — which is where the patient is looking during
the ten seconds that matter.

Also on a short stage:
- The bar drops its second line while idle. The instruction is not lost — the
  guide circle over the traces carries it, in bigger type. It is dropped
  rather than ellipsised: a clinical instruction cut off mid-sentence is not a
  shorter version of itself.
- The auto-arm hint is hidden while that circle is up, since the circle's
  caption already says the recording starts on its own.
- The simulation badge shortens to `SIMULATION` (full sentence kept as the
  accessibility label) so it cannot push the Exit button off the bar. It still
  says the one thing that matters.

Above `COMPACT_H` nothing changed: the desktop layout and the web's 132 px
countdown ring in the foot are exactly as they were.

`SixLeadMonitor`'s card padding now **scales** with the card instead of
stepping at 90 pt. The step was a trap: an 89 pt card drew a taller trace than
a 92 pt one, so the traces would have visibly shrunk as the layout grew.

### `npm start`: the QR pointed at a port nothing was listening on

The recurring "the QR doesn't work" had a specific cause, and it was in our
own launcher. `scripts/start.js` printed `exp://<ip>:8081` **before Expo had
bound anything**. When a Metro from an earlier session still held 8081 — which
survives closing the terminal and closing the lid — Expo asked to move to
8082, and every URL and QR already advertised pointed at a dead port. It
looked like a broken QR; it was a correct QR for the wrong port.

Rewritten (v2.0.0), and the failure cannot recur:

1. **A stale dev server on 8081 is reclaimed.** Only processes whose command
   line matches Expo/Metro are killed; anything else on that port is left
   alone and we move to the next free port instead.
2. **Nothing is printed until the server answers.** The host, port and QR all
   come from the running server's own manifest.
3. **The manifest must carry the address we launched with.** Found while
   testing this: without that check the script attached to a leftover server
   from an earlier session — on an earlier Wi-Fi network — and printed a QR
   for an IP this machine no longer had.

Two bugs were caught by that same test and are worth recording:

- `isPortFree` used `listen(port, '0.0.0.0')`, which *looks* like the careful
  version and is the broken one. Metro listens on the dual-stack wildcard
  `::`; an IPv4-only probe binds `0.0.0.0` right beside it and reports the
  port FREE. Now it binds with no host at all.
- The machine's LAN address had changed between sessions (10.0.0.19 →
  192.168.7.33), which is a second, independent way a printed QR goes stale —
  and the reason the address is re-detected on every run.

New dev dependency: `qrcode-terminal` (12 kB, no native code), so the QR comes
from the verified address rather than from Expo's own pre-bind guess.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · the layout numbers above computed from the formulas
themselves. Still not a device test — everything stays `🔬` in `PARITY.md`.


## v0.8.0 — 2026-08-01 — The exam is a port of the web again, and the flicker
##                        had a cause, not a symptom

### The rotation flicker: two writers, one iOS API

v0.7.0 said the "flicker and photo-shape were one bug" and held the first
paint back until `width > height`. That was wrong — it hid a symptom. The
device still physically rotated **landscape → portrait → landscape**, and the
holder-count in `useExamOrientation` could never fix it because the race was
never between two React effects.

`expo-screen-orientation`'s `lockAsync()` sets a **global** orientation mask
from an effect, one tick after mount. `react-native-screens` already answers
`supportedInterfaceOrientations` **per pushed view controller**. Both drive
the same iOS mechanism, so a single navigation went: push (VC says the app
default — portrait allowed) → effect sets the landscape mask (rotate) → the
push animation completes and the VC is re-queried (portrait again) → the
global mask wins once more (rotate). Three rotations.

The fix is to have exactly one writer, and to make it the declarative one:

- `LimbMeasure` declares `orientation: 'landscape'` on its `Stack.Screen`;
  the stack declares `portrait_up` for everything else.
- `useExamOrientation.ts` is **deleted**, `App.tsx` no longer calls
  `lockPortrait()`, and `expo-screen-orientation` has been uninstalled and
  removed from `app.json` — leaving it available is leaving the bug loaded.

Because the rotation is now part of the push, the exam's **first** layout pass
already measures the landscape box, which is the other half of what v0.7.0 was
working around.

### The set-up steps are the web's layout again

`LimbPrep` had grown a landscape branch that put the photograph in a left
column, the confirm button in a right rail and the Exit link adrift between
them. The exam is *always* landscape, so that was the layout every patient
got. It is gone. The screen is `.prep-stage` column for column: top bar
(Exit/Back · "Step n of 2"), a centred body of picture → title → dots, and one
full-width green confirm button at the bottom.

**Why the picture only showed its top-left corner:** the frame's shape was
derived at runtime from `Image.resolveAssetSource`, and when that gave nothing
useful the frame came out the wrong shape while `overflow: hidden` cropped the
photo to a corner. The frame is now a plain 16:9 rectangle — the constant
`.prep-image` uses — fitted into the space actually left over, with `contain`
so the worst case is a border, never a missing hand.

One deliberate departure, because a phone held sideways is wide and short:
`.prep-title`'s `clamp(23px, 5vw, 34px)` assumes the viewport's width is its
*short* edge. Here it is the long one, so 5vw pins the headline at 34px and a
three-line title eats the photograph it is captioning. The ceiling is now tied
to the stage height as well.

### Six leads, 2 × 3

The traces were stacked 6 × 1, which is the web's `max-width: 720px` fallback,
not its layout — and it gave each trace ~26px of height on a phone. They are
now the web's `repeat(2, 1fr) / repeat(3, 1fr)` grid, filled row-major
(I·II / III·aVR / aVL·aVF), with the web's own drawing ported rather than the
BeatAlign-Native reference's: 3-second window, 12/60px paper, 1 mV = 38 % of
the card, and the per-frame window-mean centring that stops the trace drifting
off the card while the 0.5 Hz high-pass settles.

The live screen around it is the web `.limb-stage` too — compact bar (title ·
BPM · red Exit pill), the trace grid, and a status foot carrying either the
heartbeat gate or the countdown ring. The circular "touch the watch" guide
overlays the traces while the gate searches, as on the web. Copy is verbatim
from `en.ts`.

Two things are scaled for the phone, both applying rules the web already
wrote for small screens: the stage padding/gap/BPM digits follow the web's own
`@media (max-width: 720px)` block (triggered on a short viewport rather than a
narrow one), and a lead card shorter than 90px halves its inner padding — the
web never meets that case, since its cards are a 110px canvas plus padding.

### Settings

Built under Profile, since there is no top-bar avatar popover on mobile to
hang it from: a full-width card at the end of the medical card opens a new
`Settings` route. Same sections, same order and the same pastel illustrations
as the web page — Appearance · Notifications · Care connection · ECG Device ·
Privacy & Security · Account · About.

New `preferencesSlice` (theme, background, notification toggles, care mode)
persisted through `@react-native-async-storage/async-storage` — **the one new
dependency**, justified because a preference that resets every launch is a
broken preference, and because tokens must stay in SecureStore rather than
being joined by non-secret settings. `PreferencesGate` hydrates before the
first paint so the app never opens light and repaints dark.

`useTheme` now resolves the stored choice first and the OS second, and every
screen that was asking `useColorScheme()` directly (dock, navigator, ECG
paper) asks `useIsDark()` instead — otherwise the toggle would leave the app
half dark.

Rows the web has and this does not, each with a reason, are recorded in
`PARITY.md`. Text size is present but deliberately different: iOS and Android
already own text size system-wide, and a second app-only scale would fight the
phone's own setting.

### Verified

`tsc --noEmit` clean · `expo export` bundles for **both** iOS and Android ·
`expo-doctor` 18/18. That means the code is well-formed, **not** that it
works: every screen here stays `🔬` in `PARITY.md` until it has been touched
on a device.


## v0.6.0 — 2026-08-01 — The core ran at double speed, and the connection
##                        animation was never ported at all

- **The core morph was exactly 2× too fast.** The CSS is
  `morphingCore 8s ease-in-out infinite alternate`, and its keyframes
  already return to the circle at 100 % (0 % circle → 40–60 % blob → 100 %
  circle) — so `alternate` replays a symmetric curve and changes nothing
  visible. v0.5 ping-ponged the 8 s clock on top of that, completing
  circle→blob→circle **twice** per cycle. The ping-pong is gone.
- **The connection animation existed in the reference and was never
  ported.** `triggerConnectionMagic()`: **70 halo dots** at 80–120 px that
  pop in place (`haloFade 1.8s`, scale 0 → 1.5 @40 % → 0, drifting 1.2×
  out, per-dot delay 0–0.4 s), plus `breatheIn 1.5s` (scale 1 → 0.92 @40 %
  → 1) on the button. Both now fire on connect.
- **Connecting cross-fades over 1.2 s** instead of snapping:
  `.hero-blob { transition: all 1.2s cubic-bezier(.25,1,.5,1) }` drives the
  scale 1 → 1.25, and the two gradients and the two core colours now
  cross-fade as `transition: background 1.2s` does. The white disc fades
  with them rather than disappearing on a boolean.
- **The device rotated three times entering the exam.** `lock on mount /
  unlock on cleanup` runs mount → cleanup → mount under Strict Mode and on
  any remount during a navigation transition — landscape, portrait,
  landscape. Now a module-level holder count with the revert deferred to
  the next tick, so a remount cancels it and the device rotates once.
  (The BeatAlign-Native reference locks landscape on this screen too —
  `MeasureScreen.js:433` — so the orientation itself was right.)
- **The greeting carries the patient's name**: `Hello {name}`, using the
  web's exact `firstName()` resolver (which keeps "Dr."/"Prof." titles).
- **No live BPM under the start button.** The web's MeasurePage does append
  one; removed here at the user's instruction — a deliberate divergence,
  recorded in PARITY.md.
- **Photographs use `contain`, never `cover`.** The frame is computed to be
  the photo's own shape, so the two agree when everything is right — but if
  the frame is ever off (a transient layout mid-rotation), `contain`
  letterboxes while `cover` crops. Cropping a patient instruction can hide
  the very thing being pointed at, so the failure mode must be a border,
  never a missing hand. The landscape text column also gives 30 px back to
  the picture, which is width-limited in that layout.

## v0.5.2 — 2026-08-01 — The frame fits the photograph, not the layout

The guide photographs are 1100 × ~615, i.e. **landscape already** (aspect
≈ 1.79). The bug was the opposite of what it looked like: the FRAME was the
wrong shape. v0.5.1 gave the picture a flex remainder — about 392 × 349,
aspect 1.12 — and `resizeMode="contain"` dutifully letterboxed a 1.79 photo
inside it, leaving wide empty bands and a small picture.

- **New `utils/fitBox`**: the largest rectangle of a given aspect that fits a
  slot. Both photo surfaces now use it.
- **The slot is measured (`onLayout`), not calculated.** No duplicated
  padding/safe-area arithmetic, and it stays right on any device.
- **The aspect comes from the asset** (`Image.resolveAssetSource`), so it
  follows the artwork if it is ever replaced instead of being a magic 16:9.
- `resizeMode` is now `cover`: once the frame *is* the photo's shape, cover
  and contain agree, and nothing is cropped or wasted.

At 844 × 390 with a 47 px side inset: prep frame **444 × 247** with a 290 px
text column beside it; portrait **350 × 195**; the measurement rail's guide
**209 × 117** inside its leftover slot.

## v0.5.1 — 2026-08-01 — Landscape screens that actually fit the screen

v0.5.0 rotated the exam but kept portrait layouts inside it. A phone in
landscape has ~390 px of HEIGHT, and both exam screens were sizing boxes as
a *fraction of the viewport* instead of from the space actually left — so
the picture ate the screen and the confirm button rendered below the bottom
edge. On a screen whose entire job is "press to continue", that reads as a
broken app.

- **`LimbPrep` gets a real landscape layout**: picture on one side, title +
  dots + confirm on the other. The picture is `flex`, so it takes what is
  left over after the button is placed rather than claiming `54vh` up front.
  Portrait is unchanged.
- **The measurement rail** sized its guide photograph `16:9` at full rail
  width — 130 px that, added to the fixed rows, overflowed the 390 px rail.
  It is now `flex: 1` and absorbs only the remainder.
- **The monitor** is sized from `height − padTop − padBottom`, and the stage
  finally has bottom padding at all.
- **The notch is on a SIDE in landscape.** `PatientShell` and `EcgReport`
  used a flat `paddingHorizontal: 20`; both now take `max(insets.left/right,
  20)`, so nothing sits under the cutout.

Verified arithmetically at 844×390 with a 47 px side inset: prep picture
392×349 with the button placed, monitor 508×361 (six 55 px cards), guide
117 px with 244 px of fixed rows above it.

## v0.5.0 — 2026-08-01 — Smooth, glass, landscape, and the real photographs

- **The blob stuttered because it was animated by React.** v0.4 drove the
  morph from `setInterval` + `setState` at 25 Hz — a re-render and a
  JS-thread path rebuild every frame, with 65 separately-animated particle
  views competing for the same thread. Now two Reanimated clocks run on the
  UI thread and every shape is a `useDerivedValue`; the builders in
  `blobShape.ts` are worklets returning `SkPath`. React renders the button
  once and then never again while it animates. The particle clock's period
  (42 s) is an exact multiple of every dot duration, so the field loops
  seamlessly instead of reseating once a minute.
- **The dock is real glass now.** The cause was platform-specific and
  invisible from Windows: **`expo-blur` does not blur on Android at all**
  without `experimentalBlurMethod="dimezisBlurView"` — it draws a flat
  translucent rectangle, a literal imitation of glass. New `GlassSurface`
  atom resolves the best available material: Apple's **Liquid Glass**
  (`expo-glass-effect`) on iOS 26+, a genuinely blurring BlurView
  everywhere else. The `require` is guarded because
  `expo-glass-effect`'s iOS entry calls `requireNativeViewManager` at
  module scope and throws in clients that lack it.
- **The exam is landscape**, locked from the moment the route mounts — set-up
  photographs included, so the phone is already rotated before the patient's
  hands are occupied. `app.json` moves to `"orientation": "default"` and the
  rest of the app opts back in to portrait from `App.tsx`; pinning the
  manifest to `"portrait"` would make `lockAsync` fail silently in a real iOS
  build while still working in Expo Go.
- **The six leads are on ECG paper**, ported from the BeatAlign-Native
  reference (`SixLeadDisplay.js`): a card per lead, minor grid every 16 px,
  major every 80 px, label chips, 1 mV = 35 % of card height, traces at
  `#1e3f66`. The one thing deliberately NOT copied from the reference is its
  signal path — it filters six leads independently, which breaks the
  Einthoven identities on the derived four. We keep filter-two-derive-six.
- **The set-up steps use the web's own photographs.** `assets/guides/` now
  carries `ecg-limb-step1-wear`, `-step2-rest` and `-step3-touch`, and the
  frame matches `.prep-image` (16:9, radius 28, `contain`). Drawing SVG
  diagrams instead was the wrong call: a patient shown a photograph on the
  web and a line drawing on the phone is being told two different things
  about how to hold a medical device. The step-3 photograph now also appears
  on the live screen while the gate searches, as it does on the web.
- **Prep screen no longer reserves space for a dock that isn't there.**
  `PatientShell` took the dock's ~99px footprint unconditionally, but the
  exam route is stacked above the tab navigator. New `dock` prop, defaulting
  to `chrome`.
- **The report's heart rate comes from the Pan-Tompkins gate**, not the BLE
  client's threshold detector. `useLimbRecorder` documented this preference
  from the start; the screen never passed the value.

## v0.4.1 — 2026-07-31 — The button was dead; the dock floated too high

Both defects were reported from a device. Neither was visible to a
typecheck, a bundle or `expo-doctor`, which is the point: those three
gates say the code is well-formed, not that the app works.

- **"Start Demo" did nothing.** The tap target was a `Pressable` wrapped
  *around* the Skia `<Canvas/>`. A Skia canvas is a native view that can
  claim the touch itself, and when it does the enclosing `Pressable` never
  fires — a button that looks alive and is not. The hit layer is now an
  empty `Pressable` laid **over** the canvas, with every visual layer
  (`idleDisc`, particles, canvas) marked `pointerEvents="none"`, so the
  press no longer depends on how the renderer handles touch. Added the
  haptic and the `:active` 0.96 press-scale that were missing with it.
- **The dock floated 46px up on an iPhone; the web sits at ~20px.** The
  offset was `insets.bottom + 12`, adding the whole safe-area inset on top
  of the web's `bottom: clamp(12px, 2.4vh, 24px)` — the inset was already
  the thing that clamp is measured against. Ported literally now, with one
  exception that genuinely needs it: Android's opaque 3-button navigation
  bar (`insets.bottom > 40`), which the dock must clear. A home indicator
  or gesture pill is a thin overlay the pill may float over, exactly as the
  web does in mobile Safari.
- **The bar is 67px tall, was 77px.** Height is set by the tallest item,
  which is Home. `.dock-item--home .dock-item-icon svg` sizes it at
  `clamp(28px, 7.6vw, 33px)` — a rule written for the desktop dock that
  reaches the phone breakpoint only because its specificity (0,2,1) beats
  the media query's `.dock-item-icon svg` (0,1,1). Honouring the intent of
  the `≤480px` block instead: Home 26px (still clearly emphasized against
  the others' 20px), padding 6px. Deliberate departures from a literal
  copy, documented as such in `dockMetrics.ts`.
- **Sizes and offsets now live in one file**, `navigation/dockMetrics.ts`,
  imported by both the dock that draws it and the shells that must keep
  content clear of it. `PatientShell` and `ProfileScreen` were each adding
  `insets.bottom` on top of a hard-coded 74px clearance — double-counting
  the safe area and squeezing the screen.

## v0.4.0 — 2026-07-31 — The animations, actually ported

**Why:** v0.2.0–v0.3.0 claimed the hero button was "ported 1:1". It was not —
the blob was a React Native `borderRadius` approximation and the core was a
plain circle. The shapes were wrong, and describing them as ported was wrong.

- **The blob is now the real CSS shape.** `border-radius: 43% 57% 41% 59% /
  54% 43% 57% 46%` is an *elliptical* radius — a horizontal AND a vertical
  radius per corner. RN's `borderRadius` has one value per corner and
  structurally cannot express it, which is why the approximation read as a
  rounded rectangle. `blobShape.ts` builds the true outline as four
  quarter-ellipse cubics and Skia draws it; `@keyframes morphingBlob` is
  copied verbatim and its eight numbers are interpolated per frame.
  Verified numerically: at 0% the top-left corner is 51.60px horizontal ×
  64.80px vertical on a 120px box — the asymmetry the old version flattened.
- **The core morphs for real too** — the two `clip-path` outlines of
  `@keyframes morphingCore` interpolate control point by control point, with
  its `translate(2px, 3px)` and 1.22× peak, alternating like the CSS.
- **Fills are the CSS gradients**, not flat colours: `#e5e5ea → #f2f2f7`
  disconnected, `#1e3f66 → #0A2540` connected, both at 135°.
- **Particles start mid-flight.** The web uses a negative `animation-delay`
  so the field is already in motion on the first frame; Reanimated has no
  negative delay, so each dot now runs a partial first pass before looping —
  no synchronised "burst" on mount.
- **Dock rebuilt to the exact `layout.css` phone numbers.** The real error was
  icon size: the web draws every icon at 20px *except Home*, whose own rule
  (`clamp(28px, 7.6vw, 33px)`) has higher specificity and beats the ≤480px
  media query. Rendering all five at one size is what made the bar read as a
  heavy slab; v0.3.0 then over-corrected by shrinking the whole bar. Now:
  20px icons, ~30px Home, 8px item padding, 3px gap, 11px/1.1 labels, 7px bar
  padding — the bar's height follows from those, as it does on the web.

## v0.3.0 — 2026-07-31 — The whole HOME pipeline, and the Profile card

**Why:** v0.2.0 had the right chrome but the Home tab was a dead end — the
button connected a toy simulator and nothing followed it. This makes the tab a
working product: connect, set up, measure, read the report.

- **★ The signal chain now LIVES IN `CYPHIX_SHARED`.** `filterDesign`,
  `ecgDSP`, `qrsValidator`, `ecgSimulator`, `reportFilter`, `ecgAnalysis` and
  the measurement constants were copied there verbatim and are consumed by
  mobile. This is the root `CLAUDE.md` §2.3 rule made real: mobile does not
  re-derive the frozen maths, it runs the identical code, so a waveform is
  bit-identical across platforms. **The web still has its own copy** — until it
  is migrated, an edit to either must be made in both (tracked in PARITY.md).
- **Background default corrected to flat gray `#E7EAEF`.** `BackgroundProvider`
  sets `DEFAULT_BG = 'gray'`; the wavy teal field is an opt-in style. v0.2.0
  shipped waves as the default, which made the app read as a different product.
- **Dock height** rebuilt from the web's *phone* breakpoint (≤480px: 20px icons,
  8px padding) instead of its desktop one — the first bar used 28px icons and
  read far too tall.
- **Measurement pipeline** (`Home → Start Test`): the two-step `LimbPrep`
  set-up gate, then the live six-lead Skia monitor, then a 10 s capture that
  **arms itself** the moment the frozen Pan-Tompkins gate proves a real,
  regular heartbeat — because the patient's hands are holding the electrodes
  and physically cannot press Record. `HeartbeatSearch` keeps the gate's
  reasoning on screen so it is never a black box; `CountdownRing` shows the
  capture. The exam is a full-screen route above the tabs, with the back
  gesture disabled, mirroring the web's immersive `isExam` shell.
- **Report**: six filtered strips plus the shared analysis sheet (rate,
  rhythm, axis, PR/QRS/QT/QTc, beats, quality). Every measurement is nullable
  and renders "—" rather than a guess. A simulated recording is banner-labelled.
- **BLE layer** rebuilt to web parity: `BleProvider` holds ONE client above the
  navigator so a connection survives navigation and the ring buffer is not
  reset mid-recording; `useBle` now exposes the web's exact surface
  (`subscribe`/`getBuffer`/`connectSimulator`/`isSimulated`/…), which is what
  let the two measurement hooks port across essentially unchanged.
- **Profile**: the medical card ported from `PatientProfilePage` — identity
  header, Details, Conditions, Allergies, Medications, Family history,
  Emergency contact, Care team, Recent activity. Clinical codes render as
  coded chips, never free text. The demo patient is the web's own fictitious
  `mock-0001`, assembled from its seed files so both platforms show the same
  content until `profileApi` is wired.

## v0.2.0 — 2026-07-31 — The web app's actual design, ported

**Why:** v0.1.0 shipped a generic scaffold — system-font wordmark, stock
Ionicons, a tab bar welded to the screen edge, placeholder screens. That is not
what the product looks like. This release ports the real design surface so the
app reads as the CYPHIX web app opened on a phone.

- **Logo**: the real CYPHIX wordmark. SVG path data copied verbatim from the
  web `BrandLogo.tsx` into react-native-svg. The web's inner drop-shadow filter
  has no react-native-svg equivalent and was dropped — a 15%-opacity detail
  invisible at this size. It floats top-start and whitens on dark, as on the web.
- **Backdrop**: the teal wavy hero field — the five ribbon paths verbatim from
  `HeroBackdrop.tsx`, over the `.main--full` gradient, both themes.
- **Bottom dock**: floating frosted-glass pill, not an edge-welded bar.
  `expo-blur` provides what `backdrop-filter: blur(22px) saturate(1.6)` does on
  the web; a single highlight springs behind the active tab; icons fill in with
  their inner details cut out in the pill colour; Home is emphasized in the
  centre. Order matches `dockConfig.tsx`: History · Tests · **Home** · Chat ·
  Profile. Live Scan stays out, exactly as on the web.
- **Nav icons**: all five ported verbatim from the web `NavIcon/` set (v4),
  keeping each icon's own fit transform and stroke weight.
- **Home**: greeting + the ported HeroBlobButton — white orb, 65 emitting
  particles while disconnected, morphing navy blob once connected, status stated
  in words. The web animates the blob with asymmetric `border-radius`, which RN
  cannot express; per-corner radii on the same 8 s cycle read the same in motion.
- Screens draw full-bleed under the floating dock; the scaffold's
  `ScreenScaffold`, `MeasureScreen`, `LiveScanScreen`, `PatientsScreen`,
  `SettingsScreen` and `BrandWordmark` are removed.

## v0.1.0 — 2026-07-31 — Mobile bootstrap (iOS + Android from one codebase)

**Why:** the platform needed a mobile surface that cannot drift from the web
app. Everything shared was pulled into `CYPHIX_SHARED` first so a single
definition serves all three platforms, and the Cross-Platform Rule was written
into the root `CLAUDE.md` before any feature code was added.

- **Project**: Expo SDK 54 / React Native 0.81.5 / React 19.1, TypeScript strict.
  `expo prebuild` (CNG) — `ios/` and `android/` are generated, never hand-edited.
  Scaffolded on SDK 57 and **deliberately pinned back to 54**: the Expo Go app in
  the App Store runs exactly one SDK (`expoGoSdkVersion` in the Expo versions API,
  54.0.0 today) and lags npm's `latest` by several releases, so SDK 57 could not
  open on a phone at all. 54 keeps the whole UI previewable in Expo Go; the
  native BLE module needs a development build on any SDK.
- **Shared core** (`../CYPHIX_SHARED`): ECG domain types, the frozen ESP32 BLE
  protocol (UUIDs, 320 Hz, 5 B/9 B packet parser, int16 rail constants), and the
  API request/error envelope. Wired into Metro (`watchFolders` + alias) and
  tsconfig `paths`.
- **Native BLE bridge** (`modules/cyphix-ble`): Swift `CyphixBleModule`
  (CoreBluetooth) and Kotlin `CyphixBleModule` (BluetoothGatt). Both parse
  notifications on their own thread and flush batched millivolt samples to JS at
  10 Hz — the JS thread never sees per-sample traffic.
- **Simulator fallback**: `EcgSimulator` produces a synthetic P-QRS-T trace when
  the native module is absent (Expo Go / emulator). The UI badges it `SIMULATED`
  so it can never be mistaken for a measurement.
- **State**: Redux Toolkit + RTK Query, same shape as web — but in `src/store/`,
  not web's `src/app/`, because Expo's CLI claims a top-level `app/` directory as
  the Expo Router route root. `httpBaseQuery` is a
  behavioural twin of the web one (bearer auth, single-flight 401→refresh→retry,
  `{ status, message }` errors). Tokens live in SecureStore (Keychain/Keystore),
  never AsyncStorage.
- **UI**: brand tokens ported 1:1 from `tokens.css` (light + dark, OS-driven);
  the web sidebar becomes a platform-adaptive bottom tab bar with the same five
  modules and feature flags; haptics on primary actions; Skia renders the live
  Lead II sweep.
- **Waveform**: `EcgWave` decimates with min/max per pixel column, not every Nth
  sample — plain subsampling walks over the R peak and makes the QRS shrink and
  flicker between frames. A trace must never render smaller than the data.
- **Screens**: Measure (patient-first: connect card, live wave, HR), Live Scan,
  History, Patients, Settings. Placeholders state honestly what is not yet
  ported rather than faking it — tracked in `PARITY.md`.

<!-- v0.1.0 -->
