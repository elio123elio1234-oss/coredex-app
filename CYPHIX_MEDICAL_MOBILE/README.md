# CYPHIX Medical Mobile — iOS + Android

One React Native (Expo) codebase serving both platforms, sharing the API layer,
BLE protocol and domain types with the web app through `../CYPHIX_SHARED`.

Rules live in `./CLAUDE.md` (mobile) and `../CLAUDE.md` (cross-platform).
Feature parity is tracked in `./PARITY.md`.

---

## איך רואים את האפליקציה — Running it

```powershell
cd "c:\Users\elio1\Desktop\Coredex_App\CYPHIX_MEDICAL_MOBILE"
npm install    # once
npm start      # dev server + a SCANNABLE QR code
```

> ### ⚠️ Use `npm start`, not `npx expo start`
>
> On this machine Expo's LAN detection fails: plain `npx expo start` — and even
> `expo start --host lan` — advertises `hostUri: 127.0.0.1`, so the QR it prints
> encodes **`exp://127.0.0.1:8081`**. A phone scanning that points at *itself*,
> and scanners report the unusable localhost URL as **"no usable data found"** —
> which looks like a broken QR but is actually a wrong address.
>
> `npm start` runs `scripts/start.js`, which finds the real LAN address (skipping
> the VirtualBox `192.168.56.x` adapter), prints it, and passes it to Expo via
> `REACT_NATIVE_PACKAGER_HOSTNAME`. Detected fresh each run, so changing Wi-Fi
> networks just works. To override: `$env:REACT_NATIVE_PACKAGER_HOSTNAME = "1.2.3.4"`.

### 📱 iPhone — from this Windows machine

**The iOS Simulator cannot run on Windows.** Xcode is macOS-only; there is no
workaround, emulator, or VM path that Apple supports. Three real options:

**1. Expo Go on your own iPhone — fastest, works right now**
   1. Install **Expo Go** from the App Store.
   2. `npx expo start` on the PC.
   3. iPhone and PC on the **same Wi-Fi** → open the Camera app → scan the QR
      code in the terminal.
   4. If the office/home network blocks device-to-device traffic:
      `npx expo start --tunnel`.

   You get the full UI, navigation, theme and API layer. The native BLE module
   is **not** in Expo Go, so the app automatically falls back to the built-in
   ECG simulator and badges the screen `SIMULATED`.

**2. EAS Build — a real iOS app with the Swift BLE module, built on Expo's Macs**
   ```powershell
   npm install -g eas-cli
   eas login
   eas build --profile development --platform ios
   ```
   Produces an installable dev client (QR / TestFlight). Requires an Apple
   Developer account to install on a device. This is the only way to test
   CoreBluetooth against the ESP32 without owning a Mac.

**3. A Mac** (borrowed or CI): `npx expo run:ios`.

> Until a build has actually run on an iPhone, mark the feature
> `needs-iOS-verify` in `PARITY.md` — don't claim iOS works from Windows.

### 🤖 Android — full support on this machine

**Emulator**
   1. Install **Android Studio** → *More Actions* → **Virtual Device Manager**
      → create a device (Pixel 7, recent system image) → start it.
   2. `npx expo start` then press **`a`** — or `npm run android` to build and
      install the dev client (needed for the native BLE module).

**Physical phone**: enable USB debugging, plug it in, `npm run android`.

> The Android emulator has **no Bluetooth radio** — it will always use the
> simulator fallback. Real BLE requires a physical Android device.

---

## Scripts

| Command | What it does |
|---|---|
| `npx expo start` | Dev server (Expo Go / dev client) |
| `npm run android` | `expo run:android` — prebuild + native build + install |
| `npm run ios` | `expo run:ios` — **macOS only** |
| `npm run typecheck` | `tsc --noEmit` |
| `npx expo export --platform android` | Verify the bundle builds |
| `npx expo prebuild --clean` | Regenerate `ios/` + `android/` (disposable) |

## Configuration

`EXPO_PUBLIC_API_BASE_URL` points the app at `CYPHIX_SERVER`. Unset → the app
runs offline (no backend calls). Create `.env`:

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.20:3000
```

Use the PC's **LAN IP**, not `localhost` — a phone or emulator resolves
`localhost` to itself.

<!-- v0.1.0 -->
