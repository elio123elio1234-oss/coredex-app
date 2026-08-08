/* App version — rendered in the visible badge (web CLAUDE.md §8 convention). */

export const APP_VERSION = '0.36.0';
export const APP_BUILD_LABEL = 'Reminders: see what the phone actually holds, and test it in a minute';

// v0.36.0 — An hour was spent waiting for a follow-up that never arrived, and
//           the app could not say why. That is the real defect this release
//           fixes; the follow-up itself was probably never armed, because a
//           rollback to 0.34.0 (no follow-up at all) and a `followUpMinutes`
//           that `normalizeSchedule` reset to null both leave exactly the
//           symptom seen: primary fires, second ask does not.
//           ★ "CHECK IT WORKS" — a section reporting what the OPERATING SYSTEM
//           actually holds, read from `getAllScheduledNotificationsAsync`.
//           Every other reading on that screen described INTENT (the switch,
//           the times, the next one due), and intent was never what was in
//           doubt. Two numbers would have answered the question in seconds.
//           ★ "SEND A TEST NOW" — the real primary in 10 s and the real
//           follow-up 70 s later, through the same content, category and
//           actions. Not a mock: if the test works and the scheduled one does
//           not, the difference is timing rather than plumbing. A feature whose
//           shortest honest interval is thirty minutes is otherwise close to
//           untestable, which is how an hour gets spent.
//           THE FOLLOW-UP NOW REPEATS — three times, ten minutes apart, all
//           carrying the same `due` so one Done or one measurement cancels the
//           chain rather than the next one only. One notification on a lock
//           screen is one chance to be looking at the phone.
//           ⚠️ Which forces a BUDGET: iOS keeps at most 64 pending
//           notifications and silently drops the rest, and 4 slots × 7 days × 3
//           repeats is 84. Occurrences are armed in TIME ORDER until the budget
//           is spent — tonight matters, next Tuesday's third repeat does not.
//           Android follow-ups get their own HIGH-importance channel. The
//           primary stays DEFAULT: it is a routine nudge at a time the patient
//           chose, and nothing this app produces is urgent by construction. The
//           follow-up is different, and the difference is consent — they
//           switched on a thing whose whole job is to catch a miss.
//           OTA: TypeScript only, app.json stays at 0.34.0.

// v0.35.1 — ⚠️ v0.35.0 CRASHED THE APP ON EVERY NAVIGATION. Rolled back to the
//           embedded 0.34.0 bundle within minutes; this is the fix.
//           WHAT HAPPENED. v0.35.0 added `schedule.followUpMinutes`. Every
//           existing install had a schedule PERSISTED BY v0.34, which has no
//           such field — and `hydrate` was `{ ...state, ...payload }`, which
//           replaces a nested object WHOLESALE, so the default never applied.
//           It came back `undefined`; `undefined !== null` passed the "is the
//           follow-up on?" guard; `new Date(NaN)` was built; and an Invalid
//           Date is TRUTHY, so it also survived `if (!followUpAt) continue`.
//           Handing it to the OS scheduler threw, inside a `void (async …)()`
//           with no catch — an unhandled rejection. `useReminders` is mounted
//           by the Tests TAB, so it re-fired on any navigation.
//           FIXED IN FOUR PLACES, because any one of them alone would have
//           left the next version of this bug live:
//             1. `hydrate` MERGES nested objects and runs the schedule through
//                the new `normalizeSchedule` — the root cause. What is on disk
//                was written by a different program and is untrusted input.
//             2. `normalizeSchedule` (shared) validates types and ranges, so
//                every optional field has exactly one absent value.
//             3. The scheduler checks `Number.isFinite(date.getTime())` rather
//                than truthiness, and `safely()` wraps every call into
//                expo-notifications.
//             4. Every `void (async …)()` in the feature now catches. A
//                reminder that fails to arm is a reminder that does not
//                arrive; it must never be an app that dies.
//           Verified against the exact crashing blob plus fourteen other
//           malformed shapes, and the nine behaviour cases still pass.
//           ★ THE LESSON, worth more than the fix: a persisted shape is
//           untrusted input, and `x !== null` is not a null check when the
//           value can be `undefined`.

// v0.35.0 — Two additions to reminders, both asked for.
//           THE SECOND ASK. Set a reading for 19:00 and, if nothing is in your
//           history by 20:00, the phone asks once more. The word doing the work
//           is IF: a patient who measured at 19:12 must not be nudged at 20:00
//           about the thing they already did, and nothing erodes a reminder
//           faster than being wrong about what you already know. A reading up
//           to 45 min EARLY counts too — 18:50 is the evening reading.
//           ⚠️ THE TWO KINDS ARE ARMED DIFFERENTLY, AND HAVE TO BE. The primary
//           reminder is a repeating DAILY trigger: it fires whether or not this
//           app has run in a month, and that guarantee is the feature. The
//           follow-up cannot be, because it is CONDITIONAL — nothing can
//           evaluate "did they measure?" while the app is closed. So it is
//           armed as DATED one-shots, a week ahead, and simply not armed where
//           a recording already answers it (cheaper than cancelling later, and
//           it works for a reading taken on another device and synced here).
//           The honest cost: follow-ups exist only as far ahead as they were
//           armed. Re-armed on every launch and after every recording, so a
//           patient would have to ignore the app for a week to lose them — by
//           which point the primary reminders, which never stop, are the thing
//           doing the work.
//           SNOOZE / DONE on the notification, so it is something the patient
//           ACTS on rather than only swipes away. Neither opens the app: the
//           whole point of "not now" is that it costs nothing. Done cancels
//           that occurrence's second ask — matched on the slot AND the date it
//           was due, because the same slot has a follow-up armed for each of
//           the next seven days and cancelling all of them would silence the
//           rest of the week.
//           ⚠️ ALSO FIXES A LATENT RACE. `useReminders` is mounted in three
//           places and Settings + Reminders are on screen together whenever the
//           editor is pushed, so two concurrent cancel-then-set passes could
//           interleave and leave duplicates or nothing. Every apply now goes
//           through a queue. It would have presented as "sometimes I get two",
//           which is close to impossible to reproduce on purpose.
//           Copy stays neutral by rule: no "you missed", no "you still
//           haven't". The app does not know why, and a reminder that scolds is
//           a reminder that gets switched off.
//           OTA: TypeScript only — `expo-notifications` is already in the
//           0.34.0 binary, and categories and actions are runtime calls into
//           it. app.json stays at 0.34.0.

// v0.34.2 — The boot splash was navy with the full lockup. It is now the CYPHIX
//           WORDMARK on white — the web's session-restore splash (`AuthGate`),
//           not its blob-and-orbit `LoadingScreen`. The distinction was the
//           user's and it is the right one anyway: this screen exists because a
//           disk read is in flight, which is a fraction of a second and is not
//           an occasion. Keeping the theatrical version for somewhere it is
//           earned is what keeps it meaning something.
//           Wordmark rather than `BrandLogo`: the lockup adds the mark and
//           "MEDICAL", which is full identification — right on a report, where
//           the issuer of a clinical document must be unambiguous, heavy on a
//           screen that is up for under a second.
//           ⚠️ The status bar flipped to DARK glyphs with it. Light ones were
//           correct on navy and are invisible on white, and nothing in a
//           typecheck, a bundle or expo-doctor catches that.
//           The splash floor dropped 1700 → 900 ms: 1700 existed so the old
//           ENTRANCE ANIMATION could finish, and that animation is gone. The
//           only job left is not flickering. Leaving it would have been a magic
//           number whose reason had been deleted out from under it.
//           The version line stays — with OTAs landing several times a day it
//           is the fastest honest answer to "did my change reach the phone?" —
//           but moved from `muted` to `label`, because #B3BCC9 at 75 % on white
//           is a line that is in the render tree and not on the screen.

// v0.34.1 — The reminder editor was a bottom sheet, and it read as small and
//           improvised on the phone. It was the wrong container: on iOS a
//           settings row with a chevron PUSHES a panel, and a sheet is for a
//           quick action or a single pick — not for a switch, a segmented
//           control, a list of times and an inline wheel.
//           It is a pushed route now (`Reminders`), which also gets it the
//           native slide transition, the edge-swipe back and as much height as
//           it needs. Built from Settings' OWN `SettingsSection` /
//           `SettingsRow` and the same page metrics — not for code reuse, for
//           CONTINUITY: it is reached from Settings and is part of it, so a
//           bespoke layout would announce itself as somewhere else. Looking
//           like the screen it came from is most of what "native" means here.
//           The two switches also collapsed into one ON THIS SCREEN: the
//           master switch and the schedule cannot usefully differ here, and a
//           patient facing two toggles that both say "reminders" has to work
//           out which is which. They stay separate in the model, so silencing
//           still does not forget the times.
//           OTA: TypeScript only, so app.json stays at 0.34.0 — the runtime
//           the installed build listens on.

// v0.34.0 — Reminders. The patient picks how many measurements a day and at
//           what times; the phone notifies them, every day, whether or not
//           this app has been opened since.
//           WHERE IT LIVES. The Settings row `testReminders` already existed
//           as a switch that stored a boolean and did nothing — it is now the
//           real thing, and the row itself opens the schedule. The two stay
//           SEPARATE settings: the switch answers "may this app remind me at
//           all", the schedule answers "when". Folding them into one would
//           mean a patient silencing reminders for a fortnight lost the times
//           they had chosen. The Tests tab's badge said the static word
//           "Scheduled"; it now prints the actual next reminder, because that
//           circle is where someone looks to ask when they are meant to do
//           this.
//           HOW IT FIRES. `SchedulableTriggerInputTypes.DAILY` — a repeating
//           trigger handed to the OS. Deliberately NOT a background task: a
//           patient who has not opened the app in a week would silently stop
//           being reminded, which is the one failure this feature cannot have.
//           The stored schedule is the truth and the OS is a projection of it,
//           re-applied on mount — which also fixes a bug that would otherwise
//           be invisible, since a notification's words are baked in when it is
//           scheduled and a patient switching to Hebrew would keep being
//           reminded in English.
//           The schedule SHAPE is in `@cyphix/shared` (`types/reminder.ts`):
//           it is a statement about a patient's care, not a handset setting —
//           it has to survive a new phone and be legible to the web. Times of
//           day, never instants, so flying does not move anyone's reminders.
//           Nothing in it recommends how often to measure; four a day is a UI
//           bound, not advice.
//           ⚠️ THIS RELEASE IS A NATIVE REBUILD, NOT AN OTA. `expo-notifications`
//           and `@react-native-community/datetimepicker` are native modules, so
//           `app.json`'s version moved to 0.34.0 WITH this file — the only
//           situation in which the two travel together (mobile CLAUDE.md
//           §5A.2). Every OTA after this one must be published while app.json
//           still reads 0.34.0, or it targets a runtime no installed build has
//           and reaches nobody, silently.

// v0.33.3 — The sheet ran FLUSH to the display, which was fine while its
//           corners were square and wrong the moment they were rounded: a
//           curve ending against the screen edge does not read as a corner, it
//           reads as the grid spilling off the screen. It now stops
//           `SHEET_MARGIN` (10 pt) short on each side — half the page's own
//           20 pt margin, so the sheet is still visibly wider than everything
//           around it while being a rectangle you can actually see the shape
//           of. "Almost the full width", which is what was asked for.

// v0.33.2 — The full-bleed ECG grid ended in hard 90° corners. Rounded now, at
//           the app's own radii (lg for the signature, md for the smaller
//           rejected-beats sheet — radius scales with the surface).
//           ⚠️ Done as an SVG `ClipPath`, NOT `overflow: 'hidden'` +
//           `borderRadius` on the wrapping View. Clipping a native SVG child
//           to a parent's rounded corners is one of the places iOS and Android
//           have historically disagreed, and a corner that is round on one and
//           square on the other passes typecheck, both bundles and doctor. The
//           radius converts points → millimetres through the sheet's own
//           scale, so the curve reads the same at any width, and each sheet
//           gets a `useId` clip id because Android resolves `url(#…)` per
//           document — two sheets sharing one would clip to whichever mounted
//           last. The lead label and the scale caption moved in to 20 pt so
//           they clear the arc instead of floating loose in it.

// v0.33.1 — • THE EDGES WERE BEING CUT, lead label included. Not a padding
//             mistake: a negative margin cannot escape a ScrollView, because
//             RN clips a scroller's children at its own frame — so making the
//             child wider than the scroller simply lost the overhang. The
//             SCREEN now bleeds (`PatientShell.bleedHorizontal` +
//             `shellPaddingH`), History applies the side padding per element,
//             and the ECG cancels it with a negative margin that finally has
//             room to go.
//           • "LATEST STUDY" IS GONE AS A SECTION. It repeated the timeline's
//             last bar — same date, same match figure — so the duplication was
//             the whole complaint. The chart is now a PICKER: tap any bar and
//             the detail under it changes, defaulting to the newest. The
//             deviation chips survived because they are the only place the
//             actual answer lives, and the beats that study left out moved in
//             beside them. Tapping a bar no longer navigates (the detail row
//             does), which also makes the older studies inspectable rather
//             than only openable.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.33.0 — Three reports, one cause: it was still drawn INSIDE things.
//           • THE BOX RESIZED. Height and gain were derived per lead from that
//             lead's own amplitude, so every lead drew a different rectangle
//             and dragging the builder resized it under the finger. Both are
//             now chosen ONCE from the tallest lead in the identity and handed
//             in — one gain, one channel height, every lead, which is what a
//             real 12-lead sheet does. A small lead now draws as a small trace
//             in the same box: true, and information. A lead scaled to fill its
//             own box is the picture that lies.
//           • THE WHITE RECTANGLES ARE GONE. White ECG paper, inside a white
//             card, on a grey page — three nested rectangles, which is how you
//             announce a picture pasted into a layout. Sections are now a
//             small-caps label, their content and a full-bleed hairline; the
//             trace is drawn on the app's own background with the grid as a
//             faint brand tint. The REPORT keeps its paper: that is a document
//             with real edges, this is an instrument panel on a screen.
//           • THE ECG GOT THE WIDTH. It runs edge to edge now — the bleed is
//             MEASURED (screen width − content width) rather than hard-coded,
//             so it cannot drift from the shell's padding on a device nobody
//             tests on. And the prose behind it was cut to one line per
//             section; what survived is what the screen cannot say without
//             words: what a difference IS, and the disclaimer.
//           Also: baseline figures are a plain row rather than bordered tiles
//           (five numbers, not five controls), and the compare toggle lost its
//           button chrome.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.32.0 — Insights reworked on device feedback. It looked, correctly, like a
//           landing page rather than an ECG system, and it was static.
//           WHAT WAS WRONG, IN THE ORDER IT WAS SAID:
//           • A green ESTABLISHED capsule beside a 24 pt headline. Green means
//             "pass"; a baseline existing is not a pass and this layer may not
//             grade anything. State is now a letterspaced small-caps line, the
//             register an instrument labels itself in. No status colour at all.
//           • "Confidence 48%" printed THROUGH the ring. A Text in a flex row
//             does not wrap — it overflows — and that column had no
//             `flexShrink`. Fixed, and the ring stopped being frozen at 5/5
//             forever: segments while enrolling (a countable target), a
//             continuous arc for agreement once established.
//           • Red. On a medical device red means alarm — act now — and a
//             distance from your own baseline is a measurement, not a verdict.
//             It made people tense before they had read what it referred to,
//             which is a colour interpreting on a layer forbidden to. New
//             `attention` amber token; `danger` stays for destructive actions.
//             The chips also gained a sentence saying what a difference IS: a
//             number nobody can interpret is worse than no number.
//           • A grey band under the content, over the dock. The shell reserved
//             the dock's footprint as padding, so the page ENDED above the bar
//             and the strip it floats over was bare — which also left the
//             frosted bar with nothing to refract. The clearance moved onto
//             the scroll views' content insets; the page now passes behind it.
//           WHAT IS NEW:
//           • A CALIPER on the signature. Tap or drag and a line follows the
//             finger, ticking once per small square, reading out time from R,
//             the baseline in mV and the width of your own range there — in
//             the chrome, never on the paper it would cover.
//           • A BUILDER: drag the track and the baseline assembles study by
//             study under your finger, one haptic tick each. It is the only
//             control that EXPLAINS the feature instead of describing it.
//             ⚠️ It was written claiming the band tightens as studies are
//             added. Measuring it said otherwise — 0.021 → 0.028 mV, then
//             flat. The corridor is a prediction interval, not a standard
//             error, so it converges on real variability rather than
//             shrinking. The honest story is better and is what ships: after
//             one study the narrow band is a single measurement dressed as a
//             range, and watching it fill out is the app learning how much
//             you vary.
//           • The REJECTED beats are kept (TEMPLATE_VERSION → 2) and drawn on
//             the accepted beat's own axes with why each went. "3 beats were
//             not used" asked for trust on the decision that most shapes the
//             result; now it is checkable.
//           Still an OTA: TypeScript only, app.json stays 0.30.0.

// v0.31.0 — History got a second tab, and with it the feature the app did not
//           have: a way to answer "has anything CHANGED?".
//           A list cannot answer that. It is a question about every study at
//           once, and a list is read one row at a time — so the forty rows hold
//           the answer and never show it.
//           ECG ID. Every eligible study is reduced to its REPRESENTATIVE BEAT
//           (the median of ~12 beats, ectopics rejected, cross-correlation
//           realigned before averaging), those are fused into one weighted
//           baseline, and every study is then scored against it. The clinical
//           point is the part a textbook range cannot give: a QRS of 104 ms is
//           unremarkable for a population and may be a 16 ms change for THIS
//           person. Doing it by hand — pull the old traces, lay them on top —
//           is how that is caught today; this just does it every time and keeps
//           the arithmetic afterwards.
//           The early studies weigh most, exactly as a fingerprint enrollment
//           does — and BECAUSE they do, an early study that disagrees with its
//           own cohort is flagged by name instead of absorbed.
//           ⚠️ TWO REAL DEFECTS were found by running the algorithm on
//           synthetic cohorts before shipping, and neither would have been
//           found by reading it:
//             • as a weighted MEAN, five consistent studies plus one bad one
//               ended with the FIVE excluded and the ONE as the baseline. An
//               estimator an outlier can pull cannot be used to find that
//               outlier. The provisional baseline is now a per-sample weighted
//               MEDIAN;
//             • the amplitude ratio fired `marked` on the small derived leads
//               (III, aVL) for ordinary session-to-session variation. It now
//               needs an absolute floor as well as a ratio.
//           This is an OTA: TypeScript only, no native module added, so
//           `app.json` stays at 0.30.0 (mobile CLAUDE.md §5A.2).
// v0.30.0 — The Tests tab stopped being a placeholder and became the web's test
//           PICKER. One circle owns the screen instead of the web's 3-up grid,
//           because the photograph is the interface here and a thumbnail is not
//           a photograph. Two tests, at the user's instruction: 6 limb leads or
//           the full 12.
//           ⚠️ THIS RELEASE IS A NATIVE REBUILD, NOT AN OTA. `expo-video` was
//           added for the explainer clips, and `app.json`'s version was bumped
//           to 0.30.0 WITH this file — which is the ONLY situation in which the
//           two move together (mobile CLAUDE.md §5A.2). Every OTA after this one
//           must be published while app.json still reads 0.30.0, or it targets a
//           runtime no installed build has and reaches nobody, silently.
// v0.29.0 — The app was online-first: every screen waited for the network to
//           re-send data the phone had already been given, and in a lift or a
//           basement it had nothing to show at all. An ECG recording is
//           IMMUTABLE — the trace measured last Tuesday is the same trace
//           forever — so re-downloading it was pure waste, every cold start,
//           for the life of the device.
//           Inverted. The phone now keeps its own durable copy and renders
//           from it at once; the network's only job is to answer "what
//           changed?". Two mechanisms, chosen per resource and both defined in
//           `@cyphix/shared` `api/sync.ts` so the server and every client
//           agree on what "unchanged" means: a CURSOR DELTA for recordings
//           (changed rows + tombstones, usually an empty answer), and
//           ETag → 304 for the medical card and the portrait (the portrait is
//           the largest thing the app downloads; a revalidation is now ~200
//           bytes and the server does not even decrypt it).
//           The split that makes it safe: `offlineBaseQuery` READS from the
//           device and never judges freshness; `syncEngine` REFRESHES on
//           sign-in, on foreground and on pull-to-refresh, writes to disk
//           FIRST and only then invalidates the RTK tag — so the refetch it
//           causes reads the new state instead of racing it. No polling, no
//           timers: a phone in a pocket has nothing to learn.
//           Heavy payloads (waveforms, portrait) are FILES under the documents
//           directory; metadata and cursors are AsyncStorage. Deliberately no
//           `expo-sqlite`: a native module cannot reach an installed build
//           over the air (root §5, and the v0.27.x channel trap), and this had
//           to be an OTA. The API is written so SQLite can replace it the day
//           History needs real queries.
//           ★ One account per device's cache. `claimCacheFor` runs inside the
//           boot splash, BEFORE the app can render, and wipes documents,
//           mirror and cursors together if the signed-in account changed —
//           a shared phone must not show one patient a single frame of
//           another's record. Signing out keeps the cache: same person, same
//           device, and the tokens (what actually grants access) are cleared
//           regardless.
//           Writes are unchanged: they still go to the server and still fail
//           when it cannot be reached. There is no offline write queue — see
//           PARITY.md, where it is a tracked row rather than a silence.

// v0.28.0 — "Preview as role" ported from the web's Settings page, which had
//           been listed as NOT ported because there was no real role to switch
//           away from until connected mode landed a real principal.
//           `auth.debugRole` is applied in ONE place — `useCurrentUser`, where
//           the principal is resolved — so every `can()` and every gate in the
//           app follows it without knowing it exists.
//           ★ It grants NOTHING, and the row says so on screen. The server
//           authorises against the session's REAL role, so previewing `admin`
//           on a patient account draws the admin affordances and each request
//           behind them returns 403. That is the honest demonstration and the
//           reason this is safe to ship rather than hide behind a build flag.
//           Two deliberate limits: `id` and `linkedPatientId` are never
//           swapped — doing so would make the app read and write a DIFFERENT
//           PATIENT'S record, which is not a preview but a data-integrity bug —
//           and the override is cleared on sign-out, so a preview cannot
//           outlive the account it was chosen on and silently apply to whoever
//           signs in next. `guest` is not offered: it is the signed-out
//           principal, and previewing it from a screen that only exists behind
//           sign-in would draw a shell with no way out. Tapping the active
//           role clears the override, so there is always a way back without
//           knowing which role was real — and while a preview is on, the
//           actual role is printed beneath the picker.

// v0.27.4 — Sign-in kept failing with credentials that work in the browser,
//           because the phone was still offline: the OTA carrying the API URL
//           never arrived. `eas update --auto` derives the branch from the
//           GIT BRANCH (`master`), and a new branch auto-links to a channel of
//           the SAME NAME — but the installed build was made with the
//           `production` profile and listens on channel `production`. So the
//           update published successfully to a channel nothing subscribes to.
//           No error, no delivery. `--auto` is only correct when branch names
//           already match channel names; here the branch must be named
//           explicitly (`--branch production`), and CLAUDE.md §5A.1 said
//           `--auto` — that was wrong and is corrected.
//           This bump exists to be VISIBLE: with the badge unchanged there was
//           no way to tell a failed delivery from a delivered-but-broken app,
//           which is exactly the confusion that cost this round. Version.ts is
//           bumped, app.json's version deliberately is NOT (§5A.2 — that would
//           change runtimeVersion and orphan the update all over again).

// v0.27.0 — The route to a REAL BLE signal on an iPhone, rebuilt around the
//           fact that the borrowed MacBook is Intel on a macOS too old for
//           Xcode 16.1 (SDK 54 / RN 0.81), which Apple gives no way around.
//           A paid Apple Developer account was bought instead, and that turns
//           §9.3's escape hatch into the main road: `eas.json` (new) has EAS
//           compile modules/cyphix-ble on Expo's macOS runners, driven from
//           Windows. ★ The asked question was "how do we do this with Expo
//           Go" — and the answer is that it CANNOT: Expo Go is a prebuilt App
//           Store binary containing only Expo's own native modules, so
//           `requireOptionalNativeModule('CyphixBle')` is null there by
//           construction and bleClient falls back to the simulator forever.
//           That is why only a demo signal was ever seen; nothing in the ECG
//           path was broken. The paid tier specifically buys the SIGNING
//           credentials — EAS builds for free accounts too, but installing on
//           a physical iPhone needs ad-hoc or App Store provisioning that
//           Apple issues only to Program members.
//           Three profiles: `production` → TestFlight (valid a YEAR, not the
//           free tier's 7 days), `preview` → straight to the phone by QR for
//           fast hardware iteration, `development` → dev client + Metro.
//           `appVersionSource: remote` + `autoIncrement` because TestFlight
//           refuses a build number it has already seen, and learning that
//           after a 20-minute cloud build is an expensive way to learn it.
//           app.json `version` was still the 0.1.0 scaffold — it is the
//           string App Store Connect shows, so it now tracks this file.

// v0.26.0 — Reported from the phone: the sign-in photograph and the START TEST
//           guide pictures arrive seconds late, "and they should be part of
//           the build". They ARE part of the build — but only in Release. In
//           Expo Go and in a Debug dev build a `require`d asset is not in the
//           app at all: `resolveAssetSource` returns an http URL on the dev
//           machine and RN fetches it over Wi-Fi the first time the <Image>
//           renders, queued behind Metro serving a 5.7 MB JS bundle. v0.22.0
//           warmed the welcome photograph inside the splash and stopped there,
//           because that was the one that had been reported — so the three
//           measurement guides were still first requested at the exact tap
//           that shows them. There is now ONE registry of every bundled
//           photograph (services/media/imagePreload.ts), warmed together, and
//           started at App.tsx MODULE scope rather than from an effect:
//           AuthGate mounts behind PreferencesGate's storage read, so by the
//           time it ran, part of the 1.7 s of splash the fetches are meant to
//           hide inside was already spent. Each image is prefetched
//           independently — a single try/catch around a sequence of awaits
//           would let one rejection abandon every image after it. No new
//           dependency and no change to any screen's rendering.

// v0.25.3 — Reported from the phone: on Profile, the camera badge on the
//           portrait is cut off by the circle of the picture itself, and it
//           should be ABOVE it. It was, exactly, and the cause is one style
//           doing two jobs: `styles.avatar` carried `borderRadius: 34` +
//           `overflow: 'hidden'` — which it needs, or Android draws a square
//           photo inside a round border — AND it was the Pressable the badge
//           lived inside. A round mask crops every child, and the badge is a
//           child at the corner of the square, which is precisely the region
//           the circle excludes. The comment above it even said so, and
//           "positioned inside the circle's edge" was the workaround, not a
//           fix: the badge was pulled in until only its own corner was lost.
//           The mask is now its own inner view and the badge is its SIBLING,
//           so it is painted after the circle and rides on top of it whole.
//           The Pressable stays 68×68 and no longer clips — deliberately the
//           same size, so the badge still lands inside its parent's bounds:
//           a child drawn outside its parent is not reliably rendered on
//           Android, and the square's corner is outside the circle but inside
//           the square. Nothing about the tap target, the RTL side or the
//           busy indicator changed.

// v0.25.2 — Corrects v0.25.1, which overreached. Asked to remove the moment
//           the corner leaned out at the upper left, it ALSO pulled every
//           radius toward 50 % — and that traded away one of the best shapes
//           in the set to fix a moment. "You gave up one of the nicest shapes;
//           I only asked to get rid of the start."
//           The `excursion` knob is gone from `blobShape.ts` and the keyframes
//           are the CSS's again, whole and untamed. The 75 % frame's tight
//           top-left corner is BACK, deliberately.
//           What stays is the half of v0.25.1 that was the actual bug: the
//           morph clock free-ran from mount while the idle blob was the 0 %
//           frame held still, so connecting JUMPED the outline to wherever the
//           clock had drifted — landing straight on that corner if the timing
//           fell that way. The clock now starts with the connect, at zero, so
//           the cycle is walked in order and the eye is LED into that corner
//           six seconds later instead of being dropped on it.
//           The lesson, written down because it is easy to repeat: an
//           extreme that is arrived at wrongly is a timing bug. Sanding the
//           extreme down makes the symptom go away and takes the design with
//           it.

// v0.25.1 — "Right at the start, the vertex at the upper left goes out of
//           proportion." Measured, and it is exactly there: sampling the
//           outline across the whole 8 s cycle, the single worst point is the
//           TOP-LEFT corner at the 75 % keyframe — 7.6 px OUTSIDE a circle of
//           the same box, while the top-right corner of that same frame is
//           7.8 px INSIDE it. A 15.3 px swing across the top of a 150 px blob
//           is the top visibly ceasing to be round. It is the only keyframe
//           whose corner is small in BOTH axes (35 % × 42 %).
//           TWO causes, both fixed:
//           1. The morph clock FREE-RAN from mount while the idle blob was
//              the 0 % frame held still. So at the instant of connect the
//              outline jumped from the rest shape to wherever the clock had
//              drifted — and if that was near 75 %, the corner arrived out of
//              nowhere already at its tightest. The clock now starts WITH the
//              connect, at zero, so the morph begins at the shape on screen.
//           2. `blobPathAt` takes an `excursion`: every radius is pulled
//              toward 50 % by it. Safe per radius because each opposite pair
//              in every keyframe sums to exactly 100 — which is what keeps a
//              border-radius shape free of straight edges — so scaling a
//              complementary pair by the same factor keeps the sum at 100.
//              At 0.5 the worst deviation drops to 3.7 px out / 3.9 px in:
//              always almost a circle, never a perfect one.
//           The excursion is REACHED over the 1.2 s fill rather than applied
//           flat, so the idle shape stays the exact CSS one and the blob
//           rounds out as it becomes a button.

// v0.25.0 — "It isn't that pretty, and it isn't clear it's a button to press."
//           Both halves of that are the same defect. The connected orb was a
//           NAVY SHAPE WITH A CAPTION UNDER IT, and a caption under a picture
//           is a caption: the composition named the action somewhere the eye
//           does not go looking for a control, and put decoration — the white
//           morphing core, read as a heart — where the action should be.
//           So the middle now carries the action:
//           • the white morphing core is GONE. The grey idle core it grew out
//             of now expands ~55 % as it dissolves, so the dot reads as
//             opening INTO the label rather than being swapped for it.
//           • a play glyph + the button's own words sit inside the blob, in
//             white on the brand navy, arriving at 45 % of the 1.2 s fill —
//             colour first, words second, because two things changing at once
//             read as one blurry event.
//           • the blob casts a real navy drop shadow. A shape printed flat on
//             the page is an illustration; a shape ABOVE the page is a button,
//             and that is the oldest signal there is. Cast in navy, not black:
//             a grey shadow under a navy shape reads as dirt.
//           • the caption below COLLAPSES as the words move inside, so the
//             action is never named twice — animated, so nothing snaps.
//           The DISCONNECTED state is deliberately untouched at the user's
//           instruction: same grey blob, same white disc, same core, same
//           caption. The connect transition is now the whole change.
//           ⚠️ The Skia canvas is deliberately BIGGER than the orb
//           (BOX = ORB + 2·PAD): a drop shadow is drawn into the canvas's own
//           pixels, so a canvas cut to the blob's size clips it away. The orb
//           box carries `marginVertical: -PAD` so the extra pixels cost the
//           layout nothing and every gap around it is what it was.

// v0.24.3 — "WHY CAN'T IT BE SLID BETWEEN ALL THE ICONS?" — and the answer is
//           that it never could be slid at all. The confirmed diagnosis, from
//           Settings › About reading `Apple Liquid Glass (iOS 26+)`: the
//           material is live and real, so what was left was the gesture.
//           v0.24.0 moved the highlight on TOUCH-DOWN, and a `Pressable` owns
//           its touch from the moment it starts and NEVER re-targets — that is
//           what a press is. So the only tab a finger could ever reach was the
//           one it landed on; sliding towards a neighbour did nothing, and the
//           one tab that appeared to work was simply the one being tapped.
//           Re-targeting has to be decided by something that can see all five
//           tabs, so it is now ONE Pan gesture on the bar: slide and the pill
//           follows continuously through every tab, with a selection tick as
//           it passes each one (`selectionAsync` — the picker-wheel event, not
//           an impact, because this is scrubbing), staying swollen the whole
//           time so the thing under the finger is visibly the thing being
//           moved. Release commits wherever it ended.
//           Taps are untouched: the pan needs 6 pt of travel first, so below
//           that the `Pressable` still owns the touch and behaves exactly as
//           before — which also keeps every tab a real accessibility button.
//           `runOnJS(true)` on purpose: every effect of this gesture is a
//           React state update or a haptic, both JS-thread things anyway, and
//           running the callbacks there makes ordering against the pressable's
//           cancellation deterministic instead of a race. It costs nothing per
//           frame because updates are filtered to actual index changes — at
//           most four setStates across a full sweep.
//           This closes the "**Not ported:** the drag-the-pill gesture" note
//           that has been sitting in PARITY's dock row since v0.2.

// v0.24.2 — From a suggested "custom tab bar button with a spring" pattern.
//           Most of it this dock already had and has had for releases — it is
//           wired with `tabBar={}` (RootNavigator:96), which replaces the WHOLE
//           bar, so `tabBarButton` is never consulted by React Navigation at
//           all; `DockItem` IS the custom button, and the spring, the growing
//           backdrop and the haptics are all in. But one thing in it was real
//           and missing: **selection had no moment of its own.** The pill slid
//           and the icon filled — both STATES, not events — so committing a tab
//           felt like the bar catching up rather than like the tap doing
//           something. The tab that lands now pops its icon and label: timing
//           up (110 ms, identical every time), spring back (the only part that
//           should feel physical). Not on first paint — an app that pops its
//           tab bar while opening is announcing something nobody did.
//           ★ On the CONTENT, not on the pill, and that is arithmetic not
//           taste: the pill's scale already carries the press swell, and a hold
//           released on the OUTERMOST tab would put 1.13 and 1.10 on one
//           transform — wide enough to be cut by the bar's rounded cap. Content
//           pops inside its own item box, where nothing can clip it.
//           NOT taken from the suggestion: a per-tab translucent halo at 20 %
//           white. That is exactly the bug v0.24.1 was spent on — a highlight
//           defined relative to the material under it disappears the moment the
//           material changes. And not a persistent 1.15 scale on the selected
//           tab: at 68.9 pt of item width a permanently enlarged label is a
//           truncated label in every language, and Hebrew truncates first.

// v0.24.1 — v0.24.0 ERASED THE CURRENT-TAB INDICATOR, and the cause is worth
//           more than the fix. The pill was a TRANSLUCENT white (0.85 / 0.16).
//           It was never visible in its own right — it was visible *because it
//           was brighter than the bar*. So when the same release made the bar
//           glassier (tint 55 % → 32 %, rim removed) to look more like the
//           system's, the pill lost the only thing it was contrasting against
//           and the dock stopped showing which tab you were on. The dock's own
//           dressing destroyed the one thing it exists to show, and every
//           check available on this machine passed while it did.
//           The pill is now a SOLID colour, and it is THE SAME CONSTANT the
//           active icon's inner details are cut out in. Those two were always
//           required to match — the cut-outs sit directly on the pill — and
//           while they were merely similar they drifted with every change to
//           the bar. Now they cannot. Plus its own hairline and small shadow,
//           so it reads as a puck ON the bar rather than a lighter patch OF
//           it, which is what a system segmented control does.
//           ★ `isInteractive` IS OFF THE BAR. Reported as "no glass effect
//           like iOS has to offer". It was the one prop flagged as
//           unverifiable from Windows, and it was applied against its grain:
//           Apple's interactive glass is for a button-sized control inside a
//           glass container, not for a whole bar. The hold-and-swell is
//           Reanimated and never depended on it, so nothing was lost.
//           The rim is back too — softer on the glass path. A floating object
//           with no edge stops reading as an object over a pale backdrop.
//           ⚠️ TWO CAUSES OF "IT DOESN'T LOOK LIKE GLASS" ARE NOT IN THE DOCK.
//           (1) The phone may have no Liquid Glass at all: it needs iOS 26+
//           AND `expo-glass-effect` inside the running client. Settings ›
//           About now NAMES the material that resolved, because from a
//           Windows machine that question is otherwise unanswerable and
//           guessing at it costs a release each time.
//           (2) A material needs something BEHIND it. Apple Music's bar looks
//           like glass because artwork and lists scroll under it; this dock
//           floats over a soft flat backdrop, and glass with nothing to
//           refract renders as a plain translucent plate however it is tuned.
//           Same lesson as the blur inside a `Modal` (v0.18.0).

// v0.24.0 — THE BOTTOM DOCK STOPS BEING A PICTURE OF GLASS. It was already
//           Apple's Liquid Glass on iOS 26 and still did not feel like the
//           system's tab bar, and the reason is that glass on iOS is not a
//           LOOK — it is a material that answers your finger. Three things
//           were missing; all three are in.
//           (1) THE MATERIAL RESPONDS. `GlassSurface` gains an opt-in
//           `interactive`, which is Apple's own `UIGlassEffect.isInteractive`:
//           the glass brightens and its specular highlight tracks the touch.
//           Opt-in on purpose — a sheet you only READ that lights up because
//           a finger crossed it is noise. The dock is the one surface in the
//           app that IS the control, so it is the one caller.
//           (2) THE HIGHLIGHT FOLLOWS THE FINGER. Touch any tab and the pill
//           travels there at once; release commits, slide off and it springs
//           home. The lit icon now follows the PILL rather than the navigator
//           — which is not cosmetic: the filled icon's inner details are cut
//           out in the PILL's colour, so an icon left lit after the pill has
//           moved away would have its cut-outs sitting on glass. Screen
//           readers still hear the navigator's truth, not the preview.
//           (3) HOLD AND THE GLASS GROWS — the thing that was actually asked
//           for. Touch swells the pill 5 %, holding past 220 ms swells it 13 %
//           with a heavier haptic and grows the icon and label with it.
//           220 ms, not `delayLongPress`'s 500: that default is a threshold
//           for long-press MENUS and is far too slow to read as the surface
//           reacting to being held. And the swell is Reanimated, so ANDROID
//           GETS THE GESTURE even though only iOS 26 gets the material — the
//           material may differ per platform, the interaction may not.
//           ★ The pill is deliberately NOT a `GlassView` itself.
//           `UIGlassContainerEffect` MERGES nearby glass into one shape — that
//           is what the container is for — so glass-on-glass would dissolve
//           the pill into the bar and the selection indicator would stop
//           existing. Apple's own tab bar is one glass bar with a solid-ish
//           capsule riding on it, which is exactly what this is.
//           On iOS the bar also drops the hand-drawn 1 px rim (the material
//           lights its own edge; a second one is the tell that it is fake) and
//           takes a 32 % tint instead of the web's milky 55 % plate. The
//           border WIDTH stays, so `dockMetrics.DOCK_BAR_HEIGHT` is still
//           honest. Android keeps the web's values — an untinted BlurView over
//           a light page really is invisible (the v0.19.2 trap).
//           🔬 Unverified on a handset: the swell geometry is arithmetic
//           against the bar's `overflow: hidden` (60.0 pt inside a 65.1 pt
//           inner box), and `isInteractive` on a whole BAR rather than on a
//           button is the one judgement call here — if the entire bar bulges
//           instead of the tab, it is one prop to remove.

// v0.23.0 — The release that makes the REAL signal reachable on an iPhone,
//           plus the two gaps found while checking that it could be.
//           ★ Nothing was wrong with the ECG pipeline. The reason only a demo
//           signal was ever seen is that Expo Go contains no `cyphix-ble`, so
//           `requireOptionalNativeModule` returns null and `bleClient` falls
//           back to the simulator — exactly as designed. Reaching the hardware
//           needs a development build, which needs Xcode, which needs a Mac.
//           `IPHONE_SETUP.md` is that path written out end to end, for an
//           Intel MacBook and a FREE Apple ID, with the macOS 14.5 / Xcode
//           16.1 compatibility gate first — it is the one check that can cost
//           an evening, and it cannot be worked around.
//           (1) A STALENESS WATCHDOG. A BLE link stays "connected" while
//           delivering nothing: the phone locks, the app backgrounds, the
//           device slips. The last waveform just sits there, and a screen that
//           keeps calling it live is showing a frozen trace as a patient's
//           heart. After STREAM_STALE_MS (600 ms — six missed flushes of the
//           frozen 10 Hz cadence, so it is derived, not chosen by feel)
//           `isStreaming` goes false. AppState marks it on the way OUT to the
//           background, because a suspended app's timers do not run to notice
//           later, and only a real arriving batch clears it — saying "live
//           again" before a sample has landed is the same lie. An in-flight
//           capture is DISCARDED rather than run out against silence: ten
//           seconds of wall clock is not ten seconds of ECG, and a strip
//           padded with silence reads as asystole.
//           (2) ANDROID BLE PERMISSIONS WERE NEVER REQUESTED. The Kotlin
//           module is `@SuppressLint("MissingPermission")` and documents that
//           the UI must have asked already. Nothing asked. A manifest entry is
//           not a grant, and an unpermitted `startScan` returns no results and
//           throws no error — indistinguishable from "the device isn't here".
//           PARITY had Android as ✅; that was wrong and is corrected.
//           (3) The icon was still Expo's blue placeholder. It is now the
//           CYPHIX mark on white, rasterised by `scripts/make-icons.js` from
//           `BrandLogo`'s OWN path data — a hand-traced lookalike drifts from
//           the logo the first time either is touched.


// v0.22.0 — Two things. (1) The portrait can now be SET from the phone: the
//           avatar is a button with a camera badge — a tappable circle with
//           no affordance is a circle nobody taps — opening take / choose /
//           remove, saved to the RECORD so it shows in the browser too. The
//           sign-up wizard's photo is uploaded as well, best-effort, because
//           a failed picture must never be reported as a failed sign-up.
//           `expo-image-manipulator` is the one new dependency: the server
//           caps the data-URL at 1.5 M chars and a 12 MP square crop is
//           several times that, so it is resized to 512 px before encoding.
//           The picker's `quality` could not do it — it lowers JPEG quality,
//           never the pixel count.
//           (2) "The screen is blue and only then the picture comes up" —
//           not the file, the TIMING: nothing fetched the welcome photo
//           until that screen mounted, and in Expo Go a required asset is
//           pulled from Metro over Wi-Fi on first use. It is now warmed
//           during the splash the app already holds, and fades in over the
//           navy if it is still not ready.

// v0.21.0 — Sign-in was connected; the Profile tab was not. It read the
//           hard-coded fictitious DEMO_CARD, so a signed-in patient was
//           looking at "Test Patient Alpha". Now `usePatientCard` fetches
//           GET /patients/:id/card for the account's OWN linkedPatientId,
//           plus the portrait from /photo — which is why a picture set in
//           the browser now appears on the phone (the avatar had never
//           rendered a photo at all before, in any mode).
//           ★ A real account whose card fails does NOT fall back to the
//           demo record: printing a fictitious blood type and medication
//           list under a real person's name is the worst failure this
//           screen has. It shows a name-only card, says the record could
//           not be loaded — empty sections otherwise read as "you have no
//           conditions and no allergies" — and offers pull-to-refresh.
//           Still missing and named in PARITY: no way to SET the portrait
//           from the phone, and a clinician has no active patient yet.

// v0.20.1 — "CONNECTION ISSUE" on sign-in, and it was configuration, not code.
//           v0.20.0 pointed the app at the dev server on the laptop
//           (http://10.0.0.19:8080), which has to be running and on the same
//           Wi-Fi — and was not. The app was right: the fetch never landed,
//           so it said `network`. Now pointed at the deployed API,
//           https://cyphix-api.onrender.com, verified to be the SAME database
//           (the demo patient returns an identical user id and
//           linkedPatientId from both) and to pass the full client sequence.
//           ⚠️ EXPO_PUBLIC_* is inlined at BUNDLE time: changing .env needs
//           `npm start` restarted, not just the app reloaded.

// v0.20.0 — The app stopped having accounts of its own. With
//           EXPO_PUBLIC_API_BASE_URL set, sign-in goes to CYPHIX_SERVER — the
//           same Postgres the web app uses — so one person is one account
//           everywhere. `HttpAuthService` + a real `tokenStore` (rotating
//           refresh token in the enclave, single-flight exchange, because the
//           server kills a token family on replay) sit behind the same
//           `authService` object every onboarding step already talked to.
//           `useCurrentUser` now answers with the REAL principal when
//           connected: the server enforces RBAC and row scoping, so a client
//           claiming clinician while the server says patient only draws
//           buttons that come back 403. Offline: unchanged, demo clinician.
//           Contract verified end-to-end against the live server + DB; the
//           screens are unverified on a handset (PARITY 🔬).

// v0.19.5 — "זה לא ממורכז בכלל" was not an impression, it was arithmetic.
//           `BrandLogo`'s inherited viewBox is padded ASYMMETRICALLY: the ink
//           runs 41.34 → 181.45 inside a box declared 34 → 209, so 7.3 units
//           of air on the left against 27.6 on the right. Centre that box and
//           the artwork lands ~18 pt left of the screen's middle, and fills
//           only 80 % of the width it claims. Every other caller anchors the
//           logo to a corner, which is why it never showed before.
//           `crop` (new, opt-in, default byte-identical) draws the ink's own
//           measured box. The splash uses it and goes to 90 % of the window
//           capped at 520: 351 pt of real lockup on a standard iPhone against
//           256 pt in v0.19.4 — centred this time.

// v0.19.4 — v0.19.3 is REVERTED at the user's word: the splash is the navy
//           screen with the FULL `BrandLogo` (mark + CYPHIX + "MEDICAL")
//           again. Only the part that was actually asked for survives — the
//           size. It is 82 % of the window's width capped at 460, so ~320 pt
//           on a standard iPhone instead of the flat 210 pt that read as
//           small; a fixed point size is a guess that is right on exactly
//           one screen.
//           `CyphixLogo` is DELETED rather than left unused: three lockups
//           with only two callers is how the wrong one gets picked later.
//           It is one `git show 542a650` away if it is ever wanted.

// v0.19.3 — (superseded by 0.19.4) The splash became the mark + CYPHIX
//           lockup on WHITE. The white screen and the mark-only lockup were
//           not what the user wanted; the sizing fix from this version is
//           what carried forward.

// v0.19.2 — Two from an iPhone next to a Galaxy.
//           THE SIGN-OUT DIALOG HAD NO BACKGROUND ON iOS AND A PROPER PANEL
//           ON ANDROID, from ONE line in `GlassSurface`: the tint was passed
//           only to the BlurView branch, on the reasoning that Liquid Glass
//           "tints itself". It does not — `glassEffectStyle="regular"` with no
//           `tintColor` over a light page is very nearly CLEAR, so on iOS 26
//           the panel was really there and really invisible. The tint now
//           reaches both materials, which fixes every sheet, the dock and the
//           report bar at once — none of which had been looked at on an iPhone
//           yet. The same call now passes `colorScheme` too, so the glass
//           follows the patient's theme choice instead of the phone's.
//           ConfirmDialog is SOLID regardless: a material is for a surface you
//           look past, and this is the one surface you must look at, right
//           before something irreversible.
//           And: a typed name capitalises itself ("elio" → "Elio").
//           `autoCapitalize` only suggests a shift state to the keyboard; the
//           VALUE is normalised now. It never lower-cases, so "McDonald"
//           survives, and it splits on spaces and hyphens but not apostrophes.

// v0.19.1 — Four corrections from the first look at v0.19.0, all of them the
//           kind only a person can see.
//           1. SIGN OUT IS ON PROFILE, at the bottom, under Settings — where
//              every app a patient already uses puts it. It was in Settings
//              only, which is one screen further than anybody looks.
//           2. The welcome hero carries the TEXT-ONLY wordmark ("CYPHIX",
//              no mark, no "MEDICAL"), as the reference does: a second line
//              of type directly over a headline argues with it.
//              `CyphixWordmark` is the brand file's own path, cropped to the
//              glyphs — the A4 page it was drawn on would have rendered the
//              word as a speck.
//           3. THE PULSING ECG MARK ON THE SPLASH IS GONE. It came from the
//              reference and it is not the CYPHIX identity — a thing that
//              behaves like a logo but is not one is worse than no thing.
//              The wordmark carries the splash alone now.
//           4. The navy panel behind "Clinical-grade ECG, recorded at home"
//              is a PHOTOGRAPH of the device being used. A navy gradient
//              scrim sits between the picture and the type, clear at the top
//              and opaque at the bottom, so white text is always on navy
//              whatever the image does underneath.

// v0.19.0 — THE APP HAS A FRONT DOOR. Everything before the tabs, taken from
//           the "CYPHIX Onboarding" design reference and converted to React
//           Native: a navy splash whose ECG mark draws itself, a welcome hero,
//           sign-in (with Face ID / fingerprint where the device really has
//           one), password reset, and a registration wizard — credentials with
//           a live strength meter, phone and a six-digit code on an in-page
//           pad, then six health steps (sex, height, weight, blood type,
//           emergency contact, photo), a review screen that names what was
//           skipped, and "Profile created".
//           The reference's animations are PORTED, not approximated: `scrIn`
//           (16 px + fade, 320 ms, cubic-bezier(.22,.7,.3,1)) on every step,
//           `fadeUp` with its `both` fill mode staggering the splash,
//           `pulseRing` on two offset rings, and `sweep` drawing the trace by
//           animating strokeDashoffset — all on the UI thread.
//           What is deliberately NOT from the reference: the font (mobile
//           ships the system font per root CLAUDE.md §3.1, so the mono labels
//           keep their treatment and their tabular digits but not IBM Plex
//           Mono), and the emergency step, which types the number instead of
//           picking from the address book — a mis-tap in a list of real people
//           writes a real person into a medical record.
//           Registration is device-local for now: `authService` is the same
//           swap point the web has, accounts are held with SHA-256 digests and
//           the session token goes to the Keychain / Keystore. Sign out is live
//           in Settings — and is the only way back to the flow once it is done.

// v0.18.2 — The judder was never the animation, and v0.18.1 shortening it was
//           me guessing. ONE LINE caused it: `palette` was rebuilt inline on
//           every render of StudyViewerScreen, and it is a prop of six
//           `memo`-wrapped EcgReviewStrips — so the memo never held once, and
//           every re-render (opening a sheet, nudging a caliper, one frame of a
//           drag) re-ran `buildEcgPath` over four tiles × six leads, twice over
//           with a ghost. Memoised, the strips now skip entirely.
//           Dragging the ghost was worse still: it also re-entered
//           `useOverlayRecording`, which allocated six shifted Float32Arrays and
//           in warp mode re-ran `alignByFiducials` on all six leads — PER TOUCH
//           EVENT. A manual nudge is a pure translation, so it is now a `<G>`
//           transform at draw time and the signals are never re-derived.
//           And: leaving a comparison now leaves ghost mode with it. It did not,
//           so the "drag to move the grey trace" capsule stayed on screen with
//           nothing to drag — and the invisible full-sheet drag surface under it
//           stayed too, swallowing every touch.

// v0.18.1 — Two from the device, and one of them is me over-correcting.
//           SPEED: the scrim was a second full-screen blur under the panel's
//           own, and its opacity was ANIMATED — which makes a
//           UIVisualEffectView re-compute the whole effect every frame, and on
//           Android stacks two experimental dimezisBlurViews. That is what
//           "slow, and it flickers a bit" was. The scrim is now a plain
//           animated colour and the panel keeps the material, which is also
//           what the platform's own sheets do. Timings 260/170 → 210/140.
//           MOVING THE GHOST: the arrow pad is gone; the paper is draggable
//           everywhere again, with the labelled handle kept over it. Lining two
//           heartbeats up is judged continuously by eye, and 40 ms steps in a
//           list you have to look away at cannot close that loop. The drag was
//           never the problem — its invisibility was, and the handle fixes that
//           without taking the gesture away. The offset now reads out on screen
//           while dragging, so the sheet never has to be reopened for a number.

// v0.18.0 — Three from the device, two of them one root cause. React Native's
//           `Modal` is a SEPARATE WINDOW, and that fact caused both remaining
//           sheet complaints: (a) `UIVisualEffectView` and Android's
//           dimezisBlurView can only sample their own window, which inside a
//           Modal is empty — so every "glass" sheet shipped in v0.17.0 was, on
//           the device, exactly the grey rectangle it was written to replace;
//           (b) Modal defaults to portrait-only, so raising one while full
//           screen is landscape makes UIKit throw
//           UIApplicationInvalidInterfaceOrientation and the process DIES —
//           that is the MARKERS crash. Overlays are now rendered IN TREE
//           (`OverlayLayer`), where the page is really behind them.
//           Separately, comparison stops being three rows in the middle of the
//           filters sheet: it is its own toolbar tool and its own sheet, which
//           opens by saying what the grey trace IS and offers BUTTONS to move
//           it — one small square per tap — instead of only a drag nobody
//           could discover.

// v0.17.0 — Seven more from the device. The one that was a real bug: a
//           PanResponder rebuilt mid-gesture forgets its running totals, so a
//           dragged reference line ran away from the finger and then DELETED
//           itself on release (zero travel reads as a tap). Responders are now
//           built once and read live state through a ref. Also: every sheet
//           and dialog is a blurred glass material instead of a flat grey
//           rectangle; full screen insets the safe area (the Dynamic Island was
//           cutting the start of every trace in landscape), keeps its bar in
//           flow instead of over the paper, and carries a labelled way out; the
//           point being annotated is drawn on the trace while its sheet is
//           open; and the comparison status line is now the way in to moving
//           the ghost, which itself has a visible handle.

// v0.16.0 — Six things the device found that no compiler could. The big one:
//           NOTHING on the sheet was actually draggable, because a handle that
//           claims the gesture on MOVE loses to a ScrollView that has already
//           started panning — so grabbing a caliper scrolled the paper under
//           it. Every handle now claims on touch-down and freezes both scrolls
//           while held. Plus: the trace gets the screen back (icon toolbar,
//           one-line headline, words moved into a ⋯ sheet), a LANDSCAPE full
//           screen fitted to all six leads, the caliper readout out of the
//           trace's way, reference lines grabbable along their length, and R
//           peaks on every lead instead of only II.

// v0.15.0 — The History tab becomes the module it is on the web. Captures file
//           themselves into an on-device store the moment an exam ends; the tab
//           lists them from a cached summary; opening one gives a tiled vector
//           sheet at the frozen 25 mm/s · 10 mm/mV with the whole web toolbox
//           re-thought for a finger: draggable calipers, tap-to-mark, reference
//           lines, a ghost trace with three alignments, filter stages, and
//           export by share sheet (CSV, EDF+, a built PDF). Every tool is behind
//           the same RBAC permission the web checks, and every read, write,
//           export and delete is audit-logged.

// v0.14.0 — The floating CYPHIX wordmark in the top-start corner is behind
//           `SHOW_SHELL_WORDMARK` and currently off, at the user's request.
//           Hidden, not deleted — and the 70pt of padding that existed only
//           to clear it follows the same switch, so nothing reserves space
//           for something that is not drawn.

// v0.13.0 — The app gets an i18n layer mirroring the web's: a language
//           registry, en/he locale tables typed against each other, a provider
//           backed by the pre-hydrated preferences slice (so the first paint is
//           already in the right language), and a Language picker at the top of
//           Settings → Appearance. Every user-facing string now comes from the
//           locale; adding a third language is one new file plus three lines.
