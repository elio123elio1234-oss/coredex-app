# CHANGELOG — CYPHIX Medical Mobile

## v0.24.0 — 2026-08-03 — The dock stops being a picture of glass

The request was: on the iPhone, make the bottom bar Apple's native glass — and
make it behave like the system does when you pick something, where holding an
element makes the glass grow, the way WhatsApp does it.

### The finding: the bar was already Liquid Glass, and that was never the point

`GlassSurface` has resolved to `expo-glass-effect`'s `GlassView` on iOS 26 since
v0.19.2, so the dock has been rendering Apple's real material for several
releases. It still did not feel like the system's tab bar, and holding a tab did
nothing at all.

The reason is that **glass on iOS is not a look, it is a material that answers
your finger.** A `UIVisualEffectView` that never reacts to a touch is a
photograph of glass, and the eye reads the difference immediately even when it
cannot name it. Three separate things were missing, and none of them is a tint.

### 1. The material itself responds — `UIGlassEffect.isInteractive`

`GlassSurface` gains an optional `interactive` prop that maps to Apple's own
`isInteractive`. With it on, the glass brightens and its specular highlight
tracks the touch inside it. This is the system behaviour, not an approximation
of it — there is nothing to hand-animate.

It is **opt-in, defaulting off**, and that is deliberate: a sheet or a report
bar is a surface you look *past*, and one that lights up because a finger
crossed it on the way somewhere else is noise. The dock is the one surface in
the app that *is* the control, so it is the one caller. On the BlurView
fallback the prop is a no-op — that material has no touch model to hook.

### 2. The highlight follows the finger, not the router

Touch down on any tab and the pill travels there immediately; releasing commits
the navigation, sliding off the bar springs it home after 140 ms.

The lit icon now follows the **pill** (`lit`) rather than the navigator
(`selected`), and that is not cosmetic. A filled icon's inner details are cut
out in *the pill's colour* so they read against it — that is how the whole icon
set works. Had the pill travelled under a finger while the filled icon stayed
on the old tab, that icon's cut-outs would have been sitting on glass instead of
on the pill, which on the dark theme is a visibly broken shape. Following the
pill makes the two structurally unable to disagree.

Accessibility keeps the router's truth: `accessibilityState.selected` still
reports what is actually selected. A preview under someone's thumb has not
selected anything, and announcing that it has would be a lie.

### 3. Hold, and the glass grows — the part that was actually asked for

Touch swells the pill by 5 %. Keep holding past **220 ms** and it swells to
13 % with a heavier haptic, and the icon and label grow with it (7 %, slightly
less and slightly slower, so the surface leads and the content follows — the
order the eye reads as one object moving rather than two).

Two decisions worth writing down:

- **It is not wired to `onLongPress`.** React Native does not fire `onPress`
  after `onLongPress` has fired, so that wiring would produce a hold that grows
  the glass and then navigates nowhere — a tab bar ignoring the very gesture it
  just animated. The hold is timed by the dock instead, and releasing selects
  the tab no matter how long you held it.
- **220 ms, not `delayLongPress`'s 500 ms.** That default is the threshold for
  a *different* gesture (long-press menus). At half a second the growth reads as
  something announced after the finger rather than caused by it.

The swell is Reanimated, on the UI thread, so **Android gets the gesture too**
even though only iOS 26 gets the material. The material may differ per platform;
the interaction may not.

### ★ Why the pill is not itself a `GlassView`

The obvious implementation — make the sliding highlight a second piece of glass
— is wrong, and it would have looked correct in every check available on this
machine. `UIGlassContainerEffect` **merges** glass elements that come near each
other into one continuous shape; that is what a glass container is *for*. A
glass pill inside a glass bar dissolves into the bar, and the selection
indicator stops existing.

Apple's own tab bar does what this one now does: **one** glass bar, with a
solid-ish capsule riding on it.

### Dressing, per material

On the Liquid Glass path the bar drops the hand-drawn 1 px rim — the material
lights its own edge, and a second edge over it is the tell that it is not really
glass — and takes a 32 % tint instead of the web's milky 55 % plate, which is
what was making it read as a white plastic bar rather than as glass. The border
*width* stays, so the bar is still exactly the height `dockMetrics` promises.

Android and older iOS keep the web's values unchanged. That is the v0.19.2 trap
in the other direction: an untinted blur over a light page is very nearly
invisible, so the two materials genuinely need different numbers to look like
the same design.

### Structure

`DockItem` is now its own molecule, wrapped in `memo`. The dock re-renders on
every touch-down, hold and release now that the highlight is previewed in state,
and without a memo boundary that is five SVG re-renders per press for the one
tab that changed.

### 🔬 What a device still has to confirm

Typecheck, both bundles and `expo-doctor` all pass, and none of them can see
any of this. Specifically unverified:

- **`isInteractive` on a whole bar** rather than on a button-sized control is
  the one judgement call here. If the entire bar bulges toward the touch instead
  of the tab, it is one prop to remove.
- **The swell against `overflow: hidden`** is arithmetic, not observation: at
  13 % the pill grows to 60.0 pt inside a 65.1 pt inner box, and horizontally to
  ~4.5 pt short of the rounded cap on the outermost tabs. It should press
  against the container without being cut by it.
- Whether the pill travelling on touch-down reads as responsive or as jumpy.

## v0.23.0 — 2026-08-03 — The road to a real signal on an iPhone, and two things found while checking it

### 0. The finding that reframes the request: the pipeline was never the problem

The report was "there is only a demo signal, never the real one from the
hardware". The reasonable reading is that something in the ECG path is broken.
It is not. Every piece exists and is correct — the Swift/CoreBluetooth module,
the Kotlin one, the frozen packet contract, the raw ring buffer, the live
display filter, the analysis on raw. Checked against the firmware too: it
advertises the service UUID the native scan filters on, and sends 16 samples ×
9 bytes (int32 µV) at 20 Hz with MTU 185 — exactly what the modules decode.

The real cause is one line, working as designed:

```ts
export const CyphixBleNative = requireOptionalNativeModule('CyphixBle'); // null in Expo Go
```

**Expo Go cannot contain this app's native code.** It is a pre-built app from
the App Store carrying only the modules Expo shipped in it, so `cyphix-ble` is
absent, the handle is null, and `bleClient` falls back to `EcgSimulator` — the
documented fallback (mobile CLAUDE.md §4). No amount of work inside the app can
change that. Reaching the hardware requires a **development build**, which
requires Xcode, which requires a Mac. That is the whole story.

So the deliverable is the path, not a patch: **`IPHONE_SETUP.md`**, written end
to end for a Windows developer, an **Intel** MacBook and a **free** Apple ID.
The compatibility gate is deliberately §1, before anything is installed: Expo
SDK 54 / RN 0.81 needs Xcode 16.1+, which needs macOS 14.5+, and Apple does not
let a newer Xcode onto an older macOS. An Intel Mac from 2018 or later is fine;
2017 and earlier is a dead end with no workaround inside the project, so the
alternatives are named honestly instead — including that the EAS cloud-build
escape hatch needs the **paid** account, so it is not a free substitute.

It also documents the two things most likely to waste an evening: `.env` is
git-ignored and therefore does **not** arrive with the clone, and a Debug build
is tethered to Metro — hardware testing away from the desk wants
`--configuration Release`.

### 1. A frozen trace stopped being called live

Checking whether the link could be trusted surfaced a real gap against root
CLAUDE.md §3.2, which requires exactly this and had no implementation.

A BLE link stays `connected` while delivering nothing — the phone locks, the
app backgrounds, the device slips off the patient, the ESP32 browns out. In
every case the last waveform stays on screen. A screen that keeps calling that
live is presenting a frozen trace as a patient's heart.

`STREAM_STALE_MS` is **derived, not chosen**: the firmware notifies every 50 ms
and the native bridges flush at 10 Hz, so a healthy link delivers something
every ~100 ms; 600 ms is six missed flushes. It lives in `CYPHIX_SHARED` beside
the cadence it comes from, so web and mobile cannot drift.

Three details that are the difference between a watchdog and a decoration:

- **AppState marks stale on the way OUT.** A suspended app's timers do not run,
  so the interval cannot be relied on to notice afterwards.
- **Only a real arriving batch clears it.** Announcing "live again" on
  foreground, before a sample has landed, is the same lie in the other
  direction.
- **`isStreaming` now means samples are arriving**, not that the link is up —
  and an in-flight capture is **discarded**. Ten seconds of wall clock is not
  ten seconds of ECG; a strip padded with silence reads as asystole.

### 2. Android BLE permissions were never requested — and PARITY said ✅

`CyphixBleModule.kt` is annotated `@SuppressLint("MissingPermission")` and its
header states the UI must have obtained the runtime grants before `connect()`.
Nothing ever did.

A manifest declaration is not a grant. Since Android 6 the user must be asked at
runtime, and an unpermitted `startScan` **returns no results and throws no
error** — which on screen is indistinguishable from "the device isn't here".
The request now runs in `bleClient.connect()` via React Native's own
`PermissionsAndroid` (no new native dependency), splitting on API 31: `BLUETOOTH_SCAN` +
`BLUETOOTH_CONNECT` from Android 12, `ACCESS_FINE_LOCATION` below it. A refusal
says which thing was refused, because "Bluetooth error" sends someone to check a
battery for a problem that is in Settings.

The PARITY row claiming Android ✅ was wrong and is corrected to 🔬.

### 3. The app has its own icon

It was still Expo's blue placeholder — the one with the construction guides.
It is now the CYPHIX mark on white, with the Android adaptive and themed layers
and the favicon regenerated to match.

`scripts/make-icons.js` renders them from **`BrandLogo`'s own path data**,
copied verbatim, rather than from a redrawn lookalike that would drift from the
logo the first time either was touched. The counter-dot is punched through as
real transparency on the layers that need it (the themed Android icon is tinted
by the system, so a filled dot would tint too), while `icon.png` is fully
opaque, since iOS rejects an alpha channel.

Two sizing decisions worth keeping: the square icon fills 60 % — iOS masks to a
squircle and an organic mark needs real air — and the Android foreground fills
only 42 %, because an adaptive icon's outer third is croppable and only the
inner 66 % is guaranteed visible.

> **Not verified on a device.** Per root CLAUDE.md §6.4, typecheck and bundle
> prove the code is well-formed, not that it works. The Swift module has still
> never run against the hardware — that is what `IPHONE_SETUP.md` exists to
> make possible, and every row here stays 🔬 in `PARITY.md` until someone has
> held the phone.

## v0.22.0 — 2026-08-03 — You can set your portrait from the phone, and the welcome photo stops arriving late

Two things, one asked for and one reported.

### 1. The portrait can be changed from the phone

v0.21.0 could *show* a portrait but not set one, which is half a feature. Now
the avatar is a button — with a camera badge, because a tappable circle with no
affordance is a circle nobody taps — opening **take a photo / choose from
library / remove**. It saves to the **record, not the device**, so a picture
taken on the phone shows up in the browser, and the sheet's copy says so: a
patient deciding whether to put their face on a medical record deserves to know
where it goes.

The photo the **sign-up wizard** collects is now uploaded too, right after the
account exists — it could not travel in the registration body, which has no
patient id yet. That upload is deliberately best-effort: the account and the
session are already created by the time it runs, so a failed picture must never
be reported as "sign-up failed". The patient lands with initials and a working
picker, which is the only reason swallowing that error is acceptable here.

**One new dependency: `expo-image-manipulator`.** The server caps the portrait
data-URL at 1 500 000 characters, and a square crop off a 12 MP sensor is
several times that once base64 adds a third on top — so uploading what the
picker returns would fail on exactly the good cameras. The image is resized to
**512 px** on-device first (~40 KB, about 3 % of the cap). The picker's own
`quality` option could not do this: it lowers JPEG quality, never the pixel
count, which is the expensive part. The web does the equivalent on a canvas;
React Native has none.

Three failures, kept apart because they need different answers: the OS
**refused** (a decision, not an error — the message says where to change it),
the image could not be **encoded**, and the **upload** failed (the optimistic
cache patch rolls back, so the old portrait returns instead of the new one
appearing to have stuck). Changing it is audited as `patient:update` — the
reference, never the image.

Verified against the deployed API: PUT a portrait → 200, GET returns it
**byte-identical**, remove → 200, GET → null, and the demo account is left
exactly as it was found. A 1.6 M-character upload really is refused with 400,
which is the check that makes the resize load-bearing rather than tidy.

### 2. "The screen is blue and only then the picture comes up"

Correct, and it was not the file — 1400 × 1066, 176 KB is modest. It was the
**timing**: nothing asked for the image until `WelcomeStep` mounted, so the
fetch *and* the decode happened while the patient was already looking at the
screen. In **Expo Go**, where it was noticed, it is worse: a `require`d asset is
not bundled into the client, it is pulled from the Metro dev server over Wi-Fi
on first use — so the very first screen of the app pays a network round trip for
its own background.

Two changes, no new dependency:

- **`prefetchHero()` runs inside the boot splash**, which is 1.7 s of held time
  the app already spends. By the time the welcome screen mounts, the image is in
  the loader's cache. (`resolveAssetSource` + `Image.prefetch` are React
  Native's own; in a production build, where the asset is local and this is
  unnecessary, the rejection is caught and ignored.)
- **The photo fades in over the navy in 260 ms** when it is not already there,
  so a slow load reads as a deliberate arrival rather than a glitch. The hero's
  layers are explicit now (image / scrim / copy) instead of an `ImageBackground`
  — fading the container would have taken the gradient and the headline with it.
  The wordmark and the title never wait for the picture; they sit on the scrim,
  which is drawn over navy whether there is a photograph behind it or not.

Typecheck, both exports and expo-doctor pass. Neither change has been seen on a
handset yet — the PARITY rows stay `🔬`, and the fade in particular is the kind
of thing only a device can confirm.

## v0.21.0 — 2026-08-03 — The Profile tab shows YOUR record, not the demo patient's

> "אם חיברת את השרת - מצוין אבל למה בטאב של PROFILE אני לא רואה את התמונה
> שלי את השם שלי את הגיל שלי וכו וכו?"

Because sign-in was connected and the Profile screen was not. It read
`DEMO_CARD` — a hard-coded fictitious patient — with one line,
`const card = DEMO_CARD;`. v0.20.0 named that as pending in `PARITY.md` and
left it, which is why a signed-in patient was looking at "Test Patient Alpha".

### What it does now

`usePatientCard` → `GET /patients/:id/card` for the signed-in account's own
`linkedPatientId`: name, age, sex, MRN, phone, blood type, height, weight, BMI,
conditions, allergies, medications, family history, emergency contact and care
team. The card is assembled and minimized **server-side** — the same one call
the web makes — so the phone and the browser cannot end up disagreeing about
what "age" or "BMI" means, and no client ever receives a raw clinical resource
to pick through.

The portrait is a second call, `GET /patients/:id/photo`, because it is up to
1.5 MB against a card of a few hundred bytes and it changes far less often. It
lives inside the encrypted health profile server-side, so **a photo set in the
browser now appears on the phone**. Worth saying plainly: the avatar had never
rendered a photo at all before this, in any mode — it was always initials.

### The failure case, which is the part worth reading

A real account whose card does not load does **not** fall back to `DEMO_CARD`.
That shortcut would print "A+", "Lisinopril 10 mg" and "Atrial fibrillation"
under a real person's own name, on the one screen whose entire job is to be
their medical record — and someone could act on it. Instead: a name-only card
from the session, an explicit "your record could not be loaded" notice, and
pull-to-refresh. The notice exists because empty sections silently read as
*"you have no conditions and no allergies"*, which is a different and far more
dangerous claim than "we could not reach the server".

(The pull-to-refresh is real, and was added because the first draft of that
sentence said "pull to try again" on a screen that had no such gesture. A
message that promises an interaction the screen does not have is the same
broken promise as a button that does nothing.)

`DEMO_CARD` is now the OFFLINE card only, and says so in its own header.

### Shared, not copied

`PatientCardModel` + `CodedItem` / `MedicationItem` / `EmergencyContact` /
`CareContact` / `PatientPhoto` and the patient route paths now live in
`@cyphix/shared` (root CLAUDE.md §2.1). The web and the server still declare
their own copies; migrating them is tracked in `PARITY.md`.

### Verified

Probed the deployed API with the demo patient: `/card` returns every field the
screen draws — age 68, sex, MRN, phone, A+, 174 cm, 79 kg, BMI 26.1, and one
each of conditions / allergies / medications / family history, plus the
emergency contact and the care team. `/photo` returns `null` for that account,
which is exactly the "initials" path. Typecheck, both exports and expo-doctor
pass. Unverified on a handset, so the rows stay `🔬`.

### Still missing, and named

**You can see a portrait on the phone but not set one from it.**
`setPatientPhoto` is wired; the entry point is not — no picker on the Profile
avatar, and the onboarding photo step still keeps its file URI on the device
(it always did, and the avatar never showed it either). Doing it properly needs
a resize to fit the server's 1.5 MB cap, which on mobile means a new dependency
(`expo-image-manipulator`) rather than the web's canvas. Also still pending: a
clinician has no single active patient, so their Profile tab still shows the
demo card until there is a patient picker.

## v0.20.1 — 2026-08-03 — "Connection issue" on sign-in: the app was right

Signing in from Expo Go with a real account failed with *"No connection. Check
your network and try again."* Nothing was wrong with the code — that message is
`AuthErrorCode: 'network'`, which the client raises only when the `fetch`
itself never lands. It was telling the truth.

**Cause:** v0.20.0 pointed `.env` at the **dev server on the laptop**
(`http://10.0.0.19:8080`), and nothing was listening on 8080. That URL needs a
server running locally *and* the phone on the same Wi-Fi — two conditions that
are false most of the time, which makes it a bad default however well it is
documented.

Ruled out along the way, so it does not get re-investigated later:

- the LAN address was still correct (`10.0.0.19`);
- the API is reachable over that address once running — `/healthz` and a real
  login both answer;
- Windows Firewall is **not** the problem: this Wi-Fi is a *Public* profile,
  but `node.exe` already has inbound Allow rules on it, which is also why
  Expo Go reaches Metro on 8081;
- the bundle *had* picked up the env var — in offline mode the mock service
  never fetches, so a wrong password would have said "invalid credentials",
  not "no connection".

**Fix:** the app now points at the **deployed API**,
`https://cyphix-api.onrender.com`. Verified to be the same database, not just a
lookalike: the demo patient returns an identical `user.id` **and**
`linkedPatientId` from the deployed instance and from the local server. The
full client sequence passes against it — login · `/auth/me` · own-patient read
· foreign patient 403 · rotation · replay 401 · family revoked · logout ·
re-login · enumeration-safe failures · 400/409 mapping.

Two things worth knowing:

- **`EXPO_PUBLIC_*` is inlined at BUNDLE time.** After editing `.env`, stop
  `npm start` and start it again — reloading the app is not enough.
- **The free tier sleeps after ~15 min idle and wakes in ~50 s.** The first
  sign-in after a long gap is slow; that is the host waking, not the app. It
  also interacts with `AuthGate`'s 4 s ceiling (see PARITY.md): a cold boot can
  show the welcome screen and then jump into the app when the refresh lands.

## v0.20.0 — 2026-08-03 — One account system: the phone signs into the web app's server

The native app no longer has accounts of its own. With `EXPO_PUBLIC_API_BASE_URL`
set it authenticates against **CYPHIX_SERVER** — the same Fastify API and the
same Neon Postgres the web app has been using since web v1.46.0 — so a person
who registered in the browser signs in on the phone and is the same `users` row,
the same FHIR Patient, the same recordings. Registering on the phone works the
other way round just as well.

### What the investigation found first (it changed the plan twice)

The server was already there and already correct, so almost nothing needed
inventing — the work was making the mobile client tell the truth about it:

- **Auth is argon2id + a 15-minute HS256 access JWT + a ROTATING refresh token
  family with theft detection.** Present a refresh token that was already
  rotated out and the server revokes the entire family. That single fact is why
  `refreshSession` had to be single-flight: several screens 401ing in the same
  frame would each refresh, the second would look like a replay, and the patient
  would be signed out by their own app. The stub it replaced would have hidden
  this — it always returned `null`.
- **The web keeps its refresh token in a cookie AND in the request body.** A
  native app has no cookie jar; the server reads the body first
  (`presentedRefreshToken`), so mobile needs no server-side special case.
- **`user.linkedPatientId` is the identity link**, and it was missing from the
  shared `SessionUser`. Without it a signed-in patient asks for records they do
  not own — which the server answers 403, correctly. Verified: a foreign patient
  id really is refused.
- **The server refuses to be an account-enumeration oracle** (unknown account and
  wrong password return one identical message). So the sign-up step's "is this
  address taken?" check has nothing to ask when connected; 409 on register is the
  real answer, and it lands on the same step with the same message.

### The changes

- **`@cyphix/shared`** — `SessionUser.linkedPatientId` (the cross-platform
  identity link) and an `AuthTokens` envelope. `AUTH_ROUTES` now names the routes
  the server actually serves: it listed `/auth/session`, which has never existed
  — it is `/auth/me`. The three routes the server does *not* implement (password
  reset, SMS code, SMS verify) moved to `AUTH_ROUTES_PLANNED`, so no client can
  call one by accident and the gap cannot be forgotten.
- **`tokenStore`** — real now. Enclave-stored rotating refresh token, in-memory
  access token, single-flight exchange, and the distinction a phone needs most:
  a server *rejection* clears the session; a *network failure* keeps it, because
  offline is not signed-out.
- **`httpAuthService`** (new) — login / register / restore / logout, mapping the
  server's statuses onto the same `AuthErrorCode`s the UI already translates.
  `authService.ts` picks it over the device mock in one line.
- **`useCurrentUser`** — connected, the RBAC principal is now the **real signed-in
  account**. It had deliberately answered "demo clinician" while every account was
  device-local; against a server that stops being a harmless stand-in, because
  the server enforces its own RBAC and the client would draw a toolbar whose
  every request comes back 403. Offline it is still the demo clinician, so the
  showcase keeps History's tools. **Expect a real patient login to hide calipers,
  filters, annotations and compare — that is the correct answer, not a bug.**
- **`sessionExpired`** — the service→slice bridge the web has, so an exhausted
  refresh puts the app back on the door instead of leaving it signed-in over 401s.
- **Server `auth.ts` v0.2.1** — accepts `emergencyRelation`. The mobile sign-up is
  the only flow that asks who the emergency contact is, and every card was
  reading "Emergency contact" regardless.

### What was verified, and what "verified" means here

Replayed the client's exact sequence against the live server and the real
database — no cookies, as a phone has none: login · `/auth/me` · own-patient
read · **foreign patient refused (403)** · refresh rotates · replay of a
rotated-out token 401s · the family is dead afterwards · logout · re-login ·
enumeration-safe failures · 400-mentions-password → `weak-password` ·
409 → `email-taken`. All pass. The registration body was probed against a
known-taken address, which the server validates *before* the duplicate check —
so the shape is proven with **zero rows written** to the production database.

That proves the contract. It does not prove the screens: nobody has yet signed
in on a handset. Every affected row in `PARITY.md` stays `🔬`.

### Not done, and named rather than left quiet

Biometric unlock is **not offered** when connected (the only thing a fingerprint
could release is a refresh token that `restore()` has already used — the button
would be decorative; an app-lock on resume is the real feature). Password reset
and SMS verification remain device-honest because the server has no mailer and no
SMS gateway. The Profile tab still renders `DEMO_CARD` rather than
`GET /patients/:id/card`.

## v0.19.5 — 2026-08-03 — It was not centred, and that was measurable

> "אבל זה לא ממורכז בכלל אז או שתעשה שזה יהיה כמעט על כל רוחב המסך (מומלץ כי
> הלוגו ארוך) או שתמרכז את זה בבקשה"

Both, and the reason they were the same fix.

### Why it looked off-centre: it was off-centre

`BrandLogo`'s viewBox is inherited from the web app, and it is **not tight
around the artwork**. Measured (bezier-sampled, not eyeballed):

```
ink        x  41.34 → 181.45     y  85.12 → 105.64
declared   x  34.00 → 209.00     y  79.00 → 109.00

air on the left :  7.34 units
air on the right: 27.55 units      → the ink sits 10.1 units left of centre
```

Centre that box on a screen and the artwork lands **~18 pt to the left of the
middle** at 320 pt wide. It also means the logo was only ever filling **80 %**
of the width it was given — which is part of why "make it bigger" kept not
being enough.

It never showed anywhere else because every other caller anchors the logo to a
corner: `PatientShell` and `ProfileScreen` pin it top-start (and both are behind
`SHOW_SHELL_WORDMARK`, currently off), and `ReportHeader` sets it in a row.
Padding on the right of a left-aligned logo is just a gap.

### The fix

`BrandLogo` takes an opt-in **`crop`** prop that swaps in the ink's measured
box (`40.988 84.769 140.810 21.225` — padded 0.35 units, half the mark's
hairline stroke, so nothing clips). Default is unchanged **byte for byte**:
correcting it globally would resize the logo on screens nobody has complained
about, and that is not this change.

The splash uses `crop` and goes to **90 % of the window**, capped at 520:

```
                    v0.19.4 ink      now (90 %, cropped)
iPhone SE  320 →     210 × 30    →    288 × 43 pt
iPhone 15  390 →     256 × 37    →    351 × 53 pt
Pixel      412 →     271 × 39    →    371 × 56 pt
tablet     768 →     368 × 53    →    520 × 78 pt  (capped)
```

("ink" is the artwork itself, not the padded box it was drawn inside — which
is the only measurement that describes what an eye sees.)

**Verified:** `tsc` clean, both platforms bundle, `expo-doctor` 18/18, and every
number above is computed from the path data rather than estimated. That the
lockup is now centred follows from the geometry; that it *looks* right at 90 %
is still a look-at-it-on-the-phone question.

---

## v0.19.4 — 2026-08-03 — The splash goes back to navy and the full logo, at the bigger size

> "עזוב תחזיר למה שהיה עם הרקע הכחול והלוגו המלא … פשוט תגדיל אותו קצת כי זה
> היה קטן מדיי"

v0.19.3 changed three things when only one of them was the complaint. The
complaint was the **size**; the white screen and the mark-only lockup were my
reading of "maximise it", and they are reverted.

So the splash is again the navy screen with the **full** `BrandLogo` — mark +
CYPHIX + "MEDICAL", the same signature that sits on the shell, the profile and
every report — and it keeps the one thing that was worth keeping:

```
                    was          now (82 % of the window)
iPhone SE  320 →   210 × 36  →   262 × 45 pt
iPhone 15  390 →   210 × 36  →   320 × 55 pt
Pixel      412 →   210 × 36  →   338 × 58 pt
tablet     768 →   210 × 36  →   460 × 79 pt  (capped)
```

A flat 210 pt is a guess that is right on exactly one screen. The lockup is
wide and thin (aspect ≈ 5.8), so near-full-width reads as confident rather than
shouted, and 9 % of clear space each side is still more than the app's 24 pt
gutter.

`CyphixLogo` — the mark-only atom v0.19.3 introduced — is **deleted**, not left
sitting in `atoms/`. Three lockups with two callers is how the wrong one gets
picked six months from now. It is one `git show 542a650` away if it is ever
wanted, and the brand SVG it was built from has not moved.

Still true from v0.19.3, and still worth knowing: `app.json` configures **no**
native splash, so a standalone build shows Expo's default before this screen.
In Expo Go it does not matter. When the first real build happens, pointing
`expo-splash-screen` at navy with this mark makes the native → JS handoff
seamless instead of a change of screen.

**Verified:** `tsc` clean, both platforms bundle, `expo-doctor` 18/18, and the
table above is computed rather than eyeballed. Whether 82 % is *right* is a
look-at-it-on-the-phone question — it is one number in one file.

---

## v0.19.3 — 2026-08-03 — The splash is the logo, on white, at the size it should have been

> **Superseded by v0.19.4** — reverted at the user's request. The size change
> below is the part that survived.

> "כשיש את הלוגו המלא נטען עם המסך הכחול שהוספת הוא ממש קטן … תנסה למקסם את
> הגודל שלו שייראה נורמלי … ותשים את זה על מסך לבן בבקשה"

Three changes, one screen.

### The lockup

`CyphixLogo` — mark + "CYPHIX", no "MEDICAL" — from the brand file
`cyphix - logo+cyphix only white backround.svg`. That makes three lockups in
the app, and they are **not** interchangeable:

| | what it is | where |
|---|---|---|
| `BrandLogo` | mark + CYPHIX + "MEDICAL" | the full signature — reports, the shell |
| `CyphixLogo` | mark + CYPHIX | a screen that **is** the logo — the splash |
| `CyphixWordmark` | the word alone | over a headline — the welcome hero |

Same note as last time, because it is the same trap: the source is an **A4
Inkscape page**, so the viewBox here is the measured union of the mark, the
white dot and the lettering (`60.34 85.26 85.05 20.52`, aspect 4.144) rather
than the page. And the mark's `innerShadow` filter is dropped — react-native-svg
has no equivalent, and `BrandLogo` already drops the same one.

### The size

It was 210 pt wide (≈36 pt tall) on every screen, which is where "ממש קטן"
comes from: a fixed point size is a guess that is right on exactly one device.

It is now **82 % of the window's width**, capped at 460 so a tablet does not get
a billboard:

```
iPhone SE  320 →  262 × 63 pt
iPhone 15  390 →  320 × 77 pt
Pixel      412 →  338 × 82 pt
tablet     768 →  460 × 111 pt
```

It is the only thing on the screen. It should look like it.

### White

As asked. Dark mode keeps the app's own dark surface with the light lockup:
an opening frame of white at 2 a.m., on a phone whose owner has set the app
dark, is exactly the flash `PreferencesGate` exists to prevent. One line if you
want it white always.

One loose end worth knowing about: `app.json` has **no** native splash
configured, so a standalone build shows Expo's default before this screen
appears. In Expo Go it does not matter (Expo Go shows its own). When the first
real build happens, pointing `expo-splash-screen` at a white background with
this mark would make the native → JS handoff seamless instead of a change of
screen.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18, and the sizes above
are computed rather than eyeballed. Whether 82 % is *right* is a
look-at-it-on-the-phone question — it is one number in one file.

---

## v0.19.2 — 2026-08-03 — An iPhone next to a Galaxy found a one-line bug in every glass surface

> "באייפון כשלוחצים על SIGN OUT זה מופיע ישירות על המסך (עם רקע שקוף), זה קורה
> רק באייפון — בגלאקסי זה עם רקע לבן יפה. למה זה קורה?"

Because of one line, and the answer is worth writing down: **the two phones
were running different code paths, and only one of them was ever given the
colour.**

### The bug

`GlassSurface` resolves to the best material the device actually has:

```
iOS 26+  → expo-glass-effect  <GlassView glassEffectStyle="regular">
otherwise → expo-blur         <BlurView> + a tinted underlay
```

The tint was a prop called `fallbackTint`, and the name was the bug: it was
passed **only to the BlurView branch**, documented as "ignored by Liquid Glass,
which tints itself".

It does not tint itself — not enough. `glassEffectStyle="regular"` with no
`tintColor` over a **light** page is very nearly clear. So on the iPhone the
panel was genuinely there, genuinely rendering, and genuinely invisible: title,
body and both buttons floating over the profile page. The Galaxy took the
BlurView branch, got `rgba(255,255,255,0.88)` painted underneath, and looked
exactly as intended.

Nothing about this was specific to the dialog. **Every** surface built from
that atom had it — the History sheets, the action sheet, the bottom dock, the
report's action bar — none of which had ever been looked at on an iPhone. One
line fixes all of them.

While in there: the same call now passes `colorScheme` (which
`expo-glass-effect` documents as "use this when your app has its own theme
toggle"). Left on `auto` the glass follows the *phone's* appearance while every
token around it follows the patient's Settings choice — the exact half-dark app
`useIsDark` exists to prevent.

### The dialog is solid now, and stays solid

Even with the tint fixed, `ConfirmDialog` no longer uses a material at all.

A material is for a surface you look **past**. This is the one surface in the
app you must look **at**, immediately before something irreversible — and its
legibility should not depend on which iOS version is running, on what happens
to be behind it, or on whether a blur implementation is available. It is a
white (or `#161F31`) card over the dimmed page, on both platforms. That is also
what the Galaxy was already showing, which is the version that got called
"יפה".

### Typed names capitalise themselves

"elio" → "Elio". The field already had `autoCapitalize="words"`, and that only
sets the **keyboard's shift state** — a suggestion a third-party keyboard, a
paste or a correction can all ignore, which is how a lower-case name reaches
the field in the first place. So the value is normalised instead, in the
reducer rather than in the field, so every route into the draft gets it and a
future screen cannot forget.

What it deliberately does *not* do: it never lower-cases anything, so
"McDonald" stays "McDonald" and "ELIO" stays "ELIO". Boundaries are spaces and
hyphens ("jean-pierre" → "Jean-Pierre") but **not apostrophes** — "O'Brien" and
"d'Angelo" disagree, and guessing wrong at someone's own name while they type
it is worse than leaving it alone. Hebrew and Arabic have no letter case, so
there is nothing there for it to do. The emergency contact's name gets the same
treatment.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18. The capitalisation is
checked against ten real-shaped names. **The glass fix is inferred from the
symptom and the API, not observed** — the machine this is written on cannot
run iOS at all. It wants one look at the sign-out dialog and one at a History
sheet on the iPhone.

---

## v0.19.1 — 2026-08-03 — Four from the first look

> "תוסיף LOG OUT בPROFILE … רציתי רק בCYPHIX כמו שהיה ברפרנס … העיגול בתוכו יש
> אות ECG ירוק — תעיף את זה, זה לא הלוגו שלי … במקום הרקע הכחול בוא ננסה לשים
> את התמונה הזאת"

All four are things no compiler could have flagged: where a control lives,
which lockup belongs over a headline, what is and is not the brand, and what
a hero should be a picture of.

### 1. Sign out is on Profile

It shipped in Settings only — which is Profile → Settings → scroll, one screen
further than anybody looks for it. It is now the last thing on the Profile tab,
under the Settings card, as a quiet centred row rather than a second
illustrated card: it is not a place to go, it is a way to leave, and it must
not compete with what is above it. The row shows *whose* session is about to
end. The confirmation is the same one Settings raises, and Settings keeps its
row — two doors to one action is correct here.

### 2. The welcome hero carries the text-only wordmark

`BrandLogo` is the full lockup: mark + CYPHIX + "MEDICAL". Directly above
"Clinical-grade ECG, recorded at home." that second line of type argues with
the headline it is introducing, which is exactly why the reference uses the
word alone there.

New atom `CyphixWordmark`, path data verbatim from the brand file
(`Logo - cyphix/plain svg/cyphix((txtonly).svg`). One thing worth writing down:
that file is an **A4 Inkscape page** — a `viewBox` of `0 0 210 297` with the
word sitting in the middle of it. Dropped in as-is the wordmark renders as a
speck surrounded by empty sheet. The viewBox here is the glyphs' measured
bounding box (`47.77 85.38 62.48 12.79`, aspect 4.886).

`BrandLogo` is unchanged and still the mark everywhere else — splash, reports,
the shell.

### 3. The pulsing ECG mark is gone

The reference opens on a ring pulsing around a stylised ECG trace that draws
itself. It was ported faithfully in v0.19.0 and it is out now, at the user's
instruction: **it is not the CYPHIX identity**. A mark that behaves like a logo
without being one is worse than no mark — it teaches people the wrong thing to
recognise. `EcgSweepMark` is deleted rather than left unused.

The splash is now the wordmark and the tagline, fading up on navy. `PulseRing`
survives on "Profile created", where it rings a checkmark and is a
confirmation rather than a logo — say the word if that should go too.

### 4. The welcome hero is a photograph

Instead of flat navy: the device on an older person's wrist, being pressed by
their other hand, at home. It says what the product is faster than the
sentence under it does.

The scrim is structural, not decoration. The photo is warm and **light**, and
white type over it would be unreadable exactly where the eye lands — so a navy
gradient sits between them: `0.45` at the very top (so the light status-bar
glyphs stay legible), clearing to `0.10` where the picture is the subject, then
`0.72 → 0.97` under the type. The headline is therefore always on navy
whatever the image is doing underneath.

The asset is resampled to 1400 px wide and saved as JPEG q84 —
**7.0 MB → 176 KB**. A 2354 px source in the bundle is 7 MB every user
downloads to draw a 390 pt panel.

One thing to watch on a device: the rounding is on the *wrapper*, not the
`ImageBackground`. A native image view ignores a parent's `borderRadius` on
Android unless the clip belongs to the view that owns `overflow: hidden`.

### Verified / not verified

`tsc` clean, both platforms bundle, `expo-doctor` 18/18 — and, as with
v0.19.0, none of that has touched a phone. The scrim in particular is a
judgement made against a thumbnail: it wants a real screen and, ideally, a
real pair of eyes in daylight.

---

## v0.19.0 — 2026-08-03 — The app gets a front door

> "אנחנו הולכים להתחיל את מסך ההתחברות … תיקח מכאן רק את שלבי ההתחברות בלבד,
> לא את מסך הבית. תשתמש בפונט שלנו. עיצוב — מהרפרנס. האנימציות — מהרפרנס.
> זה רק הפתיח למה שכבר קיים, אל תשנה מה שכבר יש."

Everything that happens **before** the tabs, converted from the `CYPHIX
Onboarding` design reference to React Native. Fourteen screens: splash →
welcome → sign in / reset password, or welcome → credentials → phone → code →
six health steps → review → "Profile created". The reference's own home screen
is deliberately **not** ported — this app already has one.

### Where it sits in the app

`AuthGate` stands in **front** of `RootNavigator`, not inside it. The flow has
no tabs, no dock and no routes of its own, and until there is an account there
is nothing for the navigator to be about. Nothing else in the app moved: the
tabs, the exam, the report and Scan History are byte-identical.

The flow itself is **one screen that swaps its contents** (`OnboardingScreen`),
which is both what the reference does and what the web's `RegisterWizard` does.
A native stack push would have read as leaving CYPHIX rather than moving
through it — and the reference's transition is a 16 px slide, which is a
content change, not a page change.

### The animations are ported, not approximated

All four of the reference's keyframes, on the UI thread via Reanimated:

| Reference | Here |
|---|---|
| `scrIn` — 16 px + fade, 320 ms, `cubic-bezier(.22,.7,.3,1)` | `StepFadeIn`, keyed on the step, and **direction-aware** — going back does not look like going on |
| `fadeUp` — 10 px + fade, 600 ms, `both` | `FadeUpView`. The `both` fill mode is the point: the element is INVISIBLE during its delay, never flashed and then animated |
| `pulseRing` — scale .9→1.35, 2 s, staggered .6 s | `PulseRing`, two of them. The 30 % of the cycle where it is invisible is the REST between beats; without it the rings read as a spinner |
| `sweep` — `stroke-dashoffset` 520→0 over 1.6 s | `EcgSweepMark`, through `useAnimatedProps` — putting the offset in React state would re-render the splash 96 times in 1.6 s |

Plus the two the reference does with CSS transitions: the step rail (400 ms on
the same bezier) and the password meter (width **and** colour, 300 ms).

### Three things that are deliberately NOT the reference

1. **The font.** The reference sets IBM Plex Mono on every label, digit and
   keycap. Mobile ships the system font (root `CLAUDE.md` §3.1) — "תשתמש
   בפונט שלנו". What carries over is the *treatment*: 10.5 pt, caps, `.1em`
   tracking, and `tabular-nums` everywhere digits change in place, so the
   64 pt height readout does not shift under the thumb dragging it.
2. **The emergency contact.** The reference opens on the phone's contact list.
   Reading the address book needs a permission and a native module — and a
   mis-tap in a list of real people silently writes a real person into a
   medical record. It is typed here; the native picker is a tracked follow-up.
3. **Dark mode**, which the reference does not have at all. The app has a
   theme switch, so `authTheme.ts` carries a dark translation of the same
   design rather than flashing white at 2 a.m.

### The bug that would have shipped

"Profile created" was written, styled, animated — and **unreachable**.
Registration writes the account, so `auth.user` exists one screen before the
flow ends, and the gate swapped in the app on that frame. The patient would
have gone from the review screen straight to the tabs, and nobody would ever
have seen the last screen of the design.

`authSlice.justRegistered` is the latch that holds the door, and
`welcomeAcknowledged` is the patient letting go of it. Worth stating plainly:
`tsc`, both `expo export`s and `expo-doctor` were **green** through all of it.

Two more found the same way, both in the arithmetic rather than the logic:
three 33 % keypad keys plus two 10 pt gaps overflow their row, and `flexWrap`
answers that by silently giving a two-column dialler; and `paddingEnd`
resolves against the native layout direction, which this app does not switch —
so in Hebrew the password text would have run underneath the Show button.
All three are in PARITY.md's trap table.

### Honest about what is mocked

There is no server, and the flow says so rather than pretending:

- **No SMS.** The code step states it is a demo build and prints the code it
  will accept. A realistic screen waiting on a text that never arrives would
  have been the worse lie.
- **No mail.** Reset answers "if that address is on an account, a link is on
  its way" — which is both true here and what a real server should say anyway
  (confirming which addresses exist is an enumeration oracle).
- **Apple / Google** are drawn and land on the e-mail form. They cannot work
  until the server holds the client secrets.
- **Terms / Privacy** are named in the legal line and are not tappable,
  because no such document exists yet.
- Accounts live on the device (AsyncStorage, **SHA-256 digests** via
  `expo-crypto`); the session token goes to the **Keychain / Keystore**.
  `authService` is the same swap point the web has — one class, one line.

### Face ID, and when it is offered

`expo-local-authentication`, drawn only when the device has the hardware, has
something enrolled, **and** remembers an account. All three, or the offer could
not be honoured — and the front door is the last place to bluff.

### What this changes outside the flow (small, and on purpose)

- **Sign out** is live in Settings › Account, behind a confirmation. It was
  already there as a disabled "Coming soon" row waiting for exactly this — and
  without it the flow could never be reached a second time on a device that has
  completed it.
- **The greeting** on Home is the name the patient typed, falling back to the
  demo card.

Everything else stays: the Profile tab still renders `DEMO_CARD`, and
`useCurrentUser` still answers with the demo **clinician**. That second one is
deliberate and worth being explicit about — a registered account is a
`patient`, and every Scan History tool is gated on clinician permissions, so
wiring the session through would silently strip a finished module with no way
to switch back. WHO the patient is, is now real; WHAT they may do is still the
stand-in. Both are rows in PARITY.md.

### Shared

`CYPHIX_SHARED/src/auth/contract.ts` is new: the account shape, the
registration profile, the typed failure codes, `MIN_PASSWORD_LENGTH`, the auth
route paths, and `passwordStrength()` — so "fair" means the same thing on the
phone and on the web. ⚠️ The web still carries its own copy in
`services/auth/authTypes.ts`; until it imports from the package, an edit
belongs in both.

### Verified / not verified

`tsc --noEmit` clean, `expo export` bundles for **both** platforms,
`expo-doctor` 18/18. None of that has touched a phone. Unproven and listed in
PARITY.md: the animations at real frame rates, the pad and the OTP boxes on a
short screen (both steps scroll for that reason and nobody has watched them do
it), the slider under a thumb, the photo picker returning a usable square, and
Face ID — which cannot be tested from Windows at all.

---

## v0.18.2 — 2026-08-02 — It was never the animation. It was one un-memoised object.

> "you just made the animation faster, but it flickers — it's not the speed it
> opens, there's just judder, it's not smooth"

Correct, and v0.18.1's shortened timings were me guessing at a symptom instead
of measuring a cause. The timings are back to 240/160 with a comment saying not
to reach for them again for a smoothness complaint.

### ★ One line, three complaints

```ts
const palette = { ...(dark ? ECG_PAPER_DARK : ECG_PAPER_LIGHT), ghost: t.textTertiary };
```

A fresh object on every render of `StudyViewerScreen` — and it is a prop of six
`EcgReviewStrip`s, **every one of which is `memo`-wrapped specifically to avoid
this**. The memo therefore never held, not once. So every re-render of the
screen — opening a sheet, nudging a caliper, one frame of any drag — re-ran
`buildEcgPath` over **four tiles × six leads**, doubled again when a ghost was
on. That is 24–48 decimating passes over thousands of samples, on the JS
thread, on the frame the sheet was trying to animate in.

Memoised, the strips now skip re-rendering entirely.

### Dragging the ghost was worse than that

> "when you move the reference trace it stutters, really slow, feels dated"

Everything above, *plus* every touch event re-entered `useOverlayRecording`,
which allocated six shifted `Float32Array`s — and in warp mode re-ran
`alignByFiducials` on all six leads. Per move event. The fiducial warp is the
most expensive thing in this module and it was running at touch frequency.

None of it was necessary. **A manual nudge is a pure translation of an
already-aligned curve**, so it belongs where translations belong:

- `useOverlayRecording` no longer takes the reader's nudge at all, and reports
  only what the *algorithm* did — which is also the only part a reader needs
  stated.
- The nudge is carried in **millimetres of paper** (the unit it is drawn in,
  rather than samples) and applied as a `<G translate>` on the ghost. One native
  attribute update; the path strings never change, so react-native-svg has
  nothing to re-parse.
- ⚠️ The catch: each tile only draws the samples that land on it, so a translate
  would open a gap the width of the shift at every seam. Each tile's ghost path
  is now over-drawn by `GHOST_NUDGE_LIMIT_MM` (40 mm = 1.6 s, more than one RR
  interval at any resting rate) on both sides, the `<Svg>` viewBox clips the
  overhang, and the nudge is clamped to exactly that margin.

### The compare capsule stayed on screen with nothing to drag

> "even after you leave compare mode the DRAG TO MOVE THE GRAY TRACE capsule is
> stuck on screen although there is no reference trace"

Clearing the comparison set `overlayId` to null and left `mode` on `'ghost'`.
Two fixes, because either alone would have been luck: the screen now drops out
of ghost mode when the overlay goes away, **and** the sheet requires a ghost to
*exist* before drawing any of its chrome.

That second one mattered more than the capsule did. Underneath it sat an
invisible full-sheet drag surface, also gated on `mode` alone — so a stuck ghost
mode was silently swallowing every touch on the trace and freezing its scroll.
The visible symptom was a leftover capsule; the real one was a dead sheet.

### Verified

`tsc --noEmit` clean · both `expo export`s bundle · `expo-doctor` 18/18 — and
a frame rate remains something none of them can see.

---

## v0.18.1 — 2026-08-02 — Two blurs were one too many, and I over-corrected on the drag

### The sheets were slow and flickered on open

> "when you open it, it's slow and flickers a bit"

Both symptoms, one cause: **two full-screen blurs, the outer one with an
animated opacity.**

- The scrim blurred the page, and the panel's own `GlassSurface` then blurred
  *that*. On Android `dimezisBlurView` is experimental and snapshots a view
  tree per frame; two stacked is visibly janky.
- Worse, the scrim's opacity was what animated. A `UIVisualEffectView`
  **re-computes its effect whenever its opacity changes**, so fading one in
  re-renders a full-screen blur on every frame of the presentation. That is the
  flicker, exactly.

The scrim is now a plain animated colour — free to fade, native driver, no
effect to re-compute — and the **panel keeps the blur**, sampling the page
straight through the dim. Nothing was lost: this is what the platform itself
does, since an iOS sheet dims its backdrop and reserves the material for the
sheet. A blur was moved, not removed. Timings came down too, 260/170 → 210/140.

### The ghost is dragged on the paper again

> "the moving like before, with everything on the screen, not like now with
> buttons"

Fair, and v0.18.0's arrow pad was me answering the wrong question for the
second time running. The complaint was never that the drag was hard to *do* —
it was that nothing said it existed. v0.17.0 fixed that with a labelled handle.
Then v0.18.0 replaced the gesture anyway, and made it worse: **lining two
heartbeats up is a direct-manipulation task.** The eye judges the fit
continuously, and none of that loop survives being expressed as 40 ms steps in
a list you have to look away from the trace to press.

So: the paper is draggable **everywhere** in ghost mode (the interaction), the
labelled handle stays over it (the affordance that says so), and both carry
their own responder instance rather than sharing one — a responder keeps its
running totals in a single closure, and two nodes sharing them would be the
mid-gesture-rebuild bug in a new hat.

The comparison sheet keeps its job — what the grey trace is, which study, how
they are aligned and what that costs — and now ends with one primary action
that **closes it** and hands the trace back draggable. Comparing two waveforms
is done by looking at them; a panel over the thing being judged is the last
thing that helps. The offset reads out on the status line while dragging, so
the sheet never has to be reopened just to see a number.

### Verified

`tsc --noEmit` clean · both `expo export`s bundle · `expo-doctor` 18/18. As
ever, none of that can see a frame rate or a gesture. Both fixes here are
exactly the kind only a hand on a device can confirm.

---

## v0.18.0 — 2026-08-02 — One import caused two of the three

Three findings came back from the device. Two of them are the same bug, and
v0.17.0's changelog entry for the sheets was **wrong** — it claimed the sheets
now rise on a blurred material. They did not, and could not have. The code was
right and the container made it impossible.

### ★ `Modal` is a separate window, and that ruins blur *and* landscape

React Native's `Modal` is not a view in your tree. On iOS it is its own
`UIViewController` in its own window; on Android it is a `Dialog` with its own
`Window`. Two consequences, both of which the user reported:

> "when you press FILTERS AND COMPARISONS it still looks dated with the grey
> rectangle coming up over it"

`UIVisualEffectView` — what `expo-blur` wraps — samples the layer tree of **its
own window**, and dimezis' `BlurView` snapshots **its own decor view**. Inside a
`Modal` that content is empty, so both degrade to a flat translucent rectangle
over black. Every glass sheet shipped in v0.17.0 was, on the device, precisely
the grey rectangle it was written to replace. No radius, tint or intensity
could have fixed it: **a material needs something behind it, and a Modal is
defined by having nothing behind it.**

> "in FULL SCREEN when working with MARKERS or something else it crashes the
> app in Expo Go"

`Modal` defaults to `supportedOrientations={['portrait']}`. Present one while
the app is landscape and UIKit raises `UIApplicationInvalidInterfaceOrientation`
— an uncaught Objective-C exception, so the **process dies**. Full screen is
landscape; MARK → tap a beat → the composer presents → gone. This was not a
JS error and would never have appeared in a red box.

Note that `supportedOrientations` would have silenced the crash and left the
grey rectangle. Only leaving `Modal` fixes both, so overlays are now rendered
**in tree** — an absolutely-positioned layer inside the screen's own hierarchy
(`components/atoms/OverlayLayer.tsx`). The blur samples the real page, and
there is no second window to disagree about orientation.

What that file had to take over from `Modal`, none of which is optional:

- **Android's hardware back button** (`onRequestClose`). Without it the first
  thing an Android user tries leaves the *app* rather than the sheet.
- **The keyboard.** A bottom-anchored sheet in tree is not lifted by the OS, so
  the layer measures the keyboard and rides above it. `KeyboardAvoidingView`
  came out of `AnnotationComposer` rather than being kept "just in case" — it
  does not work inside an absolutely-positioned host, so it was only ever a
  second thing that could move the panel without ever having moved it.
- **Mount/unmount around the animation**, so a closed sheet costs nothing and a
  closing one is still visible while it leaves.

Full screen's safe-area padding moved to an inner view at the same time: an
overlay's scrim is positioned against its parent's *content* box, so a padded
root would have left four unblurred strips around every sheet.

### Comparison stops being a settings list for an unexplained feature

> "COMPARE WITH is still not clear or intuitive to use"

Reported twice now, and the reason is in the sentence: what was on screen was
**a list of settings for a feature that had never been explained**, three rows
down the middle of the filters sheet, whose only control — moving the reference
trace — was a drag on a surface the reader had no reason to think was
draggable. v0.17.0 added a visible handle. That fixed *discovering the drag*
and not *understanding the feature*.

It is now its own toolbar tool and its own sheet (`CompareSheet`), which
answers the three questions a reader actually has, in order:

1. **What is this?** One sentence, plus a **legend**. The grey trace is the
   most confusing thing on the screen the moment it appears; a two-swatch key
   costs 20 pt and removes the confusion outright. The swatch is painted from
   the colour the ghost is really drawn in, so it cannot drift out of date.
2. **Compared with what?** The studies, as a plain radio picker.
3. **How do I move it?** **Buttons.** A drag is the nicest way to move the
   ghost and the worst way to discover that moving it is possible. One tap =
   **one small square** — 40 ms across, 0.1 mV up — which is the unit a reader
   is already looking at. The drag is still there, offered in the sheet as an
   alternative rather than being the secret.

The alignment modes stay, as a segmented control with the selected mode's
**consequence printed underneath**. "Never measure off a warped trace" is not a
footnote; it is simultaneously the reason the mode exists and the reason it is
dangerous.

The ⋯ sheet is therefore filters only, and is titled that.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. **None of which would have caught either bug fixed here**
— a Modal typechecks, bundles and passes doctor whether or not it crashes in
landscape, and a blur that samples an empty window is well-formed code. This is
the second consecutive release where every real defect was invisible to all
three checks. The module stays 🔬 in `PARITY.md`.

---

## v0.17.0 — 2026-08-02 — Seven more from the device

### ★ The cursor bug was real, and it is the same class as last time

> "in CURSOR when you place one and then move it and lift your finger, it
> moves with the finger and gets deleted instead of staying where I put it"

Both halves of that sentence come from one line. The handlers close over the
running totals that turn `gestureState`'s *distance since touch-down* into
*distance since the last event*. `useMemo(..., [onTap, onStep])` rebuilt the
responder between move events — those props are fresh arrows on every parent
render, and every drag re-renders the parent — and a rebuilt responder starts
with `last = 0` and `travelled = 0`. So:

- each move applied the **full** distance from touch-down → it ran away from
  the finger;
- release read `travelled === 0` as a **tap** → and a tap on a reference line
  removes it.

Responders are now built **once** and read everything live through a ref.
`useDragHandle` exists so no call site can reintroduce it. **Never put a
callback prop in a responder's dependency array.**

### The sheets stop looking like 1998

> "when the BASELINE SMOOTH tab and the MARKER tab open, make it beautiful,
> it looks like an app from the 80s with a grey rectangle"

Fair. They were a flat `surface`-coloured rectangle over flat black. Every
sheet and dialog now rises in one shared `BottomSheet`: the scrim **blurs** the
page instead of dimming it, the panel is `GlassSurface` (Apple Liquid Glass on
iOS 26+, a real `dimezisBlurView` blur on Android — never a translucent
rectangle pretending to be one), 28 pt corners, a grabber, a hairline edge and
a shadow that lifts it. Fields and chips inside are a translucent wash of the
panel rather than solid blocks pasted onto it. `ConfirmDialog` gets the same
treatment — the study you are about to delete stays recognisable behind it,
which is the point of confirming against a specific record.

### Full screen: three separate faults

> "the top bar goes over the waves" · "there's the island on iPhone and you
> didn't account for it, it hides parts of the wave" · "there's no exit button"

1. The bar **floated over the paper**. It is now in flow above the sheet.
2. The screen was **full-bleed**. In landscape the notch/Dynamic Island is on a
   SIDE, so the first ~50 pt of every lead sat under it. The whole screen is
   now inset on all four edges. A cut-off ECG is not a cosmetic problem.
3. The only way out was the toolbar's contract icon. There is now a **labelled
   exit button**, first in the bar.

### The measurements header

> "it's nice that the tabs stick, but it looks dated — content just scrolls
> beneath with no threshold"

The header is now a blurred glass bar that content genuinely passes **under**,
and it earns a hairline edge only once something has actually gone behind it
(6 pt of scroll). A line drawn over an unscrolled page is a boundary between
nothing and nothing.

### Compare, and the missing marker

> "in COMPARE I still don't understand how to move the reference wave"

Because the drag surface was invisible — the whole sheet was draggable and
nothing said so. Ghost mode now shows a **labelled handle** in the middle of
the sheet, and the comparison status line is itself the way in: tap it and the
ghost becomes movable.

> "in MARKER, as soon as I lift my finger the sheet comes up and nothing is
> left on screen for the doctor to know where they left the marker"

The point being composed is now drawn on the trace — a dashed hollow marker, so
it cannot be mistaken for a saved one — for as long as the sheet is open.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. Which is what the two previous rounds also passed. Every
fix here is a gesture or a material, and both are invisible to all three — this
needs a phone.

## v0.16.0 — 2026-08-01 — The viewer meets a real finger

v0.15.0 typechecked, bundled and passed `expo-doctor`, and the CHANGELOG said
plainly that none of that proves the gestures work. It was right to. Six
findings from the device, and the first is not a polish item — it is the whole
feature not working.

### ★ Nothing was draggable, and the reason is one line

> "in CALIPERS when you grab the circles the waves move too, so you can't
> really move it" · "in MARK and CURSOR you can't grab the line and drag it
> after you place it"

Every handle used `onMoveShouldSetPanResponder`, i.e. it asked for the gesture
after the finger had already moved. **A `ScrollView` that has begun panning
owns the responder, and a child asking afterwards is ignored.** So the
crosshair moved *and* the paper moved, and a marker could not be moved at all.

Every handle now claims on **touch-down** (`onStartShouldSetPanResponder` +
capture) and sets a `dragging` flag in `onPanResponderGrant`, which flips
`scrollEnabled` to `false` in the same commit — the ScrollView never starts.
Release turns it back on.

That created a second problem and its fix: a handle that owns touch-down
swallows any `Pressable` inside it, so a marker would have become draggable
and un-openable. Tap and drag are now told apart **on release, by travel** —
under 6 pt it was a tap. That is also what made reference lines usable: the
grab strip covers the whole line, a drag moves it, a tap removes it.

### The trace gets the screen back

> "why are all the MARK CURSOR buttons so long, there's barely room for the
> ECG waves which should take about 90% of the screen"

Correct, and the ratio was indefensible on the one module whose entire subject
is a waveform. Two different answers:

**Portrait is compacted.** The toolbar is icons (38 pt row, was ~120 pt of
wrapped 44 pt chips); the metadata line folded into the headline; the status
line is a **fixed 26 pt slot** that the caliper readout *shares* rather than
adds to — so the trace's height no longer depends on which tool is on.
Everything that needs words to be honest — the filter stages, the comparison,
the alignment modes — moved into a labelled ⋯ sheet. An icon for
"Savitzky-Golay smoothing" would have been a guess.

**Full screen is landscape, and it is the real answer.** A six-lead ECG is
259 × 180 mm — a landscape shape. The button rotates the route (declaratively,
through `setOptions`; `lockAsync` stays banned), hides everything but one slim
floating bar of dense icons, and opens at the window that fits **all six leads
to the height** (`fitWindowMm`). Note that this is a *height* calculation:
the obvious "fit" — show the whole recording — gives 99 pt bands inside a
353 pt sheet, so four of the six leads are below the fold. Where that leaves
paper past the end of the recording, blank paper is drawn, exactly as a
printout does.

### The rest

- **"the capsule sits on top of the waves instead of above them"** — the live
  Δt / bpm / ΔmV readout was floating over the trace, covering the very
  deflections whose distance it reports. It is now in the chrome, in the
  status slot.
- **"R PEAKS only works on lead II"** — a rule copied from the report, where
  it is right (a printed sheet marks the one rhythm strip the rate came from).
  In a *tool* the web marks every lead, for the stated reason that a reader
  wants to see which beats the rate came from wherever they are looking. Fixed.
- **"in COMPARE WITH you can't move the reference wave"** — same scroll-steals
  -the-gesture defect, plus the control was buried behind two chips. Nudge is
  now a row in the ⋯ sheet that puts the sheet into ghost mode directly.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. As last time, that proves the code is well-formed and
nothing about how it feels. This round exists precisely because the previous
round's green checks meant less than one minute on a phone — the module stays
🔬 in `PARITY.md`.

## v0.15.0 — 2026-08-01 — History becomes a module, not a placeholder

The History tab said "Completed measurements sync here through the CYPHIX
server". They did not, because there is no server yet — so the tab was a
sentence about a plan. This ships the whole web History module on the phone.

### Why there is an on-device store

The web app has never had a backend either; its History works because
`mockBaseQuery` routes to `localStorage`. Mobile now has the same thing:
`services/db/recordingStore.ts` over AsyncStorage, behind
`services/api/localBaseQuery.ts`, selected by exactly the line web's `baseApi`
carries — `ENV.hasBackend ? httpBaseQuery : localBaseQuery`. Set
`EXPO_PUBLIC_API_BASE_URL` and every endpoint, hook and screen above it is
already talking to the real server; nothing changes but that line.

One departure from the web store, and it is deliberate: recordings are kept as
an **index plus one payload key each**, not as a single JSON blob.
`RecordingRepository.list()` exists so browsing does not drag every waveform
out of storage, and on a 6 MB AsyncStorage budget rewriting ~1.4 MB to save one
note is the difference between that promise being kept and being decorative.

A finished exam now files itself the moment the report appears
(`useSaveRecording`, ported), saves **once**, and says so on the report — and
says so louder if it failed. A recording that did not persist must never look
like one that did.

### The viewer, re-thought for a finger

Same guarantees as the web: the scale is **frozen at 25 mm/s · 10 mm/mV**,
zoom is a window over the paper, all six leads share ONE scroll so they always
show the same instant, and the measurements are computed from the waveform
actually on screen. What changed is every interaction that assumed a mouse:

| Web | Phone | Why |
|---|---|---|
| Hover → click → click → click calipers | **Two crosshairs that are always there and are dragged** | A finger cannot hover, and it covers ~9 mm of paper — 360 ms of ECG, wider than a QRS. Every handle moves by the finger's *delta*, so the point being positioned stays visible beside the hand positioning it. Precision comes from zooming in, never from rescaling the trace |
| Ctrl+wheel zoom | − / + and Fit | Redrawing six vector sheets per frame is not a 60 fps operation in JS. Discrete steps are what the web's own buttons do anyway |
| Corner dropdown "Actions" | **Bottom sheet** | A 180 pt popover anchored to the far top corner of a 390 pt screen is the one place every platform's guidelines say not to put actions |
| Floating annotation card | **Keyboard-aware bottom sheet, five quick tags above the field** | The thing that shrinks a phone's waveform is the keyboard. One tap on "PVC" and it never opens |
| Ghost dragged whenever no tool owns the pointer | Ghost dragging is its **own mode** | A drag that both pans the paper and moves the ghost cannot be either |

The sheet is **tiled**: each lead is a row of 65 mm `<Svg>` panes rather than
one. react-native-svg gives each `<Svg>` a single native texture, and past
~4 096 px an over-wide one draws *nothing at all* — a blank lead, not a clipped
one. 65 mm is a multiple of the 5 mm major grid so the seams are invisible, and
each tile's path starts one sample early so the trace crosses them unbroken.

### Export leaves the building properly

`buildRecordingCsv`, `buildRecordingEdf` and the CSV importer moved into
`@cyphix/shared`, so a file exported on the phone and one exported in the
browser are the same bytes. Only delivery differs: the web clicks a hidden
`<a download>`, the phone writes to the cache and opens the OS share sheet —
a phone has no downloads folder to click into.

PDF is new work rather than a port: `window.print()` has nothing to snapshot on
a phone, so `services/export/recordingPdf.ts` **builds** the A4 sheet from the
same shared `buildEcgPath` / `buildEcgGrid` the screen uses. A ruler laid on the
printout therefore agrees with the web print. A 10 s capture paginates across
consecutive six-lead sheets the way a real machine does, instead of printing
6.9 s and captioning the rest away.

### The gates are real code, not a plan

`types/rbac.ts` and `features/history/viewerFeatures.ts` are ported whole,
rationale comments included. Calipers, filters, annotations, compare, export and
delete each ask `features.has(...)`, never a role. `features/auth/useCurrentUser.ts`
is the single stand-in identity — auth lands as a swap of that one file, not as a
retrofit of permission checks into finished screens. Every read, annotate,
export and delete goes through `services/audit/auditLogger.ts` with references
only, never PII.

### Four new dependencies, and what each buys

`expo-file-system` + `expo-sharing` (export delivery), `expo-print` (the PDF),
`expo-document-picker` (CSV import). All four are in Expo Go for SDK 54, so the
Expo Go workflow is intact — verified against the SDK 54 bundled-module list,
not against npm `latest`, which would have dragged the project to SDK 57 and
broken Expo Go exactly as `CLAUDE.md` §1 warns.

### Verified

`tsc --noEmit` clean on the app **and** on `CYPHIX_SHARED` · `expo export`
bundles for iOS and Android · `expo-doctor` 18/18.

That means the code is well-formed. It does **not** mean the gestures feel
right: a caliper that drags a hair off the finger, a tap target under a scroll,
a seam that shows at one particular zoom — none of that is visible to a
compiler. Everything here stays 🔬 in `PARITY.md` until it has been touched on a
device.

## v0.14.0 — 2026-08-01 — The floating wordmark goes away (for now)

The user asked to hide the CYPHIX logo in the top-start corner of the native
app. **Hidden, not removed** — "for now" was the word, so it is a switch:

```ts
// src/config/featureFlags.ts
export const SHOW_SHELL_WORDMARK = false;   // ← flip to true, it all comes back
```

It renders from **two** places, because Profile scrolls and therefore does not
use `PatientShell` — it carries its own copy of the shell's floating mark. Both
now read the same constant, so they cannot disagree.

### The padding follows the switch

The mark's 70 pt of top padding existed for exactly one reason: to keep content
clear of a logo floating over it. With the logo hidden, that reservation holds
nothing, which is the same mistake as the dock-inset bug written up in
`CLAUDE.md` — space reserved for chrome that is not there. So the padding is
tied to the same condition and drops to 12 pt.

Visible effect, since the patient screens are vertically centred: content
settles **up by ~29 pt** on Home / History / Tests / Chat, and the Profile card
starts nearer the top. If the empty gap was actually wanted, that is a one-line
change — say so and I will pin the padding back to 70.

### What is NOT hidden

`ReportHeader`'s letterhead mark, at the top of the end-of-exam report. That
one identifies a clinical document rather than decorating a screen, and a
report with no issuer on it is a different decision from a tidier home screen.
Say the word if you want it gone too.

### Verified

`tsc --noEmit` clean · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. The re-centring is a layout change no typecheck can see —
`🔬` until it is looked at on a device.

## v0.13.0 — 2026-08-01 — The app learns to speak: i18n, and a language picker in Settings

The user asked three questions: is the native app modular, does it support
multiple languages, and can the language picker be added to Settings. The
first was already yes. The second was **no** — every string in the app was a
literal, and `SettingsScreen`'s own header comment said so ("Language — the
mobile app has no i18n layer yet"). The third is what this release is.

### The shape is the web's, on purpose

`src/i18n/` is the same four files the web app has, with the same names and
the same public surface:

```
i18n/
├── config.ts          ← THE REGISTRY. Adding a language is an edit HERE.
├── I18nContext.ts     ← context + { lang, dir, rtl, setLang, t }
├── I18nProvider.tsx   ← owns the active language
├── useTranslation.ts  ← the hook every component calls
└── locales/
    ├── en.ts          ← the canonical key set
    └── he.ts          ← Record<TranslationKey, string>
```

**Adding a third language is one new file plus three lines**, exactly as on
the web: copy `locales/en.ts`, translate the values, then add the code to
`LangCode`, a row to `LANG_META` and a line to `TRANSLATIONS`. Nothing else
changes anywhere — the Settings picker is driven by `LANG_META`, so the new
language appears in it on its own.

`he.ts` is typed `Record<TranslationKey, string>` where `TranslationKey` is
`keyof typeof en`. A key that exists in English and not in the new language is
a **compile error**, not a blank label discovered by a patient.

Wherever the web already says a sentence in Hebrew, the wording is copied
verbatim from `CYPHIX_MEDICAL_WEB/src/i18n/locales/he.ts` — the gate messages,
the prep steps, the whole measurements sheet. Two platforms giving the same
clinical instruction two different ways is a clinical problem, not a copy one.

### Where the choice is stored, and why not in its own key

The web provider reads and writes `localStorage` synchronously. Every phone
equivalent is **async**, so reading the language during the first render is
impossible — the app would open in English and repaint in Hebrew a frame
later. That is the same bug `PreferencesGate` already exists to prevent for
the theme.

So `language` lives in the **preferences slice**, inside the blob the gate
already hydrates before the first paint. One gate, one write path, no flash.
`I18nProvider` mounts inside `PreferencesGate` and reads from it.

### RTL: what works, and what is honestly not done

Hebrew is right-to-left. On the web that is one line (`document.documentElement
.dir`) and the browser mirrors the layout. React Native has **no per-subtree
`dir`** — real mirroring is `I18nManager.forceRTL()`, which is process-wide and
only takes effect **after the app is relaunched**.

So this release does the part that works today: rows, section headers, metric
tiles, chips, the profile identity block and the forward chevron all reverse
and re-align off `useTranslation().rtl`. Native mirroring is marked `🟡` in
`PARITY.md`; when it lands it needs a deliberate "restart to apply" flow, not
a silent flip under a patient mid-session.

Two things are **never** mirrored, in any language:

* the interval bar's axis — `scaleMin → scaleMax` is a number line, and
  flipping it would put a short PR interval where a long one belongs;
* the ECG paper — time runs left to right on every ECG on earth.

### What is deliberately not translated

Each of these has a comment at the site explaining why:

* clinical `display` values on coded chips — ICD-10 / SNOMED **data**, not copy;
* lead names (I, II, III, aVR, aVL, aVF) and unit symbols (BPM, ms, Hz, mV, %);
* the 25 mm/s · 10 mm/mV scale caption;
* `APP_BUILD_LABEL` — a developer identifier a bug report should quote verbatim;
* the platform's own BLE error text, shown untranslated rather than replaced by
  a generic sentence that says less about what actually went wrong.

### One bug fixed on the way

The report's letterhead formatted its date with `toLocaleDateString(undefined)`
— "whatever the device is set to". A patient who set CYPHIX to Hebrew on an
English phone got a Hebrew report with an English date on it. It now formats in
the **chosen** language, which is the whole point of having a picker.

### The picker itself

Settings → Appearance, **first row**, above Theme. Everything else in that
section is about how the app looks; this one decides whether the patient can
read any of it — so it is the first thing under the first heading, and its
options are written in their own scripts (`English`, `עברית`), never
translated. A row of 44 pt pills rather than the web's dropdown: RN has no
non-modal `<select>`, and a menu whose label is in the language you are trying
to leave is not an escape route.

### Verified

`tsc --noEmit` clean · `expo export` bundles for **iOS and Android** ·
`expo-doctor` 18/18. That means the code is well-formed, **not** that it looks
right in Hebrew on a real screen — line breaks, pill wrapping and the reversed
rows all pass every one of those checks. Stays `🔬` until someone switches the
language on a device.

## v0.12.0 — 2026-08-01 — Report polish: the five things that still read as "not native"

v0.11.0 fixed the report's *structure*. This fixes how it looks, against five
specific observations from the user.

### 1. The tab switcher sat in the left third of the screen

`SegmentedControl` is a port of the web's `.settings-seg` — chips sized to
their own text, brand-navy fill on the active one. That is a settings **chip
group**, and it is right in Settings. As a tab bar it occupied the left third
of the row and recoloured on tap, which reads as a toggle rather than as
navigation.

New molecule `SegmentedTabs`, left `SegmentedControl` alone so Settings does
not change underneath the user. Segments are `flex: 1` (they divide the full
width) and the active one is marked by a **thumb that slides** between them on
the native driver — so it keeps moving smoothly while the tab it is revealing
mounts six SVG strips.

### 2. Glass — but where it can actually do something

The user asked for a glass effect on the tab switcher. A frosted material only
reads as glass when there is something behind it to refract, and the tab bar
sits on a flat page background: glass over flat grey renders as flat grey.

So the glass went on the **action bar** instead, which is the one place in this
screen where it earns its keep — the bar is now absolutely positioned and the
document scrolls underneath it. `GlassSurface` (already proven on the dock)
gives Apple's real Liquid Glass on iOS 26+ and a genuinely blurring fallback
elsewhere. If the user wants it on the tabs anyway that is a one-line change,
but it would be decoration rather than material.

### 3. The waveform section floated on grey

Six separately bordered cards with gaps between them, on the app background.
Now: **one surface panel**, and inside it the six leads are drawn edge to edge
with **no gap at all** (`EcgStripSvg variant="channel"` — no border, no
corners, no per-strip chrome), so the millimetre grid runs unbroken from lead I
to aVF. That is what actually comes off a six-channel ECG machine, and it is
also simply cleaner.

One constant had to change for it to work: the band height is now **30 mm, not
32**. It must be a multiple of the 5 mm major step, or band N's last grid line
and band N+1's first do not coincide and every seam shows as a stripe of
mismatched squares. The panel's corner radius clips the paper, and the scale
caption moved inside the panel under a hairline, where it belongs to the sheet.

| iPhone 15 Pro | before | v0.11.0 | now |
|---|---|---|---|
| band height | 50.6 pt | 115.5 pt | 107.7 pt |
| 1 mV | 18.1 pt | 36.1 pt | **35.9 pt** (1.99×) |
| leads | 6 bordered cards | 6 bordered cards | one continuous sheet |

### 4. Units spilled out of their tiles

Not the numbers — the **word-valued** measurements. "Slightly variable" is 17
characters at 22 px, about 200 pt inside a 147 pt tile. A `<Text>` inside a
`flexDirection: 'row'` does not wrap by default; it overflows its parent and
prints straight through the border. `flexShrink: 1` on the value (and `0` on
the unit, so "ms" never breaks across lines) is the RN equivalent of the web's
`.metric-value { overflow-wrap: anywhere }`.

While in there: `axisLayout` had `alignItems: 'center'`, which was shrinking
the metric grid under the dial to its text width and leaving that row ragged.

### 5. The axis dial was a thumbnail

It was a fixed 190 pt. It is now self-sizing — it measures the width it is
given and fills it, capped at 340 pt (**1.74×** on an iPhone 15 Pro). Every
stroke, label and radius scales by **√**, not linearly: at 1.8× the diameter,
1.8× stroke weights would have made it look coarse rather than bigger.

This diagram is the only thing on the measurement sheet that is *read* rather
than looked up — "+62°" means nothing without the hexaxial reference frame —
so it was the worst thing on the page to have shrunk.

### Also: the measurement blocks are grouped cards now

The web draws them as bare blocks separated by the accent rule, because they
sit on a white `.report-page` that already is the sheet. On mobile there was no
page under them, so five dense blocks sat on the grey background looking like
loose parts. Each is on its own surface now — the platform's own inset-grouped
list.

### Verified

`tsc --noEmit` clean, iOS and Android both bundle, `expo-doctor` 18/18. The
measurements above are computed from the layout formulas. None of it proves the
glass renders or that the thumb slides at 60 fps — that stays 🔬 in `PARITY.md`
until it has been touched on the phone.

## v0.11.0 — 2026-08-01 — The report is a phone document now, not a photocopy of an A4 sheet

The user's report: *"it still feels messy, not native, not professional for a
phone."* They were right, and v0.10.1 only fixed the report's **colours**. The
structure was still wrong, and the structure was the actual complaint.

### What I had built, and why it read as a fax

The web report is deliberately two A4 sheets: `.report-page` × 2, each with a
full `.report-header` letterhead, built for a printer. I ported that layout
element-for-element, which on a 393 pt screen produced:

| symptom | cause |
|---|---|
| the brand mark and four provenance fields, twice, in one scroll | the letterhead repeat — correct on paper (a separated sheet must identify itself), meaningless on a screen that cannot be separated |
| six 51 pt slivers of grid paper | a 182 mm sheet squeezed into 361 pt is **1.9 pt per millimetre**, so a 1 mV R wave stood 19 pt tall |
| everything arriving at once | two "pages" stacked in one vertical scroll with no navigation between them |

Every one of those is a *faithful* port. Fidelity to a print layout is what
made it wrong here — root `CLAUDE.md` §3.3 already says brand identity is
identical to web and layout patterns follow the platform, and I applied the
first half only.

### What it is now

Same content, same tokens, the same frozen 25 mm/s · 10 mm/mV geometry from
`@cyphix/shared`. Restructured:

- **One letterhead** for the document (`ReportHeader` v2.0.0), not one per
  sheet. The provenance it used to hold moved into the card below.
- **A summary card** (`ReportSummaryCard`, new) answers *"what did it say?"* in
  the first screenful: the rate at 46 px, the rhythm, then duration / leads /
  sample rate. Without it the report opened on a wall of grid paper.
  The rhythm chip is tinted with the **accent, never green** — "Regular" is a
  measurement, and a green chip would quietly turn it into a finding.
- **A segmented control** (Waveform | Measurements) replaces the two paper
  pages. Native, and it is what stops the screen being a dump.
- **The waveform window scrolls.** This is the change that fixes "the graphs
  are too small". The window shows 100 mm of paper instead of 182, so the scale
  doubles — and the strip is as long as the recording and slides under it:

  | | v0.10.1 | v0.11.0 |
  |---|---|---|
  | strip height (iPhone 15 Pro) | 50.6 pt | **115.5 pt** (2.28×) |
  | 1 mV deflection | 18.1 pt | **36.1 pt** (2.00×) |
  | one 1 mm square | 5.4 device px | **10.8 device px** |
  | recording shown | 7.3 s, rest discarded | **all 10 s**, 3.6 s per window |

  The alternative ways to fit a 10 s strip on a phone were to rescale the time
  axis — banned in `ecgPath.ts`, because a QRS eyeballed off a stretched axis
  reads the wrong width — or to silently throw away six seconds of a clinical
  recording. Scrolling costs a gesture and keeps both.

  All six leads live in **one** horizontal `ScrollView`, so they move together.
  Six independently scrolled strips would let you compare lead I at t=2 s with
  lead aVF at t=7 s and not notice.

- **Lead labels are pinned** outside that scroll, on paper-coloured chips. A
  label that slides off the sheet leaves you looking at an unidentified trace.
- The heart rate is no longer a `hero` tile inside the analysis sheet: the
  summary card already carries it at 46 px directly above, and two hero
  treatments of one number is precisely the "thrown on the screen" look.

### One defensive limit

`react-native-svg` rasterises each `<Svg>` into a single native texture, and
past the GPU limit (4096 px on much Android hardware) it draws **nothing** —
a blank strip, not a clipped one. Ten seconds of paper is 2 805 px on a 3×
phone, comfortably inside, but `MAX_STRIP_PX` caps it so an unusually wide
screen costs a little zoom instead of the whole trace.

### Verified

`tsc --noEmit` clean; iOS and Android both bundle. Those prove the code is
well-formed, not that it looks right — the geometry above is computed from the
layout formulas, and the report stays 🔬 in `PARITY.md` until it has been
scrolled on the phone.

## v0.10.1 — 2026-08-01 — Two regressions I introduced, both fixed at the source

### The prep photograph was cropped to a corner. Again.

This is the second time, and it is the same line of code both times.

| version | Image style | result |
|---|---|---|
| v4.0.0 | `StyleSheet.absoluteFill` | cropped to a corner ❌ |
| v5.0.0 | `{ width: '100%', height: '100%' }` | correct ✅ |
| v5.2.0 | `StyleSheet.absoluteFill` (to stack both photos for the crossfade) | cropped again ❌ |

`absoluteFill` gives an `<Image>` its box from four zero insets and no
intrinsic size; `resizeMode="contain"` then resolves against the wrong frame
and the parent's `overflow: hidden` crops what is left — the patient sees one
finger. v0.10.0 reintroduced it purely to stack the two photographs for the
crossfade, and brought the bug back with it.

The frame's exact width and height are computed three lines above, so they are
now passed explicitly (`position: 'absolute'` for the stack, real point
dimensions for the size) and nothing is left to infer. The file carries a
comment naming this so it cannot happen a third time.

### The report strips were on pink paper. I invented that.

The web's report tokens are in `report.css` and are **white paper with a BLUE
grid**:

```
--ecg-paper: #FFFFFF   --ecg-grid-minor: rgba(0,82,255,.15)
--ecg-trace: #0A2540   --ecg-grid-major: rgba(0,82,255,.30)
```

v0.10.0 painted `#FFF8F6` paper with red-orange grid lines, reasoning from
what clinical ECG paper looks like in the real world rather than from the
product it is supposed to mirror. Both themes now use the web's values
verbatim, and the file says not to re-derive them from first principles again.

### The measurement sheet reads as a sheet now

The rest of the "it looks thrown on the screen" was three specific things:

- **The lead label and the scale caption sat in a row ABOVE each strip**,
  turning six clean sheets into eighteen competing elements. The web puts both
  ON the paper (`.ecg-svg-label` top-start in the trace colour,
  `.ecg-svg-scale` bottom-end, quiet) and so does this now — the strip is one
  bordered card again.
- **Metric tiles were laid out in ragged thirds.** The web grid is
  `repeat(auto-fit, minmax(140px, 1fr))`, which on a phone column is exactly
  two per row; `flexBasis: 46%` reproduces that and `flexGrow` makes each row
  end flush. Tile styling is now the web's too: uppercase letter-spaced label,
  22 px value (32 px for the hero heart rate), hero on `accent-soft`.
- **Section headings were body-coloured text.** `.analysis-section` is
  uppercase, letter-spaced, in the ACCENT colour with a hairline under it —
  it is the only thing separating five dense blocks, so it has to read as a
  rule rather than as another line.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18. The colour values were read out of `report.css` rather
than remembered. Still not a device test.


## v0.10.0 — 2026-08-01 — The report becomes a document

### The report is the web's two-page sheet, and it is portrait

Until now the report was a summary card: nine numbers in a grid and six
Skia traces on a plain background. The web produces something else entirely,
and this is now a port of that:

- **A letterhead on every page** — wordmark, title, which page this is, and
  the provenance block (recorded at / duration / lead set / sample rate).
  Repeated on page 2 on purpose: a sheet separated from its first page must
  still identify itself, or it ends up filed against the wrong record.
- **Page 1, the waveforms**, as VECTOR strips on real ECG paper: a 1 mm /
  5 mm grid at the clinical **25 mm/s and 10 mm/mV**, each with the 1 mV
  calibration pulse so the gain can be checked by eye against the grid, and
  R-peak ticks on lead II showing what the rate was computed from.
- **Page 2, the measurements**: rate & rhythm tiles, the hexaxial axis dial,
  interval bars against typical adult reference bands, the per-lead amplitude
  table with its QRS profile, and signal quality. Measurements only — no
  finding, no normal/abnormal label, nothing that reads as a diagnosis.

**★ The screen rotates back to portrait to show it.** The exam is landscape
because six live traces need the long edge; a report is the opposite shape of
problem — a document read top to bottom, one full-width strip after another.
Sideways would halve every strip and push the measurement sheet behind a
scroll. This is done with `navigation.setOptions({ orientation })`, so
react-native-screens remains the **single owner** of the orientation API — the
whole point of the v0.8.0 flicker fix. `lockAsync` is still nowhere in this
repo, and "record again" rotates back by the same path it came.

`buildEcgPath`, `buildCalibrationPulse` and `buildEcgGrid` moved into
`@cyphix/shared` (`src/ecg/ecgPath.ts`, `ecgGrid.ts`). This is geometry, not
signal maths, but the same rule applies for a different reason: an interval
measured off the web's sheet and one measured off the phone must land on the
same ruler. The web still has its own copies and is untouched — it imports
nothing from `@cyphix/shared` yet (verified), so this addition cannot affect
it. Migrating it is still tracked in `PARITY.md`.

### The set-up steps

- **Both photographs are now exactly the same size.** They were not: the
  picture's slot is the flex remainder, so step 2's longer title wrapped to a
  second line and stole ~25 pt from its own photograph. The title block now
  has a FIXED one-line height, which makes the remainder identical on every
  step regardless of copy — and both steps get the LARGER frame (436 × 245 on
  an iPhone 15 Pro, 462 × 260 on a Pixel 7).
- **Step 2's line is shortened** to "Rest that hand on your left thigh". The
  web's 74-character version was the cause above, and the detail it was
  spending a line on — which way round the watch sits — is precisely what the
  photograph shows unambiguously. `adjustsFontSizeToFit` is the safety net so
  a longer string shrinks rather than truncating: a clinical instruction cut
  off mid-sentence is worse than a small one.
- **The step change is a crossfade, not a reload.** Swapping `source` on one
  `<Image>` makes RN fetch and decode the asset at the moment of the tap — and
  in a dev build that "file" is an HTTP request to Metro — so the frame went
  blank for a beat. Both photographs are now mounted from the first render and
  only their opacity animates; by the time the patient taps, the next one has
  long since decoded.

### The live bar

"Recording — stay still and breathe normally" is gone from the phone layout.
The draining ring beside the BPM already says a capture is running, and a line
of prose is read once and then occupies the traces' height for ten seconds.
The desktop layout keeps the web's copy.

### Verified

`tsc --noEmit` exit 0 · `expo export` bundles for iOS and Android ·
`expo-doctor` 18/18 · prep geometry recomputed and confirmed identical across
both steps · confirmed the web imports nothing from `@cyphix/shared`, so the
shared addition is additive-only. Still not a device test — `🔬` in
`PARITY.md`.


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
