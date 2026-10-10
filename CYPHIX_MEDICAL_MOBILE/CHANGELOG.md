# CHANGELOG - CYPHIX Medical Mobile

## v0.111.0 - 2026-10-10 - the new CYPHIX logo, everywhere

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package; the
artwork is path data.

**Why.** The user supplied a new wordmark and asked for it on every
surface, web and native. See the web app's v1.83.0 entry for the full
reasoning — the same two facts drive both.

**The logo is the lettering alone.** The lockup — a navy blob with a
white dot, CYPHIX, and grey "MEDICAL" beside it — is not what was
supplied. `BrandLogo` therefore stopped being a different drawing from
`CyphixWordmark` and delegates to it. Its `crop` option went with the
change: it existed because the old viewBox carried 7.3 units of air on
the left and 27.6 on the right, which put the lockup ten units off
centre; the new viewBox is tight, so there is nothing to crop.

**One declaration, not three.** `CyphixWordmark`, `BrandLogo` and the
print engine's `services/export/pdf/logo.ts` all read the path from
`@cyphix/shared` v1.34.0 `brand/wordmark`. The print file used to carry
three hand-copied path strings under a comment conceding that "four
copies of one wordmark is not a design"; that is settled now.

**Every caller was resized, so nothing moves.** The old lockup was 5.83
units wide per unit tall (6.63 as the print engine cropped it); lettering
alone is 4.81. A caller keeping its width would have drawn a logo ~21 %
taller than the block it occupies. Widths were divided down to hold the
**rendered height** constant instead:

| caller | was | now |
|---|---|---|
| `PatientShell` floating brand | 160 | 132 |
| `ProfileScreen` footer brand | 160 | 132 |
| `ReportHeader` (PDF preview) | 112 | 92 |
| PDF letterhead (`pages.ts`) | 34 mm | 24.6 mm |

The 16 mm letterhead band and every `assertFits` figure are untouched —
that was the point of holding height rather than width.

The splash, welcome and lock screens already used `CyphixWordmark` and
needed no change: the new aspect is 4.81 against the old 4.89, under a
pixel of difference at the sizes they draw.

**Verified:** `tsc --noEmit` clean, `expo export` bundles. 🔬 Not yet
seen on an iPhone or an Android device — see PARITY.md.

## v0.110.0 - 2026-10-09 - two-factor sign-in for staff (TOTP)

**JS only — OTA onto runtime 0.45.0 (build 17); update group
`10634c7b-966d-4a1b-bba6-bf32e28ccba2`.** No new package: the
RFC 6238 maths the offline mock verifies codes with is pure TypeScript in
`@cyphix/shared` (v1.32.0), and the random bytes come from the
`expo-crypto` already shipped.

**Why.** LAUNCH_PLAN 5.5 (hole S14): the server (v0.24.0) and the web
(v1.81.0) got two-factor sign-in with an authenticator app for the staff
roles; the cross-platform rule puts the same row and the same sign-in
step on the phone in the same change-set.

**What.**
- **Settings → Account → "Two-factor sign-in"** (`TwoFactorSheet`),
  drawn for admin / clinician / technician by the REAL role (a preview
  role never draws it). Off: what it is, "Turn on". Setup: the key as
  selectable text and **"Open in authenticator app"** — the
  `otpauth://` URL handed to whichever app claims it (Linking; a
  refused open is said, not swallowed) — then a code, "Verify and turn
  on". Then the eight recovery codes, **shown once**, "I saved them".
  On: since when, codes left, "Turn off" → the password AND a current
  code (or a recovery code). The row's chip says On / Off from the
  principal's `totpEnabled`.
- **The sign-in's second step** (`TotpStep`, a new `'totp'` step in the
  onboarding model): when the server answers 202 with a challenge,
  `login()` rejects with a `TotpChallengeRequired` the slice parks as
  `totpChallenge` — not an error — and the flow moves from the password
  to the code; "Verify" spends it (`loginTotp`), back (header, link,
  hardware button) drops it. A wrong code keeps the challenge and says
  so; a dead one (five minutes, or spent) offers only the way back.
- **The mock does it for real:** against a build with no server the
  code a real authenticator app shows for the on-screen key verifies,
  the sign-in really has a second step, recovery codes are hashed and
  spent once.
- `authContract` extends `TotpContract` (the compiler catches a missing
  method on either implementation); three error codes; en/he copy.

**Deliberate divergence (PARITY.md).** No QR code on the phone: the
authenticator app is on the same device, so a picture to scan with
itself would be absurd — the key travels as a link and as text.

**Verified.** `tsc --noEmit` + `expo export` (OTA). 🔬 Not yet run on a
device: the otpauth:// hand-off to a real authenticator app and the
one-time-code keyboard hint are the two things to touch first.


## v0.109.0 - 2026-10-09 - Contact support from Settings

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package.

**Why.** LAUNCH_PLAN 5.4: the web got "Contact support" (v1.80.0) on the
server's new `POST /support` (v0.23.0); the cross-platform rule puts the
same row on the phone in the same change-set.

**What.** Settings → Account → "Contact support" opens `SupportSheet`: the
account's address shown (not asked), six category chips, a subject, the
text with its counter, Send. The server attaches the account (the bearer
token), uses its address and asks no CAPTCHA; the sheet then says where
the answer arrives and shows the reference. Errors are said plainly
(fields, 429, offline, other); a build with no server configured says
there is nowhere to send to instead of pretending. The welcome screen's
legal line gains "Need help? Contact support", which opens the web app's
public `/support` page in the browser — a person who cannot sign in has to
be able to say so, and the CAPTCHA already lives on that page (the same
rule as the sign-up's challenge). `contactApi` (one mutation);
`support:create` on the audit set; shared v1.31.1 names the page's path.

**Deliberate divergence (PARITY.md).** The phone renders no public form
of its own; the locked-out are sent to the web page.

**Verified.** `tsc --noEmit` + `expo export` (OTA). 🔬 Not yet run on a
device.


## v0.108.0 - 2026-10-09 - the permission matrix catches up (front desk invites)

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package. No
screen changes.

**Why.** LAUNCH_PLAN 4.5 gives the front desk (technician)
`invite:create` on the server (v0.21.0) and the web (v1.78.0). The
three copies of the matrix must stay identical (X3 is still 🔁), and
while making this edit it turned out the phone's copy never received
the four clinic-portal names of 3.2 (`request:read`, `request:manage`,
`invite:create`, `notification:read`) — 3.2's note that "all three
copies" had them was wrong for the phone. Nothing on the phone read
those names (no staff tools here, M13), which is why nothing broke and
nothing noticed.

**What.** `types/rbac.ts` v1.1.0: the four names in the union and in
the admin / clinician / technician / patient lists exactly as web
`rbac.ts` v1.4.0 and server `permissions.ts` v0.4.0 carry them,
including technician + `invite:create`.

**Verified.** `tsc --noEmit` and the OTA export; published as update
group `f5d4cad5-d96d-4813-8d91-defd67a427da` on channel `production`,
runtime 0.45.0. Behaviour on the phone is unchanged by construction (no
caller of the new names); nothing to run on a device for this one.

## v0.107.0 - 2026-10-09 - the request form is real, and the answer comes back

**JS only — OTA onto runtime 0.45.0 (build 17).** No new package.

**Why.** LAUNCH_PLAN 3.8 (M1). Since v0.92.0 the Chat tab has been a
request form that, pressed, said in words that nothing was sent —
because this app had no `messageApi`. The server has taken requests
since v0.1.0 and, since v0.17.0 (phase 3), keeps each one as a thing
with a status and tells the patient when it is answered. This is the
phone catching up with its own API.

**What.**
- `messageApi` (mirror of the web's): the thread, send (a request when
  it carries a reason), the patient's requests with status, one request
  with its replies, the notifications inbox. Two new cache tags.
- Send request → the real mutation: the recording as the attachment,
  the coded reason (SNOMED CT where there is one), the details as the
  text. Then one sentence: sent — or not sent and why (no care link
  yet · offline · an error). A build without a backend still says "not
  connected on this device", as before. Never dressed up.
- "Your requests": every request, newest first — reason, when, the
  recording, and a status in the patient's words (Sent · Being looked
  at · Answered · Closed). Asked again once a minute while the tab is
  in front.
- Tap one → `RequestDetailSheet`: what you sent and every reply from
  the care team; "has not answered yet" while it is open.
- A banner counts the unread updates on your requests ("the doctor
  answered", a status move); one tap clears them. This is the in-app
  half of 3.8; push (3.9) waits for the entitlement.
- Sign-in on a clinician account that awaits approval says so (server
  v0.18.0, `account-pending`); the phone has no clinician registration
  — that is the web's door (LAUNCH_PLAN 3.7, M13).

**Verified.** `tsc --noEmit` and the OTA export; published as update
group `81c2cf02-ca02-4585-83fe-338cb279a677` on channel `production`,
runtime 0.45.0. 🔬 **Not run on a device in this change-set**: the
list, the sheet and a real send were not touched on a phone — the
server side of every call is probed by the server's CI (v1.7.0 /
v1.8.0), the JS side is typechecked only.

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

