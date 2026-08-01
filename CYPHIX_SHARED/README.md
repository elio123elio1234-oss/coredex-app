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
   changing the ESP32 firmware and three apps in lockstep.

// v1.0.0
