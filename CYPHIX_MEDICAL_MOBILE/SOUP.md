# SOUP register — CYPHIX Medical (mobile)

> **SOUP** = *Software Of Unknown Provenance*: any software item already
> developed and generally available, that has not been developed for the
> purpose of being incorporated into this medical device — i.e. every
> third-party dependency. IEC 62304 requires each one to be **identified**
> (§8.1.2: title, manufacturer, version) and its potential failures to be
> **evaluated as a risk** (§7.1.2), not merely installed.
>
> ⚠️ **This file is the engineering record, not a regulatory submission.**
> It states what was verified and by whom it can be re-verified. Whether
> this product needs a 510(k), what its IEC 62304 software safety class is,
> and whether a Quality Management System is in place are determinations
> for a regulatory professional, and nothing here substitutes for one.

---

## Why this file exists

It was created when a dependency was added for a **decorative** reason, and
the right question was asked before it was allowed to stay:

> *“תמשיך רק אם זה בטוח לשימוש 100% ברמת דרישות FDA ולא דורש שום הוצאת
> מידע או API קבוע לשרת חיצוני”*

The honest answer had two halves. The **technical** half is verifiable and
is recorded below. The **process** half is that a third-party library in
device software is SOUP whether or not anyone writes it down, and until
this file there was nowhere to write it. The register is the answer to the
second half; it is not a claim about the first.

---

## 1. `thinking-orbs` — full evaluation

The item this register was opened for. Evaluated in more depth than the
rest because it was added deliberately and recently, and because the
question was asked about it specifically.

| Field (IEC 62304 §8.1.2) | Value |
|---|---|
| **Title** | `thinking-orbs` |
| **Manufacturer** | Jakub Antalik (npm: `jakubkubo`) |
| **Version** | `0.3.1`, published 2026-08-11 |
| **Licence** | MIT |
| **Repository** | `github.com/Jakubantalik/thinking-orbs` |
| **Purpose in this device** | One decorative loading animation on `BootSplash`, shown only after 1.5 s of waiting |
| **What is actually linked** | `thinking-orbs/engine` only — 19 146 bytes. The package's own React component is **never imported** |

### 1.1 Verified properties

Each of these was checked against the **published tarball and the built
app bundle**, not against the documentation:

| Property | Method | Result |
|---|---|---|
| Runtime dependencies | `package.json` | **none** (`dependencies: {}`) |
| Install scripts (`preinstall`/`install`/`postinstall`/`prepare`) | `package.json` | **none** |
| Network primitives (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`) | grep of `dist/engine.es.js` | **0 occurrences** |
| Persistence (`localStorage`, `indexedDB`) | grep | **0** |
| Dynamic code (`eval`, `new Function`, `import()`) | grep | **0** |
| Environment / filesystem (`process.env`, `require(`) | grep | **0** |
| Clock / entropy (`Date`, `crypto`) | grep | **0** |
| **Every global object referenced** | grep of all globals | `Math` ×155, `Object` ×2, `Set` ×1, `Map` ×1, `Array` ×1 — **and nothing else** |
| Web half excluded from the shipped bundle | `expo export`, then grep of the output | `getContext("2d")` → **0**, `prefers-color-scheme` → **0** |

The two DOM-ish strings that *do* appear in the app bundle were traced to
their real owners and are **not** this package: the single `matchMedia` is
Reanimated's reduced-motion check, and both `visibilityState` hits are RTK
Query's focus tracking.

### 1.2 Answering the question directly

- **Does it send data anywhere?** No. It contains no network primitive of
  any kind, and it is *structurally incapable* of exposing patient data
  because it is never given any: its entire input is `(size, elapsed
  seconds, preset constants)` and its entire output is a list of circle
  centres and radii.
- **Does it require a permanent API or external server?** No. It is
  compiled into the app bundle at build time. There is no CDN fetch, no
  licence check, no telemetry, no runtime host. An aeroplane-mode device
  runs it identically.
- **Does it add native code or permissions?** No. It is pure JavaScript,
  which is why it shipped as an OTA rather than a rebuild.

### 1.3 Risk evaluation (IEC 62304 §7.1.2)

**Failure modes considered:**

| Failure | Effect | Mitigation |
|---|---|---|
| Throws during render | React has no partial failure — without a boundary this unmounts the tree from the root, and because it is on the **first** screen, that is an app that does not start | ✅ `FailSoft` boundary; the fallback is the `ActivityIndicator` that preceded it, so the worst case is the previous release's appearance |
| Returns malformed geometry (NaN, huge radii) | Skia draws nothing, or a wrong shape, in a 104 pt box | Cosmetic only; no clinical content is in that box |
| Consumes CPU | Geometry runs on the JS thread | Raised only after 1.5 s, by which point the thread is blocked on a socket; bounded above by `RECOVERY_TIMEOUT_MS` (60 s) |
| Native memory growth | One `SkPicture` per frame, freed by GC | Bounded by the same 60 s ceiling. ⚠️ Documented in `ThinkingOrb` as the reason it must not become ambient chrome |
| Supply-chain: a future version is compromised | Would reach the device via an OTA | Pinned at `^0.3.1`; `package-lock.json` is committed. ⚠️ **Any version bump must repeat §1.1 before shipping** |

**Clinical impact: none.** The component renders no patient data, sits in
no measurement or diagnostic path, is not in the frozen DSP chain, and is
absent from every report. Its total influence on the device is which shape
moves on a loading screen.

**Residual concern, stated rather than dismissed:** it is a young package
(first published 2026-07-21) with one maintainer. That is a *maintenance*
risk, not a safety one — and the reason `ThinkingOrb` derives nothing and
only draws the list is so that dropping the dependency would mean deleting
one atom, not unpicking a port.

---

## 2. Register — all direct dependencies

All 41 of them, all MIT-licensed. Versions as installed and locked.

⚠️ **The ⏳ column is the honest part of this file.** Only
`thinking-orbs` has had the evaluation in §1 performed. The rest are
identified per §8.1.2 and **their risk evaluation is outstanding** — which
is the real, pre-existing gap this file makes visible instead of leaving
implied. Several of them (`expo-secure-store`, `expo-local-authentication`,
`expo-updates`, `@shopify/react-native-skia`, `react-native-reanimated`)
are materially closer to patient safety than the item that prompted it.

| Item | Version | Licence | Transitive deps | §7.1.2 risk evaluation |
|---|---|---|---|---|
| `@expo/vector-icons` | 15.1.1 | MIT | 0 | ⏳ |
| `@react-native-async-storage/async-storage` | 2.2.0 | MIT | 1 | ⏳ |
| `@react-native-community/datetimepicker` | 8.4.4 | MIT | 1 | ⏳ |
| `@react-navigation/bottom-tabs` | 7.18.14 | MIT | 3 | ⏳ |
| `@react-navigation/native` | 7.3.14 | MIT | 6 | ⏳ |
| `@react-navigation/native-stack` | 7.18.6 | MIT | 4 | ⏳ |
| `@reduxjs/toolkit` | 2.12.0 | MIT | 6 | ⏳ |
| `@shopify/react-native-skia` | 2.2.12 | MIT | 2 | ⏳ |
| `expo` | 54.0.37 | MIT | 21 | ⏳ |
| `expo-blur` | 15.0.8 | MIT | 0 | ⏳ |
| `expo-constants` | 18.0.14 | MIT | 2 | ⏳ |
| `expo-crypto` | 15.0.9 | MIT | 1 | ⏳ |
| `expo-dev-client` | 6.0.21 | MIT | 5 | ⏳ |
| `expo-document-picker` | 14.0.8 | MIT | 0 | ⏳ |
| `expo-file-system` | 19.0.24 | MIT | 0 | ⏳ |
| `expo-font` | 14.0.12 | MIT | 1 | ⏳ |
| `expo-glass-effect` | 0.1.10 | MIT | 0 | ⏳ |
| `expo-haptics` | 15.0.8 | MIT | 0 | ⏳ |
| `expo-image-manipulator` | 14.0.8 | MIT | 1 | ⏳ |
| `expo-image-picker` | 17.0.11 | MIT | 1 | ⏳ |
| `expo-linear-gradient` | 15.0.8 | MIT | 0 | ⏳ |
| `expo-local-authentication` | 17.0.9 | MIT | 1 | ⏳ |
| `expo-notifications` | 0.32.17 | MIT | 7 | ⏳ |
| `expo-print` | 15.0.8 | MIT | 0 | ⏳ |
| `expo-screen-orientation` | 9.0.9 | MIT | 0 | ⏳ |
| `expo-secure-store` | 15.0.8 | MIT | 0 | ⏳ |
| `expo-sharing` | 14.0.8 | MIT | 0 | ⏳ |
| `expo-status-bar` | 3.0.9 | MIT | 1 | ⏳ |
| `expo-updates` | 29.0.20 | MIT | 14 | ⏳ |
| `expo-video` | 3.0.16 | MIT | 0 | ⏳ |
| `react` | 19.1.0 | MIT | 0 | ⏳ |
| `react-native` | 0.81.5 | MIT | 34 | ⏳ |
| `react-native-gesture-handler` | 2.28.0 | MIT | 3 | ⏳ |
| `react-native-reanimated` | 4.1.7 | MIT | 2 | ⏳ |
| `react-native-safe-area-context` | 5.6.2 | MIT | 0 | ⏳ |
| `react-native-screens` | 4.16.0 | MIT | 3 | ⏳ |
| `react-native-svg` | 15.12.1 | MIT | 3 | ⏳ |
| `react-native-webview` | 13.15.0 | MIT | 2 | ⏳ |
| `react-native-worklets` | 0.5.1 | MIT | 11 | ⏳ |
| `react-redux` | 9.3.0 | MIT | 2 | ⏳ |
| `thinking-orbs` | 0.3.1 | MIT | 0 | ⏳ |

---

## 3. When this file must be updated

- **Any new dependency.** Add a row; perform §1.1 if it is not from a
  publisher already in this register.
- **Any version bump of `thinking-orbs`.** Repeat §1.1 in full — the
  verification is of a *published artifact*, and a new artifact is
  unverified by definition.
- **Any change that moves a SOUP item closer to clinical content.** The
  evaluation above rests entirely on `thinking-orbs` drawing decoration on
  a loading screen. Put it anywhere a reader draws a conclusion from what
  it renders and §1.3 is void.

<!-- v1.0.0 — Opened when `thinking-orbs` was added and the right question was
     asked about it. Records what was verified against the published artifact
     and the built bundle rather than against documentation, and — more
     usefully — makes visible that the other 40 dependencies, several of them
     far closer to patient safety, have had no such evaluation. -->
