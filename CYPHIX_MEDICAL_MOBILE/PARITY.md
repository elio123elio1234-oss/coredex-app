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
| i18n (en/he + RTL) | ✅ | ⏳ | ⏳ | RN needs `I18nManager` RTL handling |
| Theme (light/dark) | ✅ | 🔬 | 🔬 | Tokens ported 1:1 from `tokens.css`. Resolution order is the Settings choice, then the OS (`useIsDark`) — every surface must use that hook, never `useColorScheme()` directly, or the app goes half dark |
| Preference persistence | ✅ (`localStorage`) | 🔬 | 🔬 | `preferencesSlice` + AsyncStorage, hydrated before first paint. **Tokens stay in SecureStore** — non-secret settings must not be joined to them |

## Settings rows (where mobile differs from the web page, and why)

| Row | Web | iOS | Android | Notes |
|---|---|---|---|---|
| Appearance › Theme | ✅ dark-mode switch | 🔬 | 🔬 | Three-way System / Light / Dark. The web's binary switch has no "follow the OS" option; a phone needs one |
| Appearance › Background | ✅ | 🔬 | 🔬 | Named swatches, never colour alone |
| Appearance › Text size | ✅ 4-step scale | — | — | **Deliberate divergence.** The web scales its own root font because a browser page has one. iOS and Android already own text size system-wide (Dynamic Type / Font size) and every screen here respects it; a second app-only scale would fight the phone's own setting and confuse exactly the patients it is for. The row explains this instead |
| Appearance › Language (en/he) | ✅ | ⏳ | ⏳ | Blocked on the i18n layer landing (see the capabilities table) |
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
| Capture countdown | 132 px ring in the foot | number + `SEC LEFT` in the bar, beside the BPM | The foot is then empty during a capture and is not rendered, so the traces take the whole screen. **User-requested.** The ring is still used above 500 pt |
| Bar subtitle (idle) | full `limbHowTo` line | not shown | The guide circle over the traces carries it in larger type. Dropped, never ellipsised — a clinical instruction cut mid-sentence is not a shorter version of it |
| Auto-arm hint | always | hidden while the guide circle is up | The circle's caption already says the recording starts on its own |
| Simulation badge | `SIMULATION — not a real signal` | `SIMULATION` | Full sentence kept as the accessibility label. Shortened only so it cannot push Exit off the bar; it still says the one thing that matters |
| Lead-card padding | 8 px | scales 3–8 px with card height | A fixed 8 px is a quarter of a short card's trace. **Scaled, not stepped** — a threshold would make traces shrink as the layout grew |

Resulting geometry (computed from the formulas, worst case, iPhone 15 Pro /
SE 3rd gen / Pixel 7): prep photograph **393 × 221 – 462 × 260** (was ~259 ×
146); trace **66–72 pt** waiting, **78–84 pt** recording (was ~52 pt).

## Open verification debt

- Everything marked 🔬 was built on Windows and has **never run on an
  iPhone**. Per root `CLAUDE.md` §5, do not claim iOS works until it has run
  via Expo Go (UI only) or an EAS dev build (native BLE included).
- The Swift and Kotlin packet parsers duplicate `parseEcgPacket()` by hand.
  If the packet format ever changes, all three must change together —
  consider a shared test vector fixture before clinical use.

<!-- v0.3.0 — Adds the phone-scale table: every place the web's desktop sizes
     had to change for a ~390pt landscape stage, and what reverts above it. -->
