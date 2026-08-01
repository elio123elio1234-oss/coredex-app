# CHANGELOG — CYPHIX Medical Mobile

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
