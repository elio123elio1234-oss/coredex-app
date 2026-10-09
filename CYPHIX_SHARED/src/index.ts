/* @cyphix/shared — platform-neutral core (root CLAUDE.md §2.1).
   Pure TypeScript only: no React, no DOM, no React Native imports. */

export * from './types/ecg';
export * from './types/scan';
export * from './types/ecgAnalysis';
export * from './types/recording';
export * from './ble/protocol';
export * from './api/contract';

/* How a device that already HAS the data asks what changed, rather than
   asking for the data again: collection deltas + ETag/304 for single
   documents. Protocol, not policy — the server answers it and every
   client speaks it, so "unchanged" means the same thing everywhere. */
export * from './api/sync';

/* Who the user IS, and what registration collects about them. Same
   caveat as `ecg/` below: the web still holds its own copy under
   src/services/auth/authTypes.ts, so until it imports from here an edit
   belongs in both places (tracked in PARITY.md). */
export * from './auth/contract';

/* What "still signed in" means when the server cannot be reached: the
   three-outcome refresh contract, the persisted principal a cold start
   opens from, and the refresh-token ceiling that bounds it. Policy, not
   transport — which is why it is here and not in either app. */
export * from './auth/session';

/* The URLs an auth e-mail carries, read the same way on every platform:
   a reset link, a verification link, a new-address link → { kind, token }. */
export * from './auth/links';

/* A session's User-Agent string → { platform, client }, so the "Devices &
   sessions" list names a device the same way on the web and the phone. */
export * from './auth/userAgent';

/* Which legal documents exist, at which version, read where — and the
   consent a sign-up or a Settings row records against them. The text
   itself is the web app's (public pages); this is what the three
   systems must agree on. */
export * from './legal/documents';

/* Take your data with you (one JSON document) and have your account
   erased (scheduled, with a grace period and a cancel). The rights the
   law gives a person over their record, as routes, shapes and a contract. */
export * from './auth/lifecycle';

/* Bot protection on the public doors (register today; leads and support
   when they exist). The SERVER decides whether a challenge is required —
   a provider key in its environment — and the clients ask; no key means
   nothing changes. The hosted page the phone shows, the field the token
   travels in, the posted message: all named here so three systems agree. */
export * from './auth/captcha';

/* A clinician registers themselves and waits for an admin (D3): the
   input, the pending answer, what the reviewer sees, the status patch,
   and the first ADMIN_ROUTES (the cockpit, phase 5, extends them). */
export * from './auth/clinician';

/* How a patient and their care are connected (LAUNCH_PLAN phase 2): a
   link as each side sees it, an invite as the staff who minted it see
   it, the code's alphabet and helpers, the routes, and the URL a QR code
   carries — read by the phone as a deep link and by the web as a page. */
export * from './care/contract';
export * from './care/links';
/* A clinic's patient list as text → invitation rows, parsed the same
   way everywhere (header-aware, delimiter-tolerant, bad lines reported). */
export * from './care/csv';

/* The patient ↔ care thread (messages, requests with a coded reason),
   lifted from the web's view models so the phone's messageApi and the
   clinic inbox read the same words. */
export * from './care/messages';

/* The clinic portal (LAUNCH_PLAN phase 3): a patient as a list sees
   them, a request as an entity with a status machine and an assignee,
   notifications as references, one pagination shape, and the names of
   the permissions the portal's guards use. */
export * from './clinic/contract';
/* Organizations (LAUNCH_PLAN phase 4): a clinic / hospital / practice
   with a status, self-registration with its first admin, the team with
   org roles, and the e-mailed invitation that gets a colleague in. */
export * from './org/contract';

/* What the app SHOWS about that person: the assembled, minimized medical
   card the Profile screen draws, and the portrait that follows them
   across devices. Same caveat — web `types/viewModels.ts` and the
   server's `types.ts` still declare it too. */
export * from './types/patient';

/* ── The frozen signal chain ──────────────────────────────────────
   `ecg/` is the ECG maths, copied VERBATIM from the web app so every
   platform computes bit-identical waveforms (root CLAUDE.md §2.3).
   Do not re-derive, re-tune or "clean up" any constant in there.
   The web app still carries its own copy under src/services/ecg/;
   migrating it to import from here is tracked in PARITY.md. Until it
   does, ANY edit to these files must be made in both places. */
export * from './ecg/filterDesign';
export * from './ecg/ecgDSP';
export * from './ecg/qrsValidator';
export * from './ecg/ecgSimulator';
export * from './ecg/measurement.constants';
export * from './ecg/reportFilter';
export * from './ecg/ecgAnalysis';

/* The hexaxial geometry of the six limb leads — where each lead looks
   from, and which electrodes it is read from. Domain fact, not a drawing
   parameter: `ecgAnalysis` already depends on I and aVF being 90° apart,
   and the 3-D heart on Insights turns to face the same angles. */
export * from './ecg/leadAxes';

/* ── Dual Lead II (firmware v3+) ──────────────────────────────────
   NOT part of the frozen chain above, and deliberately upstream of it: two
   raw copies of Lead II go in, one raw Lead II comes out, and `deriveLeads`
   / `reportFilterLeads` are then handed that exactly as they were always
   handed the single copy. Recordings without a second copy never reach it.
   Same mirror caveat as the rest of `ecg/`: the web keeps a verbatim copy
   under src/services/ecg/leadFusion.ts — edit both. */
export * from './ecg/leadFusion';
export * from './ecg/limbLeads';

/* ── Interpretation, and why it is a SEPARATE export ──────────────
   `ecgAnalysis` measures and refuses to interpret; `ecgScreening` reads
   what it measured and names patterns. Two files, two exports, one
   dependency direction — screening imports analysis and never the
   reverse. Anything that wants only the numbers can still take only the
   numbers, which is the property that keeps the measurement layer
   auditable. Read the header of `types/ecgScreening.ts` before adding a
   rule: findings carry their own evidence, their own confidence, and the
   blind spots six limb leads structurally cannot cover. */
export * from './types/ecgScreening';
export * from './ecg/screening';

/* Report GEOMETRY, in millimetres. Not signal maths, but the same rule
   applies for a different reason: a trace measured off the web's printed
   sheet and one measured off the phone must land on the same ruler, so
   both platforms build their grid and their path from these. */
export * from './ecg/ecgPath';
export * from './ecg/ecgGrid';

/* ── Stored recordings: persist, compare, export, import ──────────
   Everything a Scan History needs that is not UI. The codec is what makes
   a waveform survive a string-only store; `ecgAlign` is the fiducial warp
   two studies are compared through; the export builders are the pure half
   of the web's ecgExport (delivery — a download vs a share sheet — stays
   per-platform); the importer decides what an outside CSV is allowed to
   become. All four are read by web AND mobile, so a recording exported on
   one and re-imported on the other is the same recording. */
export * from './ecg/recordingCodec';
export * from './ecg/ecgAlign';
export * from './ecg/ecgExport';
export * from './ecg/ecgImport';

/* ── ECG ID: a patient measured against THEMSELVES ────────────────
   `ecgAlign` compares two studies. These three compare a study against
   every study that came before it: `beatTemplate` reduces one recording
   to its representative beat, `ecgIdentity` fuses those into a personal
   baseline and scores each study against it (leave-one-out, so nothing is
   ever graded against its own reflection), and `measurementStats` says
   when the measuring actually happened.

   Pure maths with no IO, so the same functions can move server-side
   later without changing an answer — which is the point of them being
   here rather than in the app that happens to run them today. Same
   prohibition as `ecgAnalysis`: they measure distances, never meanings. */
/* When the patient means to measure. A statement about their care rather
   than a handset setting — it has to survive a new phone and be legible to
   the web — so the shape is here and only the DELIVERY (OS notifications
   on a phone; nothing comparable in a browser tab) is per-platform. */
export * from './types/reminder';

/* The vocabulary a medical card is edited with, and the shape of an
   edit. Shared because three systems must agree on what "aspirin" is:
   a free-text field produces four spellings of one substance and
   nothing downstream can tell they are the same. */
export * from './types/healthCatalogue';

export * from './types/ecgIdentity';
export * from './ecg/beatTemplate';
/* Separates WHERE THE PADS WERE from what the heart did. The identity
   uses it to stop grading studies on electrode placement; it deliberately
   does NOT alter what any deviation reports. Read its header before
   touching it — the safety argument is the whole file. */
export * from './ecg/leadCalibration';
export * from './ecg/ecgIdentity';
/* The same identity, said in words a patient can use. Judges every study
   against THAT PATIENT'S OWN spread rather than an absolute threshold —
   read its header for why that distinction is the whole file. */
export * from './ecg/ecgIdentitySummary';
/* The identity as a viewer OVERLAY: the representative beat stamped at
   every R peak of the strip it is laid over. Alignment is exact by
   construction, and for the same reason its rhythm is the foreground's —
   read the header before letting any UI measure an interval off it. */
export * from './ecg/identityGhost';
export * from './ecg/measurementStats';

// v1.29.0 — care/contract v1.1.0 (invitations by e-mail, many at once, the treating
//           clinician per link) + care/csv (parseInviteCsv) — LAUNCH_PLAN 4.3.
// v1.28.0 — org/contract v1.1.0: OrgInviteRegisterInput + ORG_ROUTES.inviteRegister (a
//           newcomer takes a team invitation without an account; active at once).
// v1.27.0 — Exports org/contract (OrganizationView / Patch / Registration, the team's
//           OrgMemberView / OrgMemberPatch, the e-mail invitation, ORG_ROUTES +
//           ADMIN_ORG_ROUTES); three NotificationKinds + resourceType 'Organization'
//           (LAUNCH_PLAN 4.1).
// v1.26.0 — Exports auth/clinician (UserStatus, ClinicianRegistrationInput / Result,
//           PendingClinicianView, UserStatusPatch, ADMIN_ROUTES); AuthErrorCode
//           'account-pending'; AUTH_ROUTES.registerClinician; two NotificationKinds
//           (server v0.18.0, LAUNCH_PLAN 3.7).
// v1.25.0 — Exports care/messages (ChatMessage, ChatThread, SendMessageInput,
//           MESSAGE_ROUTES) and clinic/contract (PatientSummary, the request entity +
//           state machine, notifications, PagedResult, CLINIC_PERMISSIONS) —
//           server v0.17.0, LAUNCH_PLAN 3.1.
// v1.24.0 — Exports care/contract + care/links: CareRelationshipView, InviteSummary,
//           InviteCreateInput / InviteCreated / CareLinkInput / CareLinkResult,
//           CARE_ROUTES, the invite-code alphabet + helpers, careLinkUrl,
//           parseCareLinkUrl (server v0.16.0, LAUNCH_PLAN 2.1).
// v1.23.0 — Exports auth/captcha: CaptchaPolicy, CAPTCHA_ROUTES, the token field,
//           the hosted page (path, params, message, app return), CaptchaContract;
//           RegistrationInput.captchaToken, two AuthErrorCodes, link kind 'captcha'
//           (server v0.15.0, LAUNCH_PLAN 1.10).
// v1.22.0 — Exports auth/lifecycle: AccountExport, DeletionStatus, the routes,
//           DELETION_GRACE_DAYS, AuthLifecycleContract (server v0.14.0, LAUNCH_PLAN 1.9).
// v1.21.0 — Exports legal/documents (ids, versions, paths, consent contract,
//           REQUIRED_CONSENTS, CONSENT_ROUTES, missingConsents) and
//           RegistrationInput.consents (server v0.13.0, LAUNCH_PLAN 1.8).
// v1.20.0 — Account self-service contract (server v0.12.0, LAUNCH_PLAN 1.4b):
//           AuthAccountContract, SessionView + friends, AUTH_LINK_PATHS.changeEmail,
//           four more AUTH_ROUTES, 'wrong-password'; links reads /change-email;
//           exports auth/userAgent (describeUserAgent).
// v1.19.0 — Exports auth/links: parseAuthLinkUrl, one reader for the reset and
//           verification links (web URL, cyphix:// scheme, Expo dev-client URL).
// v1.18.0 — Account recovery contract (server v0.11.0): the four e-mailed-link
//           routes in AUTH_ROUTES, AuthRecoveryContract, AUTH_LINK_PATHS,
//           SessionUser.email / emailVerified, two new AuthErrorCodes.
// v1.17.0 — auth/contract: MIN_PASSWORD_LENGTH 10 → 6 (user decision 2026-10-08;
//           server v0.8.0 enforces the same six and nothing else).
// v1.16.0 — Exports `ecg/leadAxes`: the hexaxial angle, unit vector and
//           electrode pair of each limb lead, with the sign convention and
//           anatomical frame stated. The web's 3-D heart reads it, and so
//           will the phone's port — one table, not two.
// v1.15.0 — Adds the SCREENING layer (types/ecgScreening + ecg/ecgScreening):
//           43 published-threshold rules that read the measurements and name
//           patterns, with an urgency, an evidence trail and a confidence per
//           finding. Deliberately a separate module from ecgAnalysis, which
//           still measures and still does not interpret — the split is what
//           keeps the measurements checkable. `delineateBeat` is now exported
//           from ecgAnalysis (export only, no maths changed) so screening can
//           find a J point without forking the delineation.
// v1.15.0 — Exports `ecg/leadFusion` (dual Lead II, firmware v3+): upstream of the
//          frozen chain, never inside it. `ble/protocol` gains the 3-channel
//          characteristic + parser; recordings may carry a third raw channel.
// v1.14.0 — Adds ecg/identityGhost: the identity as a viewer overlay, stamped
//           at every R peak of the strip it is laid over. Alignment is exact by
//           construction and its rhythm is therefore the strip's own — read the
//           header before letting any UI measure an interval off it.
// v1.13.0 — Adds ecg/ecgIdentitySummary: the identity in words a patient can
//           use. Judges every study against THAT PATIENT'S OWN spread rather
//           than an absolute threshold, which is the whole point of the file.
// v1.12.0 — `IdentityAlert` is gone from types/ecgIdentity: a persistence rule
//           cannot rescue per-study thresholds that fire constantly, and this
//           one had been raising an alarm since the patient's first recording.
// v1.11.0 — Adds ecg/leadCalibration: separates WHERE THE PADS WERE from what
//           the heart did, so the identity stops grading studies on electrode
//           placement. Read its header before touching it — the reason it may
//           influence weighting and may NEVER influence reporting is the file.
// v1.10.0 — Adds auth/session: what "still signed in" means with no server —
//           the three-outcome refresh contract, the persisted principal a cold
//           start opens from, and the refresh-token ceiling that bounds it.
// v1.9.0 — Adds the health catalogue + the PatientCardPatch contract.
// v1.8.0 — Adds the measurement-reminder schedule (types/reminder.ts).
// v1.7.0 — Adds the ECG ID stack (beat templates, the personal baseline, the
//          measurement-cadence summary) and names the precordial leads, so the
//          identity is written against "whatever leads a study had" rather than
//          against six and 12-lead hardware extends it instead of replacing it.
// v1.6.0 — Adds the sync contract (api/sync.ts): delta envelope + cursor rules
//          + the 304 convention, so offline-first means one thing platform-wide.
// v1.5.0 — Adds the patient medical-card contract (card, portrait, routes), so
//          the Profile screen renders the same record on every platform.
// v1.4.0 — Adds the auth/registration contract (account, registration profile,
//          typed failures, password strength), so sign-up asks for the same
//          things and fails the same way on web, iOS and Android.
