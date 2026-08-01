# PARITY.md — Web ↔ iOS ↔ Android feature ledger

**This file is mandatory bookkeeping for the Cross-Platform Rule (root
`CLAUDE.md` §1).** Every feature that exists on any platform has a row here.
A feature shipped web-only gets a row marked `pending` with a reason —
"we forgot" must be structurally impossible.

Legend: `✅ done` · `🟡 partial` · `⏳ pending` · `🔬 needs-iOS-verify` (built
but never run on a physical iPhone — Windows dev machine, see root §5) · `—` n/a.

## Modules (the five nav entries)

| Feature | Web | iOS | Android | Notes |
|---|---|---|---|---|
| Floating glass bottom dock | ✅ | 🔬 | 🔬 | Ported: blur pill, springing highlight, filling icons, emphasized centre Home. Order History·Tests·Home·Chat·Profile per `dockConfig.tsx`. Metrics in `navigation/dockMetrics.ts`. **Two deliberate departures** (documented there): Home icon 26px not `clamp(28,7.6vw,33)`, padding 6 not 7/8 → 67px tall instead of 77, because on the web that Home rule is a desktop rule leaking into the phone breakpoint on specificity. **Not ported:** the drag-the-pill gesture and the History-only ✕ collapse |
| CYPHIX wordmark | ✅ | 🔬 | 🔬 | SVG verbatim; inner drop-shadow filter dropped (no react-native-svg equivalent) |
| Teal wavy shell backdrop | ✅ | 🔬 | 🔬 | 5 ribbon paths + field gradient, both themes. Alternate styles (waves/white/gray/calm) are now pickable in Settings › Appearance. **Not ported:** the web's `glass` style |
| Home (greeting + blob button) | ✅ | 🔬 | 🔬 | Orb, particles, morphing blob ported. **The tap target must stay ABOVE the Skia canvas** — wrapping the canvas in the `Pressable` let the canvas eat the touch and the button did nothing (v0.4.1). Greeting name is static until auth lands |
| **Limb (6-lead) exam** | ✅ | 🔬 | 🔬 | Full pipeline: LimbPrep → auto-armed monitor → 10 s capture → report, a **layout port of the web** (`.prep-stage` and `.limb-stage`), with the web's own guide photographs (`assets/guides/`) and copy verbatim from `en.ts`. Traces are the web's `2 × 3` `.lead-grid` with the web's drawing (3 s window, 12/60 px paper, 0.38 mV scale, window-mean centring). **Mobile-only:** the route is LANDSCAPE — declared on the `Stack.Screen`, never locked imperatively (v0.8.0) — and below a 500 pt stage every size is compacted so the content, not the chrome, gets the phone's height (v0.9.0; see the Phone-scale table below). **Not ported:** the 12-lead chain into the chest protocol, and saving to Scan History |
| **End-of-exam report** | ✅ | 🔬 | 🔬 | Same content and tokens as the web `EcgReport`, **deliberately restructured for the phone** (v0.11.0 — see the row below for why). Vector strips on 1 mm / 5 mm ECG paper at the clinical 25 mm/s · 10 mm/mV with the 1 mV calibration pulse and lead-II R-peak ticks; the measurement sheet (rate tiles · hexaxial axis dial · interval bars vs reference bands · amplitude table · quality) behind the second tab. Colours are the web's `--ecg-*` tokens **verbatim** — white paper, blue grid, navy trace (light) / `#0D1424` paper, green trace (dark). **Rotates back to PORTRAIT** — a document is read top to bottom, and sideways halves every strip. **Not ported:** print / Save-PDF (no browser print dialog on a phone; needs `expo-print`) |
| ↳ **Report layout — deliberate divergence from web** | 2 × A4 sheets, letterhead each | 🔬 | 🔬 | The web report is built for a printer, and the literal port read as a fax: the brand mark + 4 provenance fields **twice** in one scroll, and six **51 pt** slivers of paper (182 mm squeezed into 361 pt = 1.9 pt/mm, so a 1 mV R wave stood 19 pt tall). Per root `CLAUDE.md` §3.3 the brand is identical and the layout follows the platform, so: **one** letterhead · a summary card carrying the rate at 46 px + rhythm + provenance · full-width **sliding segmented tabs** (Waveform \| Measurements) instead of stacked pages · a **100 mm window** that scrolls horizontally through the full 10 s, giving **108 pt** bands and a **36 pt** millivolt (2×). All six leads share ONE scroll so they always show the same instant; lead labels are pinned outside it. The 25 mm/s · 10 mm/mV scale is untouched — rescaling the time axis to fit the screen is banned (`ecgPath.ts`), and truncating would have discarded 6 s of a clinical recording |
| ↳ Report — one continuous sheet | 6 separate `.ecg-svg-strip` cards | 🔬 | 🔬 | v0.12.0: the leads are drawn edge to edge with **no gap** inside one surface panel (`EcgStripSvg variant="channel"`), so the mm grid runs unbroken lead I → aVF, as a six-channel printout does. ⚠️ The band height must stay a **multiple of 5 mm** (it is 30) — otherwise band N's last grid line and band N+1's first do not coincide and every seam shows as mismatched squares |
| ↳ Report — glass action bar | ✅ n/a (web has a print button) | 🔬 | 🔬 | v0.12.0: the pinned bar is a `GlassSurface` and the document scrolls **under** it. Liquid Glass on iOS 26+, `dimezisBlurView` on Android. Deliberately **not** on the tab switcher: that sits on a flat background, and a material that refracts what is behind it has nothing to refract there |
| ↳ Report — axis dial | fixed 190 pt | 🔬 | 🔬 | v0.12.0: self-sizing, fills its container up to 340 pt (**1.74×**), with strokes/labels/radii scaled by **√** so it does not read as coarse. It is the only figure on the sheet that is *read* rather than looked up |
| Real frosted glass | ✅ (`backdrop-filter`) | 🔬 | 🔬 | `GlassSurface` atom. iOS 26+ uses Apple **Liquid Glass** (`expo-glass-effect`), which the web has no equivalent of; older iOS uses UIBlurEffect; Android needs `experimentalBlurMethod="dimezisBlurView"` or `expo-blur` does not blur **at all** |
| ECG signal chain (DSP, Pan-Tompkins, report filter, analysis) | ✅ | ✅ | ✅ | **Now shared** in `CYPHIX_SHARED/src/ecg/`, consumed by mobile. ⚠️ The web still imports its own copy under `src/services/ecg/` — migrate it, and until then edit both |
| Live Scan (camera + ONNX pose) | ✅ | ⏳ | ⏳ | Needs camera + `onnxruntime-react-native`; geometry math must be copied verbatim from web `services/scan/` |
| Guided chest protocol (V1→V6 FSM) | ✅ | ⏳ | ⏳ | Depends on the scan engine landing first |
| Tests | ✅ | ⏳ | ⏳ | Shell only; blocked on `recordingApi` + auth |
| History (doctor) | ✅ | ⏳ | ⏳ | Shell only; blocked on `recordingApi` + auth |
| Chat | ✅ | ⏳ | ⏳ | Shell only; blocked on `messageApi` + auth |
| Profile (medical card) | ✅ | 🔬 | 🔬 | All sections ported with coded chips, on the web's fictitious `mock-0001`; a Settings card at the end opens the Settings route. **Not ported:** the photo picker, the ECG education guide, and live data (blocked on `profileApi` + auth) |
| Account popover (top-end avatar) | ✅ | — | — | **Deliberate divergence.** Mobile has no top bar to hang an avatar off — the dock is the whole navigation. Its contents (theme, background) live in Settings instead, reached from the bottom of Profile |
| **Settings** | ✅ | 🔬 | 🔬 | Ported page: Appearance · Notifications · Care connection · ECG Device · Privacy & Security · Account · About, with the same pastel illustrations. See the Settings table below for the rows that differ |

## Platform capabilities

| Capability | Web | iOS | Android | Notes |
|---|---|---|---|---|
| BLE ECG link (frozen GATT contract) | ✅ Web Bluetooth | 🔬 Swift/CoreBluetooth | ✅ Kotlin/BluetoothGatt | `modules/cyphix-ble` — parsing off the JS thread, 10 Hz batches |
| ECG simulator fallback | ✅ | ✅ | ✅ | Auto-selected when the native module is absent (Expo Go); UI badges it `SIMULATED` |
| Live waveform rendering | ✅ Canvas | 🔬 Skia | ✅ Skia | Mobile redraws at 30 Hz from the ring buffer; worklet-driven path is the next step |
| ECG DSP (Einthoven, filters, Pan-Tompkins) | ✅ | ⏳ | ⏳ | **Must be numerically identical** when ported — same frozen coefficients, no per-platform tuning |
| Gemini Live narrator | ✅ | ⏳ | ⏳ | Protocol is frozen; port as-is or route through the server |
| Auth (bearer + refresh) | ✅ | 🟡 | 🟡 | `httpBaseQuery` twin done incl. 401→refresh→retry; `refreshSession` still a stub, tokens in SecureStore |
| Audit logging | ✅ | ⏳ | ⏳ | Port `auditLogger` (references only, never PII) |
| RBAC route guards | ✅ | ⏳ | ⏳ | Lands with auth |
| i18n — strings (en/he) | ✅ | 🔬 | 🔬 | v0.13.0. Same four-file shape as the web (`config` registry · `I18nContext` · `I18nProvider` · `useTranslation`) and the same key names wherever the copy is the same sentence, so the Hebrew is copied verbatim from the web locale rather than re-invented. `he.ts` is typed `Record<TranslationKey, string>`, so a missing key is a **compile error**, never a blank label. **Divergence:** the choice is stored in the preferences slice, not its own key — `PreferencesGate` already hydrates that before the first paint, and a separate async read would open the app in English and repaint in Hebrew a frame later. Screens call `tr()` (`const { t: tr }`) because `t` is already bound to the theme tokens app-wide |
| ↳ i18n — RTL layout | ✅ (`<html dir>` mirrors everything) | 🟡 | 🟡 | **Partial, and deliberately so.** Rows, section headers, metric tiles, chips, the profile identity block and the forward chevron all reverse and re-align off `useTranslation().rtl`. What is NOT done is native mirroring: that is `I18nManager.forceRTL()`, which is process-wide and only applies **after a relaunch** — flipping it under a patient mid-session, with no `expo-updates` to reload cleanly, would be worse than the gap. When it lands it needs an explicit "restart to apply" flow. Deliberately **never** mirrored even then: the interval-bar axis (scaleMin→scaleMax is a number line) and the ECG paper itself (time runs left→right on every ECG on earth) |
| ↳ i18n — what is NOT translated | — | ✅ | ✅ | On purpose, and each has a comment at the site: clinical `display` values on coded chips (ICD-10 / SNOMED data, not copy) · lead names (I, II, aVR…) · unit symbols (BPM, ms, Hz, mV, %) · the 25 mm/s · 10 mm/mV scale · `APP_BUILD_LABEL` (a developer identifier a bug report should quote verbatim) · the brand name · the platform's own BLE error text, which is shown untranslated rather than replaced by a generic sentence that says less |
| ↳ i18n — dock order under RTL | ✅ mirrors | — | — | Deliberately fixed. Home is the centre anchor with two items either side, so mirroring moves nothing meaningful — while the sliding pill's offset is `state.index * step`, indexed off `state.routes`. Reversing one and not the other lights the wrong tab |
| Theme (light/dark) | ✅ | 🔬 | 🔬 | Tokens ported 1:1 from `tokens.css`. Resolution order is the Settings choice, then the OS (`useIsDark`) — every surface must use that hook, never `useColorScheme()` directly, or the app goes half dark |
| Report geometry (mm grid + path) | ✅ own copy | 🔬 | 🔬 | **Now shared** in `CYPHIX_SHARED/src/ecg/ecgPath.ts` + `ecgGrid.ts`, consumed by mobile. An interval measured off the web sheet and off the phone must land on one ruler. ⚠️ The web still imports its own copies under `src/services/ecg/` and imports NOTHING from `@cyphix/shared` (verified) — until it migrates, edit both |
| Preference persistence | ✅ (`localStorage`) | 🔬 | 🔬 | `preferencesSlice` + AsyncStorage, hydrated before first paint. **Tokens stay in SecureStore** — non-secret settings must not be joined to them |

## Settings rows (where mobile differs from the web page, and why)

| Row | Web | iOS | Android | Notes |
|---|---|---|---|---|
| Appearance › Theme | ✅ dark-mode switch | 🔬 | 🔬 | Three-way System / Light / Dark. The web's binary switch has no "follow the OS" option; a phone needs one |
| Appearance › Background | ✅ | 🔬 | 🔬 | Named swatches, never colour alone |
| Appearance › Text size | ✅ 4-step scale | — | — | **Deliberate divergence.** The web scales its own root font because a browser page has one. iOS and Android already own text size system-wide (Dynamic Type / Font size) and every screen here respects it; a second app-only scale would fight the phone's own setting and confuse exactly the patients it is for. The row explains this instead |
| Appearance › Language (en/he) | ✅ `<select>` | 🔬 | 🔬 | v0.13.0. **Deliberate UI divergence:** a row of 44 pt pills, not a dropdown — RN has no non-modal `<select>`, and a patient who opened the app in a language they cannot read must not have to open a menu whose label is in that language to escape it. Registry-driven from `LANG_META`, so it wraps rather than redesigns when a third language is added. Placed **first** in Appearance for the same reason. Each language is named in its own script (`English`, `עברית`), never translated |
| Notifications (3 toggles) | ✅ | 🔬 | 🔬 | Stored; **nothing schedules a notification yet** — the switches are the flags a future push service reads, exactly as on the web |
| Care connection | ✅ | 🔬 | 🔬 | Ported |
| ECG Device | ✅ | 🔬 | 🔬 | Status / device name / connect / disconnect. **Not ported:** the "Live Scan" debug entry — no scan engine on mobile yet |
| Privacy › On-device processing | ✅ | 🔬 | 🔬 | Ported |
| Privacy › AI voice-guide key | ✅ | ⏳ | ⏳ | Gemini Live is web-only today; a key field here would configure nothing |
| Privacy › Export my data | ✅ Coming soon | 🔬 | 🔬 | Same "Coming soon" chip as the web |
| Account › Name / Role | ✅ | 🔬 | 🔬 | From the fictitious demo card until auth lands |
| Account › Sign out | ✅ | ⏳ | ⏳ | Shown disabled. Mobile auth is still the demo card — a sign-out that cannot sign anyone out is worse than none |
| Account › Preview as role | ✅ (demo control) | ⏳ | ⏳ | Needs RBAC on mobile first |
| Clinic & Server (admin) | ✅ | ⏳ | ⏳ | Admin-gated on the web; there is no role to check against yet |
| About | ✅ | 🔬 | 🔬 | Version + build label + compliance. **Not ported:** the "AI model" row — no ONNX artifact ships on mobile yet |

## Phone-scale departures from the web layout (v0.9.0)

A landscape phone is ~390 pt tall; the web's exam CSS was measured on a
viewport several times that. These are the places the sizes had to change so
the layout would still *mean* the same thing. Structure, order and copy are
untouched, and **above a 500 pt stage every one of these reverts to the web's
own value**.

| Element | Web | Phone (< 500 pt stage) | Why |
|---|---|---|---|
| Prep confirm button | 18 px pad · 21 px text | 13 px pad · 16 px text | Was taller than the photograph's remaining slot; still over the 44 pt tap-target floor |
| Prep headline | `clamp(23px, 5vw, 34px)` | driven by stage HEIGHT (~20 px) | `5vw` assumes width is the SHORT edge; in landscape it is the long one, so the web formula pins the headline at its ceiling |
| Prep headline width | `max-width: 640px` | full stage width | At ~20 px the longest step title then fits on ONE line, worth ~30 pt of photograph |
| Prep gaps / dots | 16–28 px · 9 px | 10 px · 7 px | Pure chrome |
| Capture countdown | 132 px ring in the foot | **the same ring at 40 pt, in the bar** beside the BPM, labelled `SEC LEFT` | The foot is then empty during a capture and is not rendered, so the traces take the whole screen. **User-requested.** 40 pt is ≤ the bar's existing content height (the Exit pill sets it at ~41), so the ring costs the traces nothing — bar is 57 pt with it and without. The 132 px foot ring is still used above 500 pt |
| Bar subtitle | `limbHowTo` idle · `limbRecordingNow` recording | not shown at all | Idle: the guide circle carries it in larger type. Recording: the draining ring already says a capture is running, and a line of prose is read once then occupies the traces' height for ten seconds. Dropped, never ellipsised — a clinical instruction cut mid-sentence is not a shorter version of it |
| Prep step-2 title | "Rest that hand on your left thigh — the back of the watch touching your leg" (74 chars) | "Rest that hand on your left thigh" | The long line wrapped to a second row and stole ~25 pt from step 2's OWN photograph, so the two steps showed different-sized pictures. The dropped detail — which way round the watch sits — is exactly what the photograph shows |
| Prep title height | auto | FIXED at one line | The picture's slot is the flex remainder, so anything above it that changes size between steps changes the picture's size too. `adjustsFontSizeToFit` shrinks a longer string rather than truncating it |
| Auto-arm hint | always | hidden while the guide circle is up | The circle's caption already says the recording starts on its own |
| Simulation badge | `SIMULATION — not a real signal` | `SIMULATION` | Full sentence kept as the accessibility label. Shortened only so it cannot push Exit off the bar; it still says the one thing that matters |
| Lead-card padding | 8 px | `floor(cardH × 0.06)`, clamped 3–8 | A fixed 8 px is a quarter of a short card's trace. **Scaled, not stepped** — a threshold would make traces shrink as the layout grew. Rounds DOWN: it is dead margin, so the spare point goes to the trace |
| Grid gap between cards | 10 px | 6 px on grids under 400 pt | A phone spent 20 of ~300 pt of grid on two seams; a seam carries no signal |
| Bottom safe-area inset | n/a | home indicator NOT reserved; Android 3-button nav bar is | The pill is a thin overlay and the grid beneath it has nothing to tap. Same `> 40` test as `dockMetrics.dockBottomOffset` |

Resulting geometry (computed from the formulas, worst case, iPhone 15 Pro /
SE 3rd gen / Pixel 7 / Pixel with 3-button nav): prep photograph **393 × 221 –
462 × 260** (was ~259 × 146); trace **72–82 pt** waiting and **83–94 pt**
recording (was ~52 pt at v0.8.0 — **+71 %**), 311–425 pt wide.

## Traps this port has already paid for twice — do not reintroduce

| Trap | What happens | Rule |
|---|---|---|
| `StyleSheet.absoluteFill` on an `<Image>` with `resizeMode="contain"` inside an `overflow: hidden` parent | The Image takes its box from four zero insets with no intrinsic size, `contain` resolves against the wrong frame, and the parent crops the photo to a corner — the patient sees one finger. Broke `LimbPrep` in v4.0.0 and again in v0.10.0 | Pass explicit point `width`/`height`. Use `position: 'absolute'` for stacking only |
| Deriving a visual from "what the real thing looks like" | v0.10.0 painted the report strips on pink clinical ECG paper. CYPHIX's sheet is white with a blue grid (`--ecg-*` in `report.css`) | The web is the reference for anything on a brand surface. Read the token, do not reason about the domain |
| Two writers of the iOS orientation API | Three rotations per navigation (v0.8.0 post-mortem in `RootNavigator`) | react-native-screens only — route `orientation` or `navigation.setOptions`. `lockAsync` is banned |
| Stepping a size on a threshold | An 89 pt lead card drew a TALLER trace than a 92 pt one, so traces shrank as the layout grew | Scale continuously, and round dead margin DOWN |
| A `<Text>` in a `flexDirection: 'row'` | Does not wrap — it overflows its parent and prints through the border. Word-valued metrics ("Slightly variable") escaped their tiles in v0.11.0 | `flexShrink: 1` on anything that can be long, `flexShrink: 0` on the unit beside it |
| Porting a **print** layout element-for-element | The report's two A4 sheets became a repeated letterhead and six 51 pt slivers on a phone. Every element was faithful; the result was a fax (v0.11.0) | Root §3.3 is two halves: brand identity is identical, **layout follows the platform**. Ask what the layout is solving for — a printer is not a thumb |

## Open verification debt

- Everything marked 🔬 was built on Windows and has **never run on an
  iPhone**. Per root `CLAUDE.md` §5, do not claim iOS works until it has run
  via Expo Go (UI only) or an EAS dev build (native BLE included).
- The Swift and Kotlin packet parsers duplicate `parseEcgPacket()` by hand.
  If the packet format ever changes, all three must change together —
  consider a shared test vector fixture before clinical use.

<!-- v0.6.0 — Report polish rows (continuous sheet, glass action bar, full-width
     axis dial) and the row-Text overflow trap. -->
