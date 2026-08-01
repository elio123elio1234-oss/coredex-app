# CLAUDE.md — CYPHIX Medical Mobile (iOS + Android)

> **Read `../CLAUDE.md` first** — the root cross-platform constitution governs
> anything that crosses a project boundary (the Cross-Platform Rule, the shared
> package, the API/AI single source of truth). This file covers only what is
> specific to the mobile app.
>
> Web rules that are platform-independent apply here verbatim
> (`../CYPHIX_MEDICAL_WEB/CLAUDE.md`): FHIR R4 typing, RBAC, audit logging,
> data minimization, fictitious PII only, async always modeled, one component
> per file, version footers.

---

## 1. Expo SDK 54 — pinned to what Expo Go can run

This project is on **Expo SDK 54 / React Native 0.81.5 / React 19.1 /
TypeScript 5.9**. Docs: <https://docs.expo.dev/versions/v54.0.0/>.

**Why 54 and not the newest.** `create-expo-app@latest` scaffolds whatever npm
tags `latest` (SDK 57 at the time of writing), but the **Expo Go app in the App
Store runs exactly one SDK**, and it lags npm by several releases. A project on
a newer SDK than Expo Go's fails on the phone with *"Project is incompatible
with this version of Expo Go"* — which reads like a stale app but is not; the
user is on the newest Expo Go there is.

The authoritative check before changing the SDK:

```bash
curl -s https://api.expo.dev/v2/versions/latest | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).data.expoGoSdkVersion))"
```

Keep `expo` on that version so UI work stays previewable in Expo Go. Upgrading
past it is a deliberate trade: it buys newer APIs and costs the Expo Go
workflow, so it must come with a development build (`eas build --profile
development`). Realign every dependency with `npx expo install --fix` after any
SDK change — never bump `expo` alone.

**★ The dev server must advertise a LAN address.** Expo's own detection fails on
this machine and reports `hostUri: 127.0.0.1`, making every printed QR encode
`exp://127.0.0.1:<port>` — a phone scanning that points at itself, and scanners
call the unusable localhost URL "no usable data found", which reads as a broken
QR rather than a wrong address. **Always launch with `npm start`**
(`scripts/start.js`), never bare `npx expo start`. Verify after any change to
the launcher:

```bash
curl -s http://127.0.0.1:8081 -H "expo-platform: ios" \
  -H "accept: application/expo+json,application/json" | \
  node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).extra.expoClient.hostUri))"
```

It must print a LAN address, never `127.0.0.1`.

Gotchas already paid for here — don't reintroduce them:
- Write `paths` relative (`"@/*": ["./src/*"]`) and don't add `baseUrl`; TS 6
  deprecates it, and relative paths work on 5.9 and 6 alike.
- Expo's `EventsMap` constraint is an index signature, so a native module's
  event map must be a **type alias**, not an `interface`
  (`modules/cyphix-ble/index.ts`).
- `src/app/` is reserved: the CLI announces "Using src/app as the root
  directory for Expo Router" if it exists. The store lives in `src/store/`.
- `@expo/vector-icons` needs `expo-font` installed explicitly or standalone
  builds crash. Run `npx expo-doctor` before shipping — it catches this class
  of peer-dependency break that bundling alone does not.
- **Never wrap a Skia `<Canvas/>` in the `Pressable` that is meant to receive
  its taps.** The canvas is a native view that can claim the touch, and the
  enclosing `Pressable` then never fires — a control that animates perfectly
  and does nothing. Put the hit layer *above* the canvas as an empty
  absolutely-positioned `Pressable`, and mark every visual layer
  `pointerEvents="none"` (`HeroBlobButton.tsx`).
- **A floating element's offset is measured from the screen edge, not added to
  the safe-area inset.** The web's `bottom: clamp(12px, 2.4vh, 24px)` already
  describes the distance the inset covers; `insets.bottom + 12` parked the dock
  at 46px on an iPhone, more than twice the web's. The one inset that *is* real
  chrome to clear is Android's opaque 3-button nav bar (`insets.bottom > 40`).
  A home indicator or gesture pill may be floated over.
- Typecheck + bundle + `expo-doctor` all passing means the code is well-formed,
  **not** that the app works. Dead tap targets, elements positioned off-screen
  and jammed animations pass all three. Anything user-facing stays
  `🔬 needs-device-verify` in `PARITY.md` until someone has touched it.

## 2. Layout

```
CYPHIX_MEDICAL_MOBILE/
├── App.tsx                  composition root: providers + tabs + version badge
├── metro.config.js          watches ../CYPHIX_SHARED, aliases @cyphix/shared
├── modules/cyphix-ble/      NATIVE BLE BRIDGE
│   ├── index.ts             typed JS face (optional module → null in Expo Go)
│   ├── ios/CyphixBleModule.swift        CoreBluetooth
│   └── android/.../CyphixBleModule.kt   BluetoothGatt
└── src/
    ├── store/               Redux store + typed hooks (web calls this `app/`;
    │                        renamed because Expo's CLI reserves `app/` for
    │                        Expo Router routes — do not rename it back)
    ├── config/              env, feature flags, version
    ├── theme/               tokens ported from web tokens.css + useTheme
    ├── services/            THE SERVICE LAYER — all IO
    │   ├── api/             baseApi, httpBaseQuery, tokenStore
    │   └── ble/             bleClient (native | simulator), ecgSimulator
    ├── features/            slices + feature hooks (ble/useBle)
    ├── components/          atoms → molecules → templates (pure presentation)
    ├── screens/             one per tab; compose components, call hooks
    └── navigation/          navConfig (mirrors web sidebar) + RootNavigator
```

Dependency direction, same as web: `screens → features(hooks) → services →
@cyphix/shared`. Components never import from `services/` or a slice.

`ios/` and `android/` are **generated** by `npx expo prebuild` and are
disposable — never hand-edit them. Native code belongs in `modules/*/`,
native config in `app.json`.

## 3. The real-time rule (why the BLE module is native)

**Per-sample ECG data must never touch the JS thread.** Both native modules
parse GATT notifications on their own thread, convert µV→mV, and flush
**batched** samples to JS at 10 Hz. `bleClient` writes them into a ring buffer;
Skia reads that buffer to draw. Redux carries only low-rate chrome state
(status, device name, HR) — never samples.

Consequences to preserve:
- Don't move packet parsing into JS "for simplicity".
- Don't put waveform data in Redux or React state per sample.
- The BLE constants live in `@cyphix/shared` and are a **frozen contract** with
  the ESP32 firmware. The Swift and Kotlin parsers mirror `parseEcgPacket()`
  by hand — if one changes, all three change together.
- On background/lock, mark streaming stale rather than rendering a frozen
  trace as live (web's `FRAME_STALE_MS` principle).

## 4. Simulator fallback is a feature, not a hack

`CyphixBleNative` is `requireOptionalNativeModule` — it is `null` in Expo Go
and on the web, where `bleClient` falls back to `EcgSimulator`. Any screen
showing simulated data **must** surface the `SIMULATED` badge
(`ble.simulated`). Synthetic data must never be presentable as a measurement.

## 5. Native feel

- Bottom tabs, not a sidebar. Same five modules, same order, same feature flags
  as the web `navConfig` — driven by `src/navigation/navConfig.ts`.
- System fonts only (San Francisco / Roboto). No custom font unless the brand
  requires it.
- Haptics on primary actions (`expo-haptics`).
- Reanimated for animation; native stack for transitions.
- Patient screens fit **without scrolling**; History stays doctor-dense.

## 6. Definition of Done (mobile)

- [ ] `npx tsc --noEmit` clean.
- [ ] `npx expo export --platform ios` **and** `--platform android` both bundle.
- [ ] `npx expo-doctor` passes.
- [ ] Feature works on Android (emulator or device) — and on iOS, or is marked
      `needs-iOS-verify` in `PARITY.md` (see root §5: no iOS Simulator on Windows).
- [ ] New shared shapes went into `CYPHIX_SHARED`, not into this app.
- [ ] `PARITY.md` row added/updated.
- [ ] `src/config/version.ts` bumped + `CHANGELOG.md` entry.
- [ ] Version footer updated on every touched file.

<!-- v0.1.0 — Mobile-specific rules: SDK 57 gotchas, layout, real-time rule, simulator honesty. -->
