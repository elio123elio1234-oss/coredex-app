# CHANGELOG - CYPHIX Medical Mobile

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

