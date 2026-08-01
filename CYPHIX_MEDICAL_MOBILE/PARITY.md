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
| Teal wavy shell backdrop | ✅ | 🔬 | 🔬 | 5 ribbon paths + field gradient, both themes. **Not ported:** the four alternate background styles (white/gray/calm/glass) from the profile popover |
| Home (greeting + blob button) | ✅ | 🔬 | 🔬 | Orb, particles, morphing blob ported. **The tap target must stay ABOVE the Skia canvas** — wrapping the canvas in the `Pressable` let the canvas eat the touch and the button did nothing (v0.4.1). Greeting name is static until auth lands |
| **Limb (6-lead) exam** | ✅ | 🔬 | 🔬 | Full pipeline: LimbPrep → auto-armed monitor → 10 s capture → report. Uses the web's own guide photographs (`assets/guides/`). **Mobile-only:** the route is locked LANDSCAPE (six traces need the long edge) and the traces render on ECG paper per the BeatAlign-Native reference — the web has neither. **Not ported:** the 12-lead chain into the chest protocol, and saving to Scan History |
| Real frosted glass | ✅ (`backdrop-filter`) | 🔬 | 🔬 | `GlassSurface` atom. iOS 26+ uses Apple **Liquid Glass** (`expo-glass-effect`), which the web has no equivalent of; older iOS uses UIBlurEffect; Android needs `experimentalBlurMethod="dimezisBlurView"` or `expo-blur` does not blur **at all** |
| ECG signal chain (DSP, Pan-Tompkins, report filter, analysis) | ✅ | ✅ | ✅ | **Now shared** in `CYPHIX_SHARED/src/ecg/`, consumed by mobile. ⚠️ The web still imports its own copy under `src/services/ecg/` — migrate it, and until then edit both |
| Live Scan (camera + ONNX pose) | ✅ | ⏳ | ⏳ | Needs camera + `onnxruntime-react-native`; geometry math must be copied verbatim from web `services/scan/` |
| Guided chest protocol (V1→V6 FSM) | ✅ | ⏳ | ⏳ | Depends on the scan engine landing first |
| Tests | ✅ | ⏳ | ⏳ | Shell only; blocked on `recordingApi` + auth |
| History (doctor) | ✅ | ⏳ | ⏳ | Shell only; blocked on `recordingApi` + auth |
| Chat | ✅ | ⏳ | ⏳ | Shell only; blocked on `messageApi` + auth |
| Profile (medical card) | ✅ | 🔬 | 🔬 | All sections ported with coded chips, on the web's fictitious `mock-0001`. **Not ported:** the photo picker, the ECG education guide, and live data (blocked on `profileApi` + auth) |
| Account popover (top-end avatar) | ✅ | ⏳ | ⏳ | Web has theme/language/background pickers there |

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
| Theme (light/dark) | ✅ | 🔬 | ✅ | Mobile follows the OS; tokens ported 1:1 from `tokens.css` |

## Open verification debt

- Everything marked 🔬 was built on Windows and has **never run on an
  iPhone**. Per root `CLAUDE.md` §5, do not claim iOS works until it has run
  via Expo Go (UI only) or an EAS dev build (native BLE included).
- The Swift and Kotlin packet parsers duplicate `parseEcgPacket()` by hand.
  If the packet format ever changes, all three must change together —
  consider a shared test vector fixture before clinical use.

<!-- v0.1.0 — Initial ledger at mobile bootstrap. -->
