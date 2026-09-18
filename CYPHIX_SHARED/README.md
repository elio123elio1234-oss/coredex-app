# @cyphix/shared

The platform-neutral core of the CYPHIX platform — consumed as **TypeScript
source** (no build step) by:

- **Web** (`CYPHIX_MEDICAL_WEB`) via a Vite/tsconfig alias — migration of its
  existing duplicates into here is in progress (root `CLAUDE.md` §2.1).
- **Mobile** (`CYPHIX_MEDICAL_MOBILE`) via Metro `watchFolders` + the
  `@cyphix/shared` alias — already wired.

## Law

1. **Zero platform imports.** If it wouldn't run in plain Node, it doesn't
   belong here. No React, no DOM, no React Native.
2. **New endpoints / domain types / protocol constants are born here**, then
   consumed by every platform. Defining them inside one app is a violation of
   the root `CLAUDE.md`.
3. `src/ble/protocol.ts` is a **frozen hardware contract** — changing it means
   changing the ESP32 firmware and three apps in lockstep. Extend it by ADDING
   (the dual-Lead-II stream is a second characteristic, not a new stride on the
   old one), so no shipped build can misread what it was never told about.

## Checks

The repo's first headless check lives here. It needs no install — any `tsx` will
do, and the server ships one:

```
node ../CYPHIX_SERVER/node_modules/tsx/dist/cli.mjs scripts/verify-fusion.ts [playground.csv …]
```

It asserts the BLE parsers (legacy + 3-channel) and the `ecg/leadFusion`
guarantees against a simulated heart whose truth is known (R amplitude, ST
level, an ectopic beat passing through untouched, a bumped electrode being
weighted out), and REPORTS — it cannot assert — on real `HW_PLAYGROUND` CSVs
passed as arguments. Recordings of a real person stay out of the repo.

// v1.1.0 — documents the additive-contract rule and scripts/verify-fusion.ts
// v1.0.0
