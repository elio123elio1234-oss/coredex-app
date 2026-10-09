# CHANGELOG - CYPHIX Medical Mobile

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

