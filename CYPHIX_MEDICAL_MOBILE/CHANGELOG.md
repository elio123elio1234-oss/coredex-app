# CHANGELOG - CYPHIX Medical Mobile

## v0.106.0 - 2026-10-09 - your care team, and a way to join it

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package.

**Why.** LAUNCH_PLAN phase 2 (2.4, 2.6): the server has linked patients
to clinicians by invite code since its first schema and this app could
neither show a link nor make one. Server v0.16.0 answers what a screen
needs; web v1.68.0/v1.69.0 is the browser half; this is the phone's.

**What.**
- **Settings → Care connection:** under the private-doctor / clinic
  switch, the rows of who this account is connected to — name,
  speciality or "Clinic", the day it was agreed, the clinic's assigned
  clinician — each a tap to **Disconnect** (an Alert confirms; the link
  ends on both sides and the card refreshes). Staff see their patients
  in the same rows. Loading, failure and "nobody yet" are rows too.
- **"Join a doctor or clinic"** (patients only) → `JoinCareSheet`: the
  8-character code, upper-cased and dashed as typed, the consent
  sentence in plain words above the button (redeeming IS the recorded
  consent), one sentence for wrong / used / expired / cancelled (the
  server's one 404), "already connected" its own. Success names who was
  joined.
- **Deep link.** `cyphix://link/CODE` — or the web `/link/CODE` URL a QR
  code or a shared message carries — raises the sheet pre-filled
  (`CareLinkHost`, mounted above the gate: a code that arrives signed
  out waits for the sign-in; staff's is dropped). No native change: the
  scheme has been in `app.json` since the first build.
- **The request form** (Chat tab) shows a banner when nobody is linked,
  opening the same sheet — the phone's twin of web 2.5.
- **Offline build:** `careStore` seeds the demo doctor and clinic;
  `CYPHDEM2` / `CYPHCNC2` join them back after a disconnect; any other
  well-formed code is "not found" — the same table as the web mock.

**Deliberately NOT in this build — QR scanning.** It needs `expo-camera`,
a new native dependency (a SOUP evaluation and a rebuild), and native
work goes last. The phone's own camera app reads the QR (it is a web
URL), the page offers "Open in the CYPHIX app", and the deep link does
the rest. Recorded in PARITY.md as pending with this reason.

🔬 Needs a device: the sheet with the keyboard up, the Alert's two
buttons in Hebrew, the deep link arriving signed out and then signed
in, and the whole flow against Render 0.16.0 with a real code.

## v0.105.0 - 2026-10-09 - a bot check at sign-up, when the server asks for one

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package: the
challenge is the web app's own public `/captcha` page shown in the
`react-native-webview` this binary has carried since app.json 0.35.0
(`OptionalWebView`), and Cloudflare's widget runs inside that page.

**Why.** LAUNCH_PLAN step 1.10 (hole S8). Server v0.15.0 can demand a
Cloudflare Turnstile token on `POST /auth/register`; web v1.67.0 shows
the widget on its review step and hosts the page the phone borrows.
This is the phone's half.

**What.**
- **"Confirm and finish" asks first.** `GET /auth/captcha` — `off`
  (every deployment until someone pastes Turnstile keys into Render)
  creates the account exactly as v0.104.0 did; a named provider raises
  `CaptchaSheet` over the review step.
- **`CaptchaSheet`:** the web's `/captcha?embed=1&lang=…` in a 300 pt
  WebView; the page posts `{type:'cyphix-captcha', token}` (shared
  contract) and the sheet closes and registers with it. A binary without
  the WebView, or a page that will not load, offers "Open the check"
  instead: the same page in the system browser with
  `return=cyphix://captcha`, and `AuthLinkListener` brings the token back
  to the review step as a deep link (kind `captcha`, shared v1.23.0).
- **Refusals:** `captcha-required` / `captcha-failed` from the server
  put a line under the summary and raise the sheet again — a token is
  single-use and lives 300 s, so a retry needs a new one.
- **Deliberate divergence from web:** the phone draws no widget of its
  own. One page, one set of words; nothing to drift. Recorded in
  PARITY.md.

🔬 Needs a device: the WebView's `postMessage` round trip, the sheet
height with the widget in Hebrew, and the browser fallback's return
through the `cyphix://` scheme have only been typechecked and bundled.

## v0.104.0 - 2026-10-09 - take your data with you; have your account erased

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package: the
export rides the share sheet already used for ECG exports
(`shareFile`), the deletion sheet is the account sheet pattern.

**Why.** LAUNCH_PLAN step 1.9 (GDPR Art. 15/17/20, Apple's account-
deletion rule for App Review). Settings → Privacy has said "Export my
data — coming soon" since the first Settings screen, and there was no way
to leave at all. Server v0.14.0 answers both; web v1.66.0 is the browser
half; this is the phone's.

**What.**
- **Settings → Privacy → "Export my data":** real. One tap fetches the
  account as ONE JSON document (`cyphix-export/1`: account, patient
  resource + health profile + conditions, recordings, message threads,
  care relationships, consents — decrypted for its owner) and hands it to
  the OS share sheet as `cyphix-export-<day>.json` (Files, Mail,
  AirDrop…; `.json` carries its UTI so iOS offers the right apps). The
  chip is the state machine — Download / Preparing… / Shared — and a
  failure says so in the row and offers "Try again". Server rate limit:
  3 exports an hour.
- **Settings → Account → "Delete account":** a sheet that says what
  happens — everything erased **14 days** from now, the account keeps
  working until then — and asks for the password (a miss is "The
  current password is incorrect.", not a generic error; the destructive
  button is red and grey until something is typed). On success nothing
  is deleted yet: the sheet names the day, an e-mail goes out, and the
  Settings row flips to **"Deletion scheduled — your account will be
  erased on <day>. Tap to cancel."** One tap cancels (the safe direction
  needs no second confirmation). The status is loaded with the screen, so
  the row tells the truth after a reinstall or from another device.
- **Offline mock:** the same four calls to the server's shape — the
  export carries the account and its consents (the offline build has no
  server-side recordings, so those lists are honestly empty); deletion is
  scheduled on the stored account and cancelled from it.
- **AuthPrimaryButton** gains `tone="danger"` (palette.weak when ready).

**Verified:** `tsc --noEmit` clean; 🔬 needs a device for the share sheet
and the sheet itself (PARITY.md).

