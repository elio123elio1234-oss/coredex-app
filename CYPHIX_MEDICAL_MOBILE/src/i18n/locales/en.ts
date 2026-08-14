/* ==================================================================
   Locale — English (the CANONICAL key set for the mobile app).

   ★ To add a language: copy this file, translate the VALUES, register it
   in `i18n/config.ts`. Keys must match exactly — `he.ts` is typed against
   this object, so a missing or misspelled key is a compile error, not a
   blank label discovered by a patient.

   Keys are deliberately the same names the web locale uses wherever the
   copy is the same sentence (root CLAUDE.md §1: one feature, one wording,
   on every platform). Where mobile says something the web does not — the
   phone owns text size, the dock replaces the sidebar — the key is new
   and the divergence is recorded in PARITY.md.
   ================================================================== */

export const en = {
  /* ── Bottom dock (mobile's answer to the web sidebar) ── */
  dockHistory: 'History',
  dockTests: 'My Tests',
  dockHome: 'Home',
  dockChat: 'Chat',
  dockProfile: 'Profile',

  /* ── Home ── */
  homeGreeting: 'Hello {name}',
  homeGreetingNoName: 'Hello',
  homeSubPatient: 'Performing a Home ECG Test',
  homeStart: 'Start Test',
  homeConnect: 'Connect',
  homeStartDemo: 'Start Demo',
  homeDemoLink: 'Demo mode (no device)',

  /* ── Device state, in WORDS (never colour alone) ──
     Shared by Home and Settings so one device reads as one state. */
  devSimulated: 'Simulation — not a patient signal',
  devStreaming: 'Streaming',
  devConnected: 'Device connected',
  devConnecting: 'Connecting…',
  devError: 'Connection error',
  devNoBluetooth: 'No Bluetooth in this build',
  devNone: 'No device connected',

  /* ── BLE connect card ── */
  bleNotConnected: 'Not connected',
  bleConnected: 'Connected',
  bleLive: 'Live',
  bleSimulatedTag: 'SIMULATED',
  bleDisconnect: 'Disconnect',
  bleConnectDevice: 'Connect device',

  /* ── Limb exam — set-up steps ── */
  limbPrepProgress: 'Step {n} of {total}',
  limbPrepBack: 'Back',
  limbPrep1Title: 'Wear the watch on your left wrist',
  limbPrep1Confirm: 'The watch is on my left wrist',
  limbPrep2Title: 'Rest that hand on your left thigh',
  limbPrep2Confirm: 'My hand is resting on my left leg',

  /* ── Limb exam — live monitor ── */
  limbTitle: 'Limb Leads',
  limbHowTo:
    'Watch on your left wrist · rest that hand on your left leg · touch the crown with your right hand',
  limbRecordingNow: 'Recording — stay still and breathe normally',
  limbAutoHint: 'Recording starts on its own as soon as we feel a steady heartbeat.',
  limbCountdownCaption: 'seconds left',
  limbWaiting: 'Waiting for the device to send data…',
  limbGuideCaption: 'Touch the watch with your right hand — recording starts on its own',
  limbSimulationBanner: 'SIMULATION — not a real signal',
  limbSimulationShort: 'SIMULATION',
  limbRailWarning:
    'Lead {leads}: the signal is beyond what the Bluetooth link can carry, so it is drawn flat. ' +
    'Re-wet or re-seat that electrode. The electrode is not disconnected — this is a transport limit.',
  limbBpmUnit: 'BPM',
  limbSecLeftUnit: 'SEC LEFT',
  countdownA11y: '{n} seconds left',

  /* ── The heartbeat gate (why the recording has not started yet) ── */
  gateSettling: 'Warming up the sensors…',
  gateSearching: 'Looking for your heartbeat…',
  gateDetecting: 'Picking up beats…',
  gateValid: 'Got a steady heartbeat',
  gateLeadOff: 'Not making contact — press a little firmer',
  gateIrregular: 'Signal is unsteady — hold still a moment',
  gateNoSignal: 'No signal yet — check the watch is on your wrist',
  gateBeatsA11y: 'Beats detected: {found} of {needed}',
  gateBpm: 'BPM',
  gateSteadiness: 'Steadiness',

  /* ── Report ── */
  reportLimbTitle: 'Limb Leads Report',
  reportLeadSetShort: '6 limb',
  reportSimulated: 'SIMULATED SIGNAL — NOT A PATIENT RECORDING',
  reportDisclaimer:
    'For wellness and training only. Not a diagnostic device. Consult a clinician for medical interpretation.',
  reportTabWaveform: 'Waveform',
  vtTabTrace: 'ECG',
  vtTabValues: 'Values',
  vtTabFindings: 'Findings',
  reportTabMeasurements: 'Measurements',
  reportSectionA11y: 'Report section',
  reportDuration: 'Duration',
  reportLeads: 'Leads',
  reportSampleRate: 'Sample rate',
  reportSwipeHint: 'Swipe to scan all {sec} s →',
  reportRecordAgain: 'Record again',
  reportDone: 'Done',

  /* ── Report — the measurements sheet ── */
  analysisTitle: 'Automated Measurements',
  analysisSubtitle:
    'Computed from the recorded waveform. Measurements only — no interpretation is made or implied.',
  qInsufficient:
    'Too few clean beats were detected for reliable measurement. Repeat the recording.',

  secRate: 'Rate & Rhythm',
  secAxis: 'Frontal Plane Axis',
  secIntervals: 'Intervals & Durations',
  secAmplitudes: 'Wave Amplitudes',
  secQuality: 'Signal Quality',

  mBpm: 'Heart rate',
  mBpmHint: 'From the mean R-to-R interval',
  mRrMean: 'Mean R-R',
  mRrRange: 'R-R range',
  mRegularity: 'Rhythm',
  mSdnn: 'SDNN',
  mSdnnHint: 'Spread of beat intervals',
  mRmssd: 'RMSSD',
  mRmssdHint: 'Beat-to-beat variation',
  mPBefore: 'P before QRS',
  mPBeforeHint: 'Beats with a detectable P wave',
  mBeats: 'Beats analysed',

  regRegular: 'Regular',
  regSlightlyIrregular: 'Slightly variable',
  regIrregular: 'Variable',
  regIndeterminate: 'Not determined',

  axisNormal: 'Normal axis',
  axisLeft: 'Left axis',
  axisRight: 'Right axis',
  axisExtreme: 'Extreme axis',
  axisIndeterminate: 'Not determined',
  axisNormalRange: 'Shaded sector: −30° to +90°',
  axisNetI: 'Net QRS, lead I',
  axisNetAvf: 'Net QRS, lead aVF',

  iPR: 'PR interval',
  iQRS: 'QRS duration',
  iQT: 'QT interval',
  iQTcB: 'QTc (Bazett)',
  iQTcF: 'QTc (Fridericia)',
  refRange: 'Typical adult range',
  intervalsNote:
    'Shaded bands are typical adult reference ranges shown for context. They are not a finding.',

  ampLead: 'Lead',
  ampP: 'P',
  ampQ: 'Q',
  ampR: 'R',
  ampS: 'S',
  ampT: 'T',
  ampQRSpp: 'QRS p-p',
  ampUnit: 'All values in millivolts (mV), median across analysed beats.',

  qSqi: 'Rhythm steadiness',
  qAnalysed: 'Signal analysed',
  qSampleRate: 'Sample rate',

  analysisDisclaimer:
    'Automated measurements produced by CYPHIX from a 6-lead limb recording. This report is not a diagnosis and does not replace clinical assessment. All values require review by a qualified clinician.',

  /* ── Patient card (Profile tab) ── */
  profileDetails: 'Details',
  profileAge: 'Age',
  profileSex: 'Sex',
  profileBlood: 'Blood type',
  profileHeight: 'Height',
  profileWeight: 'Weight',
  profileBmi: 'BMI',
  profileBmiNote: 'Derived from height and weight',
  profileMrn: 'MRN',
  profilePhone: 'Phone',
  profileConditions: 'Conditions',
  profileAllergies: 'Allergies',
  profileMedications: 'Medications',
  profileFamily: 'Family history',
  profileEmergency: 'Emergency contact',
  profileCareTeam: 'Care team',
  profileRecent: 'Recent activity',
  profileNoneRecorded: 'None recorded',
  profileNoAllergies: 'No known allergies',
  /* Shown INSTEAD of letting empty sections imply "you have none of these". */
  profileLoadFailed: 'Your record could not be loaded, so the details below may be incomplete. Check your connection and pull to try again.',
  /* ── The portrait ──
     It is saved to your record, not to this phone, which is why the sheet
     says so: a patient deciding whether to add a photo to a medical record
     deserves to know where it goes. */
  profilePhotoTitle: 'Profile photo',
  profilePhotoChange: 'Change profile photo',
  profilePhotoTake: 'Take a photo',
  profilePhotoChoose: 'Choose from library',
  profilePhotoRemove: 'Remove photo',
  profilePhotoDenied:
    'CYPHIX does not have permission to use the camera or your photos. You can turn it on in your phone’s Settings.',
  profilePhotoFailed: 'That photo could not be saved. Tap to dismiss and try again.',
  profileNoMeds: 'No medications recorded',
  profileNoRecent: 'No recordings yet',
  profileSettingsDesc: 'Appearance, notifications, device and privacy',
  /* Empty-state sentences for sections that now ALWAYS render — an
     invisible empty section is the one a patient can never fill in. */
  profileEmergencyNone: 'No emergency contact yet. Add one so a doctor knows who to call.',
  profileCareTeamNone: 'No care team assigned yet. Your clinic adds this.',

  /* ── Personal details editor (pushed from Profile) ── */
  pdTitle: 'Personal details',
  pdIdentityTitle: 'Identity',
  pdIdentityNote:
    'Name, date of birth and sex are part of the medical record. Ask your clinic to correct them.',
  pdDob: 'Date of birth',
  pdBodyTitle: 'Body measurements',
  pdUnitMetric: 'CM · KG',
  pdUnitImperial: 'FT · LB',
  pdSave: 'Save changes',
  pdSaveFailed: 'Could not save. Your changes are still here — try again.',
  pdEcIncomplete: 'To save the contact, fill in the name, the phone and the relationship.',
  pdRemoveContact: 'Remove contact',
  pdRemovedNote: 'The contact will be removed when you save.',
  pdUndo: 'Keep it',

  sexMale: 'Male',
  sexFemale: 'Female',
  sexOther: 'Other',
  sexUnknown: 'Unknown',

  /* ── Settings ── */
  settingsTitle: 'Settings',
  settingsSubtitle: 'Manage your preferences and account',

  setSecAppearance: 'Appearance',
  setSecAppearanceDesc: 'How CYPHIX looks on this device',
  setTheme: 'Theme',
  setThemeDesc: 'Follow the phone, or pick one',
  setThemeSystem: 'System',
  setThemeLight: 'Light',
  setThemeDark: 'Dark',
  /* ★ Mobile-only wording: the phone owns text size (Dynamic Type / Font
     size) and every screen here respects it, so there is no app-level
     scale to offer. Divergence recorded in PARITY.md. */
  setTextSize: 'Text size',
  setTextSizeDescMobile: "CYPHIX follows the text size set in your phone's own display settings",
  setTextSizePhone: 'Phone setting',
  bgLabel: 'Background',
  bgLabelDesc: 'The colour behind your screens',
  bgWaves: 'Waves',
  bgWhite: 'White',
  bgGray: 'Gray',
  bgCalm: 'Calm',

  language: 'Language',
  languageDesc: 'The language CYPHIX speaks to you in',

  setSecNotifications: 'Notifications',
  setSecNotificationsDesc: 'Choose what you want to be reminded about',
  setNotifReminders: 'Test reminders',
  setNotifRemindersDesc: 'Remind me when a test is due',
  setNotifResults: 'Results ready',
  setNotifResultsDesc: 'Tell me when a recording has been reviewed',
  setNotifMessages: 'Doctor messages',
  setNotifMessagesDesc: 'Notify me about new messages',

  setSecCare: 'Care connection',
  setSecCareDesc: 'Who your messages go to',
  setCareConnection: 'Connection',
  setCareClinicianDesc: 'Direct chat with your private doctor',
  setCareClinicDesc: 'Requests are triaged by the clinic to an available clinician',
  careClinician: 'My doctor',
  careClinic: 'Clinic',

  setSecDevice: 'ECG Device',
  setSecDeviceDesc: 'Your Bluetooth ECG connection',
  setDeviceStatus: 'Status',
  setDeviceName: 'Device',
  setDeviceNonePaired: 'No device paired',
  setDeviceDisconnect: 'Disconnect',
  setDeviceTap: 'Tap',
  setDeviceConnect: 'Connect a device',
  setDeviceNoBleDesc: 'This build has no Bluetooth — the simulator is the path',
  setDeviceScan: 'Scan',
  setDeviceDemo: 'Demo',

  setSecPrivacy: 'Privacy & Security',
  setSecPrivacyDesc: 'Your data and how it is protected',
  setPrivacyOnDevice: 'On-device analysis',
  /* ★ Rewritten in v0.55.0 because the old sentence — "Your ECG never
     leaves this device. There is no server today." — stopped being true
     the day the backend and the sync engine shipped. A privacy line that
     describes an app that no longer exists is not reassurance, it is a
     false statement on the one screen that must never make one. */
  setPrivacyOnDeviceDesc:
    'Your ECG is measured and analysed on this phone. Recordings sync encrypted to your CYPHIX account, so your clinic and your other devices can see them.',
  encryptionBadge: 'Encrypted',
  setPrivacyExport: 'Export my data',
  setPrivacyExportDesc: 'Download everything stored on this device',

  setSecAccount: 'Account',
  setSecAccountDesc: 'Who you are signed in as',
  setAccountName: 'Name',
  setAccountRole: 'Role',
  roleLabelPatient: 'Patient',
  roleLabelClinician: 'Clinician',
  roleLabelTechnician: 'Technician',
  roleLabelAdmin: 'Admin',
  setDevRole: 'Preview as role',
  setDevRoleDesc: 'Debug only. Draws the app as this role — it grants nothing, the server still decides what is allowed.',
  setDevRoleReal: 'Actual',
  setAboutSession: 'Session storage',
  setAppLock: 'Lock when unattended',
  /* Says what it protects and — just as important — what it does not.
     "Your record on this phone" is the honest scope: it is a lock on
     what this device draws, not on what the server will answer. */
  setAppLockDesc: 'After five minutes away, ask for Face ID, a fingerprint or your passcode before showing your record again. Opening the app does not ask — unlocking your phone already did.',
  setAccountSignOut: 'Sign out',
  setAccountSignOutDesc: 'Ends this session on this phone',
  setSignOutBody: 'You will need your password — or Face ID — to open your readings again. Nothing is deleted.',

  setSecAbout: 'About',
  setSecAboutDesc: 'Version and compliance',
  setAboutVersion: 'App version',
  setAboutBuild: 'This build',
  setAboutMaterial: 'Surface material',
  setAboutCompliance: 'Compliance',
  setAboutComplianceValue: 'HIPAA · GDPR · Israeli Privacy Law',

  setComingSoon: 'Coming soon',

  /* ══════════════════════════════════════════════════════════════
     Scan History.

     Wherever the web says the same sentence, the wording here is the
     web's verbatim (`CYPHIX_MEDICAL_WEB/src/i18n/locales/en.ts`) — two
     apps that phrase "Delete this recording?" differently are two
     products. The keys that end in `Touch` are the exceptions: they
     describe a GESTURE, and the web's "click once to pin a marker" is
     not a shorter way of saying what a finger does.
     ══════════════════════════════════════════════════════════════ */

  /* ── The list ── */
  histTitle: 'Scan History',
  histEmptyTitle: 'No recordings yet',
  /* Replaces the old `histEmptyBody`, which promised recordings would "sync
     here through the CYPHIX server" — they do not yet, and they no longer
     need to: a finished capture is filed on the device the moment it ends.
     A copy that describes a plan rather than the behaviour is a bug. */
  histEmpty: 'No recordings yet. Finished measurements are filed here automatically.',
  histLoading: 'Loading recordings…',
  histLoadError: 'Could not load the recordings. Try again.',
  histEmptyWaveform: 'This recording has no readable waveform.',
  histListLabel: 'Recorded sessions',
  histCount: '{n} recordings',
  histOwnOnly: 'your own',
  histNotes: '{n} notes',
  histSimulated: 'SIMULATION',
  histLowQuality: 'Low signal quality',
  histDevice: 'Device',
  histSelectOne: 'Select a recording from the list.',
  /* Row verdict pills — COMPRESSED forms of the long `scrLevel*` verdicts.
     Same ScreeningLevel, same palette, so a row and the Findings tab can
     never disagree in substance, only in word count. "No findings" (not
     "Normal") because the engine's claim is that nothing was found, not
     that the heart is fine — the blind-spots rule applies to a pill too. */
  histVerdictClear: 'No findings',
  histVerdictAttention: 'Worth a look',
  histVerdictUrgent: 'Needs attention',
  histVerdictInconclusive: 'Unreadable',
  histDigestProgress: 'analysing {done} of {total}…',
  histPreviewA11y: 'Four-second ECG preview',

  /* ── Saving a finished capture ── */
  histSaving: 'Saving to history…',
  histSaved: 'Saved to history',
  histSaveFailed: 'This recording was NOT saved:',

  /* ── Import / export ── */
  histImport: 'Import ECG (CSV)',
  histImported: 'Imported',
  histImportFailed: 'Could not read that file.',
  histExportCsv: 'Export raw CSV',
  histExportCsvHint: 'Raw samples, opens anywhere',
  histExportEdf: 'Export EDF+',
  histExportEdfHint: 'For EDFbrowser / MNE / WFDB',
  histExportFailed: 'Could not export this recording.',
  printReport: 'Share PDF report',
  pdfHint: 'The printable sheet, at 25 mm/s',
  pdfSheetOf: 'Sheet {n} of {total}',
  reportRecorded: 'Recorded',

  /* ── Deleting ── */
  histActions: 'Actions',
  histDelete: 'Delete',
  histDeleteTitle: 'Delete this recording?',
  histDeleteBody:
    'This permanently removes the waveform and every note on it. A recording cannot be re-taken — the patient, the moment and the heartbeat were all specific to it. There is no undo.',
  histDeleteForbidden: 'You do not have permission to delete this recording.',
  histDeleteFailed: 'Could not delete the recording. Try again.',
  viewerRetry: 'Try again',

  /* ── History → Insights: the ECG ID ──
     ★ Copy rules for this whole block, because it is the easiest place in
     the app to write something that becomes a diagnosis by accident:
       • never a verdict — no "normal", "abnormal", "healthy", "concerning";
       • every difference is stated as a distance from the PATIENT'S OWN
         baseline, never from a population range;
       • never an instruction — "see a doctor" is a clinical decision this
         app is not licensed to make. "Open the study" is a UI action and
         is fine.
     `insDisclaimer` is part of the screen, not boilerplate. */
  /* ── Editing the medical card ──
     ★ No copy here tells anyone what to record. The catalogue offers
     vocabulary; deciding what is true about a patient is theirs and their
     doctor's. */
  cardEdit: 'Edit',
  cardSave: 'Save',
  cardSaving: 'Saving…',
  cardSaveFailed: 'Could not save. Your changes are still here — try again.',
  cardAdd: 'Add',
  cardAddOther: 'Something else…',

  /* ── Measurement reminders ──
     ★ Copy rule for this block: it says WHEN the patient asked to be
     reminded and never how often anyone should measure. No "recommended",
     no "you should", no streak language. How often to take an ECG is a
     clinical instruction and this app does not give those. */
  remTitle: 'Reminders',
  remSecWhen: 'Reminders',
  remEnable: 'Remind me to measure',
  remHowMany: 'How many times a day',
  remDone: 'Done',
  remNextAt: 'Next {when}',
  remPerDay: '{n}× a day',
  remDenied:
    'Notifications are switched off for CYPHIX in your phone’s settings, so these reminders will not appear.',
  /* Named by part of the day, chosen from the TIME — so a reminder moved
     to 07:30 reads "Morning", not "Reminder 2". */
  remPartMorning: 'Morning',
  remPartMidday: 'Midday',
  remPartAfternoon: 'Afternoon',
  remPartEvening: 'Evening',
  /* What the phone actually shows. Short, and it names the app, because a
     notification arriving hours later has to say who is asking. */
  remNotifTitle: 'Time for a measurement',
  remNotifBody: 'Open CYPHIX and take your ECG.',

  /* ── The second ask ──
     ⚠️ It fires ONLY if nothing was recorded. The copy must stay neutral:
     no "you missed", no "you still haven't". The app does not know why —
     and a reminder that scolds is a reminder that gets switched off. */
  remFollowAfter: 'How much later',
  remFollowNotifTitle: 'Your reading is still open',
  remFollowNotifBody: 'Nothing recorded yet — take it whenever suits you.',
  remActionSnooze: 'Remind me in 15 min',
  remActionDone: 'Done',

  /* ── Check it works ──
     ★ These report what the PHONE holds, not what the app intended. They
     exist because an hour was spent waiting for a follow-up that had never
     been armed, and every other reading on this screen described intent. */
  /* `d` daily + `f` follow-ups the OS is holding. Fact, not intent. */
  remArmed: '{d} + {f} set',
  remFollowOff: 'Off',
  remTest: 'Send a test now',
  remTestSent: 'Sent — lock your phone and watch for both.',
  remTestFailed: 'Could not send. Notifications are switched off for CYPHIX.',

  testsNextAt: 'Next {when}',

  insTabStudies: 'Studies',
  insTabInsights: 'Insights',

  insTitle: 'ECG ID',
  insBuilding: 'Building your ECG ID',
  insBuildingBody: 'Reading your studies…',
  insProgress: 'Analysing study {done} of {total}',
  insEmptyTitle: 'No ECG ID yet',
  insEmptyBody:
    'Once a few clean studies are recorded, CYPHIX averages the beats in each one into a single representative beat — and those into a baseline that is yours. Every new study is then measured against it.',

  /* State reads as an instrument label, not as a verdict: no "pass",
     nothing green. "Established" describes how much evidence there is,
     which is a fact about the data and not a grade for the heart. */
  insMatEnrolling: 'Baseline forming',
  insMatEstablished: 'Baseline established',
  insEnrollLabel: 'Studies enrolled',
  insEnrollHint: '{n} more clean studies and the baseline is set.',
  insBuiltFrom: '{n} studies',
  insUpdated: 'Updated {date}',
  /* The ring's own caption — it names what the number in the middle IS,
     which changes between the two states. */
  insRingStudies: 'studies',
  insRingAgreement: 'agree',

  insCompareLatest: 'Overlay latest study',
  insLegendBand: 'Your usual range',
  insLegendLatest: 'Latest study',

  /* The caliper — drag along the beat. */
  insCalHint: 'Drag across the beat to measure it',
  insCalMs: 'from R',
  insCalMv: 'baseline',
  insCalBand: 'range',
  insCalLatest: 'latest',

  /* The builder — drag to assemble the average study by study. */
  insBuiltAll: 'Averaging all {n} studies',
  insBuiltPartial: 'Averaging the first {k} of {n} studies',
  insBuiltReset: 'show all',
  /* ⚠️ Says the band FILLS OUT. It does not tighten — see BeatBuilder's
     header. A caption promising a narrowing range would promise the one
     thing the maths will not do. */
  insBuiltMeaning:
    'One study shows only its own beat-to-beat noise. The shaded range fills out as studies are added.',

  /* Beats left out of one study's average. */
  insRejectedTitle: '{n} beats not averaged in',
  insRejectedBody: 'Heavy line: the beat that was used. Both reasons are ordinary.',
  insRejPremature: 'Came early',
  insRejDissimilar: 'Different shape',
  insRejTruncated: 'Cut off by the end of the recording',
  insRejMatch: '{n}% match',

  insMatch: '{n}% match',
  insNoDeviations: 'Nothing measurably different from your baseline.',
  /* ★ What a difference IS. The chips were reported as unclear, and a
     number nobody can interpret is worse than no number: it worries
     without informing. Says what was compared and what it is not. */
  insDeviationMeaning:
    'Measured against your own earlier studies, not a normal range. A difference is something to look at with your doctor.',


  /* ★ The effective study count. Deliberately worded as a correction to
     the number beside it rather than as a statistic of its own — "of
     which 2.5 effective" reads as "that 24 is optimistic", which is the
     only thing a reader needs to take from it. */
  insEffective: '{n} effective',
  /* Says a correction was applied AND what it did not touch. A corrected
     number handed over silently is the thing this line exists to prevent. */
  insCalibrated:
    'Electrode position differed here ({deg}°, {pct}% gain); the shape match allows for it. The axis and amplitude figures do not.',


  /* ── ★ THE PATIENT'S HALF OF INSIGHTS (v0.42.0) ──────────────────
     Everything above this point is addressed to someone who already
     knows what a QRS is. These are for the person whose heart it is.

     Two rules the wording holds to, both load-bearing:
       • It never grades. "Looks like your usual ones" is a statement
         about a distance from their own baseline, which is the only
         claim this app has ever been able to make. No "good", no
         "normal", no reassurance that would be a clinical opinion.
       • It never uses an absolute yardstick, because the sentence is
         chosen by `summariseIdentityPlainly` against the patient's own
         spread. Copy implying a universal standard ("a healthy 95 %")
         would be describing a computation that does not happen. */
  insPlainLearning: 'Still learning what your heartbeat looks like',
  insPlainLearningMore: '{n} more clean recordings and we will have your signature.',
  insPlainLearningSoon: 'A few more recordings and we will have your signature.',
  insPlainConsistent: 'Your last recording looks like you',
  insPlainSlightly: 'Your last recording is a little different from your usual',
  insPlainDifferent: 'Your last recording is not like your usual ones',
  /* A proportion, not a grade — this is what turns a percentage nobody
     can place into something anybody can. */
  insPlainTypical: '{k} of your {n} recordings look like your usual ones.',

  /* Three figures a patient recognises. Captions are plain words, never
     abbreviations — `PatientFacts` explains why these three. */
  insFactRate: 'Your usual heart rate',
  insFactStudies: 'Recordings',
  insFactMonths: 'Months tracked',
  insFactWeeks: 'Weeks tracked',
  insFactDays: 'Days tracked',

  /* What the screen IS. Describes the METHOD only: "see what moved" is
     the strongest phrasing allowed, because what a movement would mean
     is a clinical claim. */
  insHow1: 'Every heartbeat draws the same shape, and yours is yours — like a signature.',
  insHow2: 'We averaged {n} of your recordings to find it, so the noise cancels out and the shape stays.',
  insHow3: 'Each new recording is laid over that shape to see what moved.',

  /* The selected study, in the patient's terms, ABOVE the chips. "67 %
     match" reads like a failing exam grade to someone with no idea what
     a good number is — and it may be a perfectly ordinary recording. */
  insStudyUsual: 'This one looks like your usual recordings.',
  insStudySlightly: 'This one is a little different from your usual.',
  insStudyDifferent: 'This one stands out from your usual recordings.',


  /* ── The ECG ID as a comparison overlay (v0.43.0) ────────────────
     Listed above the studies because it is not one more study — it is
     the average of all of them. */
  ovIdLabel: 'Your own typical heartbeat',
  ovIdHint: 'Averaged from all your recordings',
  ovIdComparing: 'Comparing with your own typical heartbeat',
  ovIdSection: 'How it lines up',
  ovIdExactFit: 'Your typical beat is drawn on every heartbeat of this recording, so it lines up exactly — there is nothing to align by hand.',
  /* ⚠️ NOT decoration. The ghost is stamped on this strip's own R peaks,
     so its rhythm IS this strip's rhythm; an interval measured off it is
     this recording's interval read twice. */
  ovIdBorrowsRhythm: 'It borrows this recording’s timing, so compare the SHAPE — never measure an interval off the grey trace.',
  ovIdCrowded: 'Your beats are close together here, so each drawn beat is cut short at the end — compare the QRS rather than the T wave.',


  /* ── The study readout (v0.44.0) ─────────────────────────────────
     Every measurement, every time. The unit is stated once, on the
     study's own value: repeating it on the baseline doubles the ink for
     no information and turns a comparison into a spec sheet. */
  insRowRate: 'Heart rate',
  insUsually: 'usually {v}',
  insUsuallyUnknown: 'no usual yet',

  /* ── The weekly goal (v0.44.0) ───────────────────────────────────
     The goal is the number of reminder times the patient set. There is
     deliberately no second setting: a goal and a schedule are one
     intention said twice, and two places to say it is two places for
     them to disagree. */
  insGoalTitle: 'This week',
  insGoalNone: 'Set reminder times to see a weekly goal.',
  insGoalMon: 'M',
  insGoalTue: 'T',
  insGoalWed: 'W',
  insGoalThu: 'T',
  insGoalFri: 'F',
  insGoalSat: 'S',
  insGoalSun: 'S',

  insTimelineTitle: 'Match over time',
  insBaselineTitle: 'Your baseline',
  insDriftTitle: 'Change since you started',
  insDriftPerYear: '{v} {unit}/yr',
  /* Why this section is not the section above it. Both show differences;
     only one of them is an event. */
  insDriftMeaning:
    'How your baseline has moved since your first studies. Slow change over months is ordinary — the rate is the part worth watching.',
  insCadenceTitle: 'When you measure',
  insCadenceStudies: '{n} studies',
  insCadencePerWeek: '{n} a week',
  insCadenceStreak: '{n} weeks running',
  insCadenceGap: 'Longest gap {n} days',
  insCadenceLast: 'Last {n} days ago',
  insCadenceToday: 'Recorded today',
  insCadenceBusiest: 'Most often between {from}:00 and {to}:00',

  /* Chip labels — short on purpose; the full names (`iQRS`…) do not fit. */
  insDevShape: 'Shape',
  insDevBand: 'Outside range',
  insDevAmplitude: 'Amplitude',
  insDevQrs: 'QRS',
  insDevQtc: 'QTc',
  insDevPr: 'PR',
  insDevAxis: 'Axis',
  insDevRate: 'Rate',
  insDevLeads: '{n} leads',
  insSevWatch: 'small difference',
  insSevMarked: 'large difference',

  insExSimulated: 'Simulation — not counted',
  insExFewBeats: 'Too few clean beats',
  insExLowQuality: 'Signal too unsteady',
  insExOutlier: 'Does not match your other studies',
  insExcludedShort: 'Not counted',

  insDisclaimer:
    'A comparison with this person’s own earlier recordings, not with a population. It is not a diagnosis and does not replace clinical assessment.',

  /* ── Viewer tools ── */
  bpm: 'BPM',
  vtCalipers: 'Calipers',
  vtCalipersHintTouch: 'Two markers you drag. The readout is the interval between them.',
  vtMark: 'Mark',
  vtMarkHintTouch: 'Tap a point on any trace to label it.',
  vtCursor: 'Cursor',
  vtCursorHintTouch: 'Reference lines dropped across every lead at once.',
  vtRPeaks: 'R peaks',
  vtRPeaksHint: 'Ticks the beats the rate was computed from.',
  vtCompare: 'Compare with',
  vtFilters: 'Filters',
  vtBaseline: 'Baseline',
  vtBaselineHint:
    'Removes slow baseline drift from breathing. Off shows the true drift — and any genuine ST shift.',
  vtNotch: '50 Hz',
  vtNotchHint: 'Removes mains interference. Off shows the untouched signal.',
  vtSmooth: 'Smooth',
  vtSmoothHint: 'Savitzky-Golay smoothing. Off shows the sharpest detail, and the most noise.',
  vtFiltersOff: 'Some filters are off',
  vtZoomIn: 'Zoom in (show less time, larger)',
  vtZoomOut: 'Zoom out (show more time)',
  vtFit: 'Fit',
  vtLayoutStack: 'All 6',
  /* The toolbar is icons; these are what a screen reader announces, and what
     the sheets behind them are titled. Anything that needs WORDS to be honest
     — the filter stages, the alignment modes — lives in a sheet rather than
     behind a pictogram somebody would have to guess at.
     Comparison used to share this sheet and was reported twice as
     incomprehensible; it now has its own (see CompareSheet). */
  vtMoreTools: 'Filters',
  vtFullscreen: 'Full screen',
  vtExitFullscreen: 'Exit full screen',
  ovAlignSection: 'Line the two up by',
  setDone: 'Done',

  /* ── Gesture hints. One line each, never wrapped. ── */
  calHintTouch: 'Drag either marker · zoom in to place it precisely',
  annHintTouch: 'Tap a point to label it · tap a label to edit it · drag it to move it',
  curHintTouch: 'Tap to drop a line across every lead · tap a line to remove it',

  /* ── Comparing two studies ── */
  ovNone: 'No comparison',
  ovComparing: 'Ghost trace: {when}',
  ovModeBeat: 'Beat 1',
  ovModeBeatHint:
    'Shift the ghost so its first beat sits on this one. Keeps the ghost’s own timing intact.',
  ovModeWarp: 'Align P-QRS-T',
  ovModeWarpHint:
    'Stretch the ghost between its own P, Q, R, S and T so every feature lands on this recording’s. Compares shape, but destroys the ghost’s intervals — never measure off a warped trace.',
  ovModeManual: 'Nudge',
  ovModeManualHint: 'Move the ghost yourself.',
  /* The label on the visible drag handle. An invisible drag surface reads as
     a feature that does not work, which is exactly how it was reported. */
  ovDragHandle: 'Drag to move the grey trace',
  ovWarpApplied: 'aligned on {n} landmarks — shape only, do not measure the ghost',
  ovWarpFailed: 'could not align — too few beats detected',
  ovShifted: 'shifted {ms} ms',
  ovDragHint: 'Drag the grey recording — sideways in time, up/down in height',

  /* The comparison sheet. It opens by saying what the grey trace IS, because
     that is the question a reader has the moment one appears. */
  ovExplain:
    'Lay an earlier recording over this one. It is drawn in grey, behind the current trace, so a change in shape shows up as the two pulling apart.',
  ovLegendThis: 'This recording',
  ovLegendGhost: 'The earlier one',
  ovPick: 'Compare with',
  ovNeedTwo:
    'Comparing needs a second recording. Take another exam and it will appear here.',
  ovMoveTitle: 'Move the grey trace',
  ovMoveOnScreen: 'Move it on the screen',
  ovOffset: 'Moved {ms} ms · {mv} mV',
  ovResetPos: 'Centre it again',
  ovRemove: 'Stop comparing',

  /* ── Notes on the record ── */
  noteTitle: 'Clinical note',
  notePlaceholder: 'Summary, impression, or a note for the patient…',
  noteSave: 'Save note',
  noteSaved: 'Saved',
  noteHint: 'Free text — not a coded finding. Saved with this recording.',
  annListTitle: 'Marked points',
  annTitle: 'Label this point',
  annEditTitle: 'Edit this note',
  annAt: 'Lead {lead} · {time} s',
  annPlaceholder: 'Your own note…',
  annAdd: 'Add',
  annSave: 'Save',
  annCancel: 'Cancel',
  annDelete: 'Delete note',
  tagPvc: 'PVC',
  tagPac: 'PAC',
  tagPause: 'Pause',
  tagArtifact: 'Artifact',
  tagNote: 'Note',

  /* ── Viewer feature names (the RBAC matrix, for a future roles screen) ── */
  vfCalipers: 'Calipers',
  vfFilters: 'Filter controls',
  vfAnnotate: 'Annotations',
  vfCompare: 'Compare studies',
  vfExportPdf: 'Export PDF',
  vfExportRaw: 'Export raw data',
  vfDelete: 'Delete recordings',

  /* ── Tests tab — the test PICKER, same copy as the web TestsPage.
        (Finished recordings live in History; this tab is "which test am
        I doing?", not "what have I done?".) ── */
  testsTitle: 'My Tests',
  testsChooseIntro: 'Pick the test you want to do.',
  testsConnectHint: 'Connect your watch to start a test.',
  testsScheduledBadge: 'Scheduled',
  testsSoonBadge: 'Coming soon',
  measureLimbTitle: '6 Limb Leads',
  measure12Title: 'Full 12 Leads',
  testsLimbSub: '6 leads · arms & legs',
  tests12Sub: '12 leads · full',
  testsWatchHow: 'Watch how',
  testsVideoSoon: 'Explainer video coming soon',
  testsExplainLimb:
    'Put the watch on your wrist and rest that hand on your leg, then touch the crown with your other hand. This reads the leads from your arms and legs.',
  testsExplain12: 'The full test: the arm-and-leg leads first, then the six chest points.',
  /* The chest half of the 12-lead test needs the camera guidance that only
     the web app has today — see PARITY.md. Said plainly, because a circle
     that does nothing when tapped is worse than one that says why. */
  tests12MobileNote: 'The chest part is on the web app for now.',
  testsPrevTest: 'Previous test',
  testsNextTest: 'Next test',
  close: 'Close',
  chatTitle: 'Chat',
  chatEmptyBody:
    'Messages with your care team will appear here, on the same thread you see on the web.',

  /* ══ Onboarding: splash, sign-in, registration ══════════════════
     Keys match the web's `auth*` names wherever the two apps say the
     same sentence. Everything the signed-out flow puts on screen is
     here — a hard-coded string in a step is a bug. */

  /* ── Splash ── */
  authTagline: 'Home ECG · Medical grade',

  /* ── Welcome ── */
  authWelcomeTitle: 'Clinical-grade ECG,\nrecorded at home.',
  authWelcomeSub: 'Set up your account and health profile. It takes about two minutes.',
  authCreateAccount: 'Create account',
  authSignIn: 'Sign in',
  authAppleSignIn: 'Sign in with Apple',
  authGoogleSignIn: 'Sign in with Google',
  authLegalBefore: 'By continuing you agree to the ',
  authLegalTerms: 'Terms',
  authLegalAnd: ' and ',
  authLegalPrivacy: 'Privacy Notice',
  authLegalAfter: '. CYPHIX is not a substitute for emergency care.',

  /* ── Sign in ── */
  authSignInTitle: 'Sign in',
  authSignInSub: 'Welcome back. Your readings are waiting.',
  authEmail: 'Email',
  authEmailPlaceholder: 'name@example.com',
  authPassword: 'Password',
  authPasswordPlaceholder: '••••••••',
  authShow: 'Show',
  authHide: 'Hide',
  authForgot: 'Forgot password?',
  authUseFaceId: 'Use Face ID',
  authUseTouchId: 'Use Touch ID',
  authUseBiometrics: 'Unlock with biometrics',

  /* ── The app lock ──
     Deliberately does NOT say "signed out" or "session expired": the
     session is intact and the patient is being asked to prove they are
     holding their own phone. Words that imply otherwise would send
     someone hunting for a password they do not need. */
  lockSubtitle: 'Unlock to open your record',
  lockUnlock: 'Unlock',
  lockPrompt: 'Unlock CYPHIX',
  lockSignOut: 'Sign in as someone else',

  /* ── Connection strip ──
     "Showing saved data" rather than "no internet": what the patient
     needs to know is what is on their screen, not what their radio is
     doing. It is also the truthful claim — the app IS showing the copy on
     this phone, whatever the reason the server could not be reached.
     ★ There is deliberately no "Connected" string. Reconnecting is not an
     achievement, and the honest confirmation is the notice disappearing —
     a badge announcing that everything is fine is a new interruption
     caused by the absence of a problem (v0.40.1). */
  connOffline: 'Offline · showing saved data',
  connConnecting: 'Connecting to CYPHIX…',
  authBiometricPrompt: 'Unlock CYPHIX',
  authBack: 'Back',

  /* ── Reset password ── */
  authResetTitle: 'Reset password',
  authResetSub: 'Enter the email on your account. We will send a reset link valid for 30 minutes.',
  authResetSent: 'If that address is on an account, a link is on its way. Check your inbox and spam folder.',
  authSendReset: 'Send reset link',

  /* ── Create account ── */
  authSignUpTitle: 'Create account',
  authSignUpStep: 'Step 1 of 3 · Credentials',
  authFullName: 'Full name',
  authNamePlaceholder: 'Alex Moreau',
  authPasswordHint: 'At least {n} characters',
  authStrengthNone: '—',
  authStrengthWeak: 'Weak',
  authStrengthFair: 'Fair',
  authStrengthStrong: 'Strong',
  authContinue: 'Continue',
  authSignInInstead: 'Sign in instead',

  /* ── Phone ── */
  authPhoneTitle: 'Your phone number',
  authPhoneSub: 'Step 2 of 3 · Used to verify your identity and to alert your emergency contact.',
  authSendCode: 'Send code',
  authDelete: 'Delete',
  authCountryCode: 'Country code {code}. Tap to change.',
  authPhoneEntered: 'Number entered: {phone}',

  /* ── Code ── */
  authOtpTitle: 'Enter the 6-digit code',
  authOtpSub: 'Sent to {phone}.',
  authOtpEntered: '{n} of {total} digits entered',
  authResendIn: 'You can ask for a new code in {clock}',
  authResendNow: 'Send a new code',
  authVerify: 'Verify',
  authDemoCode: 'Demo build — no text message is sent. Use this code:',

  /* ── Health profile ── */
  authStepOf: 'Step {n} of {total}',
  authSkip: 'Skip',
  authOptional: 'Optional',

  authSexTitle: 'What is your sex?',
  authSexSub: 'ECG interpretation thresholds differ by sex. This is recorded as sex assigned at birth.',
  authSexMale: 'Male',
  authSexFemale: 'Female',
  authSexOther: 'Other',
  authSexUnknown: 'Not stated',

  authHeightTitle: 'Your height',
  authHeightSub: 'Used with weight to index your ECG voltage criteria.',
  authHeightValueA11y: '{value} centimetres',
  authWeightTitle: 'Your weight',
  authWeightSub: 'Electrode impedance is calibrated against body mass.',
  authWeightValueA11y: '{value} kilograms',
  authUnitCm: 'CM',
  authUnitFt: 'FT',
  authUnitKg: 'KG',
  authUnitLb: 'LB',
  authUnitCmLong: 'cm',
  authUnitKgLong: 'kg',
  authUnitLbLong: 'lb',

  authBloodTitle: 'Blood type',
  authBloodSub: 'Shown on your emergency medical card. Leave it blank if you are not certain — never guess.',
  authBloodUnknown: 'I don’t know my blood type',
  authBloodUnknownShort: 'Unknown',

  authEmergencyTitle: 'Emergency contact',
  authEmergencySub: 'Notified with your location if a reading detects a critical rhythm.',
  authEcName: 'Name',
  authEcNamePlaceholder: 'Jordan Moreau',
  authEcPhone: 'Phone',
  authEcPhonePlaceholder: '+972 50 000 0000',
  authEcRelation: 'Relationship',
  authEcNote: 'Tell them they are your emergency contact before you finish — a call from an app is a poor first introduction.',
  authRelPartner: 'Partner',
  authRelParent: 'Parent',
  authRelSibling: 'Sibling',
  authRelFriend: 'Friend',
  authRelDoctor: 'Doctor',

  authPhotoTitle: 'Profile photo',
  authPhotoSub: 'Helps clinicians confirm they are reviewing the right record.',
  authPhotoPreviewA11y: 'Your profile picture',
  authTakePhoto: 'Take photo',
  authUpload: 'Upload',
  authPhotoDenied: 'CYPHIX has no access to the camera or your photos. You can allow it in the phone’s settings, or pick a colour below instead.',
  authAvatarColour: 'Or pick an avatar colour',
  authAvatarColourN: 'Avatar colour {n}',

  /* ── Review ── */
  authReviewKicker: 'Review',
  authReviewTitle: 'Check your details',
  authReviewComplete: 'Everything is filled in. You can change any of it later in Settings.',
  authReviewGaps: 'You skipped {list}. You can add it any time in Settings.',
  authConfirm: 'Confirm and finish',
  authEdit: 'Edit',
  authAdd: 'Add',
  authSkipped: 'Skipped',
  authNotSet: 'Not set',
  authDataNote: 'Your health data stays on this device and is shared only with clinicians you authorise.',
  authSumName: 'Name',
  authSumPhone: 'Phone',
  authSumSex: 'Sex',
  authSumHeight: 'Height',
  authSumWeight: 'Weight',
  authSumBlood: 'Blood type',
  authSumEmergency: 'Emergency contact',

  /* ── Done ── */
  authSuccessTitle: 'Profile created',
  authSuccessSub: 'Pair your CYPHIX device to record your first limb-lead ECG.',
  authPairDevice: 'Pair my device',
  authLater: 'Later',

  /* ── Failures, by stable code (never a raw server string) ── */
  authErrEmailTaken: 'That address already has an account.',
  authErrInvalidCredentials: 'That email and password do not match an account.',
  authErrWeakPassword: 'That password is too short.',
  authErrNetwork: 'No connection. Check your network and try again.',
  authErrUnknown: 'Something went wrong. Please try again.',
  authErrWrongCode: 'That code does not match. Check it and try again.',

  /* ══════════════════════════════════════════════════════════════════
     SCREENING (the Interpretation tab).

     ★ THE COPY RULE FOR THIS BLOCK, and it is different from the rest of
     the app: SHORT SENTENCES, NO JARGON WITHOUT A TRANSLATION, AND NEVER
     A SENTENCE THAT NEEDS A SECOND READING. Someone opens this screen to
     answer one question — "am I fine, or do I need to do something?" — and
     they may be frightened while reading it. Every line here is either the
     answer or a fact supporting it. Nothing is here to sound thorough.

     Each finding has exactly two strings: `scrF_*` is WHAT IT IS (a name a
     doctor would recognise), `scrM_*` is WHAT IT MEANS (one line, plain).
     The `evidence` numbers come from the engine and are not translated —
     PR, QTc and mV are the same symbols in every language.
     ══════════════════════════════════════════════════════════════════ */

  reportTabScreening: 'Interpretation',

  /* ── The verdict. One line each: the answer, then the action. ── */
  scrLevelClear: 'No abnormal finding',
  scrActClear: 'Nothing here needs action.',
  scrLevelAttention: 'Worth showing a doctor',
  scrActAttention: 'Not urgent. Bring this to your next visit.',
  scrLevelUrgent: 'Get medical help now',
  scrActUrgent: 'Call emergency services or go to an emergency room.',
  scrLevelInconclusive: 'Could not be read',
  scrActInconclusive: 'The signal was too noisy to screen. Measure again.',

  /* ── Sections ── */
  scrFindingsTitle: 'What was found',
  scrBlindTitle: 'What this test cannot see',
  scrStatsTitle: 'The numbers',
  scrEvidenceTitle: 'Measured',
  scrChecksLine: '{done} of {total} checks ran',
  scrDisclaimer:
    'This is a screening result, not a diagnosis. Only a doctor can diagnose a heart condition.',

  /* ── A simulated recording is not screened at all (CLAUDE.md §4). ── */
  scrSimTitle: 'Demo signal',
  scrSimBody:
    'This recording came from the built-in simulator, not from a heart. It is not screened.',

  /* ── Confidence. Deliberately three plain words rather than a
        percentage: a number invites arithmetic nobody can do here. ── */
  scrConfHigh: 'Clear',
  scrConfModerate: 'Likely',
  scrConfLimited: 'Possible',

  /* ── Categories ── */
  scrCatRate: 'Rate',
  scrCatRhythm: 'Rhythm',
  scrCatConduction: 'Conduction',
  scrCatRepolarisation: 'Recovery',
  scrCatAxis: 'Direction',
  scrCatChamber: 'Chambers',
  scrCatIschaemia: 'Blood supply',
  scrCatOther: 'Other',
  scrCatTechnical: 'Recording',

  /* ── Blind spots ── */
  scrBlindAnteriorSeptal: 'The front wall of the heart — that needs chest electrodes.',
  scrBlindPosterior: 'The back wall — that needs extra electrodes.',
  scrBlindChamberPrecordial: 'Full chamber sizing — chest electrodes measure that.',
  scrBlindParoxysmal: 'Anything that comes and goes. Ten seconds is a snapshot.',
  scrBlindSingleTimepoint: 'Change over time. One recording is not a trend.',

  /* ── Statistics ── */
  scrStatChecks: 'Checks run',
  scrStatBeats: 'Beats analysed',
  scrStatEctopy: 'Extra beats',
  scrStatQuality: 'Signal quality',
  scrStatRate: 'Heart rate',
  scrStatDuration: 'Recorded',

  /* ── Findings: rate ── */
  scrF_bradycardiaSevere: 'Very slow heartbeat',
  scrM_bradycardiaSevere: 'Under 40 beats a minute.',
  scrF_bradycardia: 'Slow heartbeat',
  scrM_bradycardia: 'Common in athletes. It can also be a signal.',
  scrF_tachycardia: 'Fast heartbeat',
  scrM_tachycardia: 'Stress, caffeine, fever and movement all do this.',
  scrF_tachycardiaExtreme: 'Very fast heartbeat',
  scrM_tachycardiaExtreme: 'Above 150 at rest needs checking.',

  /* ── Findings: rhythm ── */
  scrF_atrialFibrillation: 'Atrial fibrillation pattern',
  scrM_atrialFibrillation: 'An irregular rhythm that raises stroke risk. It is treatable.',
  scrF_atrialFlutter: 'Atrial flutter pattern',
  scrM_atrialFlutter: 'A fast, organised rhythm in the upper chambers.',
  scrF_svt: 'Fast rhythm from above the ventricles',
  scrM_svt: 'It starts in the upper part of the heart.',
  scrF_wideComplexTachycardia: 'Fast rhythm with wide beats',
  scrM_wideComplexTachycardia: 'Treated as coming from the ventricles until a doctor rules that out.',
  scrF_ectopyFrequent: 'Frequent extra beats',
  scrM_ectopyFrequent: 'Many beats arrived early.',
  scrF_ectopyOccasional: 'A few extra beats',
  scrM_ectopyOccasional: 'Very common, and usually harmless.',
  scrF_irregularRhythm: 'Irregular rhythm',
  scrM_irregularRhythm: 'The gaps between beats varied.',
  scrF_pause: 'A pause between beats',
  scrM_pause: 'One gap was longer than 2 seconds.',
  scrF_pauseLong: 'A long pause between beats',
  scrM_pauseLong: 'One gap was longer than 3 seconds.',

  /* ── Findings: conduction ── */
  scrF_avBlock1: 'First-degree AV block',
  scrM_avBlock1: 'The signal takes longer than usual to reach the lower chambers.',
  scrF_avBlock1Marked: 'Marked first-degree AV block',
  scrM_avBlock1Marked: 'A long delay between the upper and lower chambers.',
  scrF_avBlock2Suspected: 'A beat may have been dropped',
  scrM_avBlock2Suspected: 'One beat looks missing from the sequence.',
  scrF_avBlockCompleteSuspected: 'Possible complete heart block',
  scrM_avBlockCompleteSuspected: 'Slow and regular, with the upper chambers out of step.',
  scrF_ivcd: 'Slightly wide beats',
  scrM_ivcd: 'The signal moves through the ventricles a little slowly.',
  scrF_bbbLeftPattern: 'Left bundle branch pattern',
  scrM_bbbLeftPattern: 'Confirming which branch is involved needs chest electrodes.',
  scrF_bbbRightPattern: 'Right bundle branch pattern',
  scrM_bbbRightPattern: 'Confirming which branch is involved needs chest electrodes.',
  scrF_bbbIndeterminate: 'Wide beats',
  scrM_bbbIndeterminate: 'Wide, without a clear left or right pattern.',
  scrF_lafb: 'Left anterior fascicular block',
  scrM_lafb: 'A small conduction branch is blocked. Often harmless on its own.',
  scrF_lpfb: 'Left posterior fascicular block',
  scrM_lpfb: 'Uncommon. A doctor should confirm it.',

  /* ── Findings: recovery ── */
  scrF_qtLong: 'Long QT interval',
  scrM_qtLong: 'The heart takes longer than usual to reset. Some medicines cause this.',
  scrF_qtLongSevere: 'Very long QT interval',
  scrM_qtLongSevere: 'This raises the risk of a dangerous rhythm.',
  scrF_qtShort: 'Short QT interval',
  scrM_qtShort: 'Uncommon. Worth a doctor looking at it.',
  scrF_tInversionInferior: 'Inverted T waves, lower leads',
  scrM_tInversionInferior: 'Can be old, positional, or new. A doctor tells them apart.',
  scrF_tInversionLateral: 'Inverted T waves, side leads',
  scrM_tInversionLateral: 'Can be old, positional, or new. A doctor tells them apart.',

  /* ── Findings: direction ── */
  scrF_axisLeft: 'Left-leaning signal direction',
  scrM_axisLeft: 'The direction the signal travels. Often perfectly normal.',
  scrF_axisRight: 'Right-leaning signal direction',
  scrM_axisRight: 'The direction the signal travels. Often perfectly normal.',
  scrF_axisExtreme: 'Unusual signal direction',
  scrM_axisExtreme: 'Outside the usual range.',

  /* ── Findings: chambers ── */
  scrF_lvhVoltage: 'Thickened heart muscle pattern',
  scrM_lvhVoltage: 'The voltage suggests it. An ultrasound scan is what confirms it.',
  scrF_raEnlargement: 'Enlarged upper-right chamber pattern',
  scrM_raEnlargement: 'The P wave is taller than usual.',

  /* ── Findings: blood supply ── */
  scrF_stElevationInferior: 'ST elevation, lower wall',
  scrM_stElevationInferior: 'This pattern can mean a heart attack is happening.',
  scrF_stElevationLateral: 'ST elevation, side wall',
  scrM_stElevationLateral: 'This pattern can mean a heart attack is happening.',
  scrF_stDepressionInferior: 'ST depression, lower wall',
  scrM_stDepressionInferior: 'Can mean part of the muscle is short of blood.',
  scrF_stDepressionLateral: 'ST depression, side wall',
  scrM_stDepressionLateral: 'Can mean part of the muscle is short of blood.',
  scrF_qWavesInferior: 'Q waves, lower wall',
  scrM_qWavesInferior: 'Can be the scar of an old heart attack.',
  scrF_qWavesLateral: 'Q waves, side wall',
  scrM_qWavesLateral: 'Can be the scar of an old heart attack.',

  /* ── Findings: other ── */
  scrF_hyperkalaemiaPattern: 'Peaked T waves',
  scrM_hyperkalaemiaPattern: 'Sometimes high potassium in the blood. A blood test answers it.',
  scrF_lowVoltage: 'Low voltage',
  scrM_lowVoltage: 'Small signals in every lead. There are several causes.',
  scrF_electricalAlternans: 'Beat size alternating',
  scrM_electricalAlternans: 'Beat height swings up and down, every other beat.',

  /* ── Findings: recording ── */
  scrF_leadReversal: 'The electrodes may be swapped',
  scrM_leadReversal: 'Check the arm electrodes and measure again. Rarely, it is the heart’s position.',

  /* ══════════════════════════════════════════════════════════════════
     THE EXPLAIN SHEET — "why is this yellow?"

     ★ THE COPY RULE HERE IS STRICTER THAN ANYWHERE ELSE IN THE APP, and it
     comes from a real reaction to the first version: *"I look at this and I
     have no idea what you are talking about. As a healthy person I see it
     and I get stressed."* That is the brief. Every `scrCause_*` line below
     is written for someone with no medical training who is frightened:

       · no term is used without being said in ordinary words first
       · the ORDINARY explanation comes before the serious one, because it
         is also the likelier one and reading it first is what stops panic
       · nothing is softened into meaninglessness — "this can mean a heart
         attack is happening" stays, because it is true and the whole point
         of the screen is that the reader acts on it
     ══════════════════════════════════════════════════════════════════ */

  scrWhyButton: 'Why?',
  scrWhyTitle: 'Why this was flagged',
  scrWhyMeasured: 'What we measured',
  scrWhyYours: 'Yours',
  scrWhyNormal: 'Typical',
  scrWhyMeaning: 'What it means',
  scrWhyCause: 'Why this happens',
  scrWhyEvidence: 'From your recording',
  scrWhySource: 'Criterion',
  scrWhyBorderline: 'Only just past the line — this did not change your result.',
  scrClose: 'Close',

  /* Which part of the beat the rule looked at. Eight strings rather than 43:
     the rule declares its `focus` and the sheet reads it, so a new rule
     inherits the right sentence without anyone writing one. */
  scrFocus_p: 'The small bump before each beat — the top chambers firing.',
  scrFocus_pr: 'The gap between the small bump and the big spike — how long the signal takes to travel down.',
  scrFocus_qrs: 'The big spike — the main pumping chambers firing.',
  scrFocus_st: 'The flat stretch just after the big spike — where a blood-supply problem shows.',
  scrFocus_t: 'The rounded wave after the spike — the heart resetting.',
  scrFocus_qt: 'From the spike to the end of the rounded wave — the full fire-and-reset cycle.',
  scrFocus_rhythm: 'The spacing between beats across the whole recording.',
  scrFocus_none: 'How the recording itself was taken.',

  /* ── Why it happens, in plain words ── */
  scrCause_bradycardiaSevere: 'Your heart beat fewer than 40 times a minute. Very fit people run slow, but this is slower than fitness explains — it can also be the heart\u2019s own pacemaker tiring, or a medicine slowing it too much.',
  scrCause_bradycardia: 'A slow resting heart is normal in athletes and during sleep — a strong heart moves more blood per beat, so it needs fewer. It can also come from beta-blockers or an underactive thyroid, which is why it is worth a mention.',
  scrCause_tachycardia: 'A fast heart at rest is almost always a response to something rather than a problem in itself: stress, caffeine, pain, fever, dehydration, or simply having moved just before measuring.',
  scrCause_tachycardiaExtreme: 'Above 150 beats a minute at rest, the heart is usually not just responding to something — an electrical short-circuit is often driving it. It also gets less time to refill between beats.',
  scrCause_atrialFibrillation: 'The top chambers stopped beating in an organised way and started quivering, so the bottom chambers get a random stream of signals instead of a steady one. Blood pools where it should be pushed, which is why this raises stroke risk. It is common, and there is good treatment.',
  scrCause_atrialFlutter: 'The signal in the top chambers is circling a loop instead of travelling once and stopping. The loop runs very fast, and a gate lower down passes only every second beat through — which is why the pulse comes out fast but very regular.',
  scrCause_svt: 'A fast, regular rhythm starting above the main pumping chambers, usually from a signal that found a short-cut and is going round in a circle. It often starts and stops abruptly, and it is very treatable.',
  scrCause_wideComplexTachycardia: 'The beats are both fast and unusually broad, which is what happens when the signal starts in the main pumping chambers instead of travelling down the normal wiring. This is the pattern doctors treat first and ask questions about afterwards.',
  scrCause_ectopyFrequent: 'Extra beats fired early, ahead of the next scheduled one. Nearly everyone has some. What makes these worth a mention is how many there were — a high number over a long time can gradually tire the heart out.',
  scrCause_ectopyOccasional: 'A beat or two arrived early. This is one of the commonest things on any ECG, most people have it, and it is what you feel as a skip or a thud. On its own it means nothing.',
  scrCause_irregularRhythm: 'The gaps between your beats were uneven. The usual reason is completely normal: the heart speeds up slightly as you breathe in and slows as you breathe out. It is most obvious in young and fit people and is a sign of a healthy nervous system.',
  scrCause_pause: 'There was a gap of more than two seconds between beats. Short pauses happen in sleep and in very fit people. Longer or repeated ones can mean the heart\u2019s own pacemaker is skipping.',
  scrCause_pauseLong: 'Your heart went more than three seconds without a beat. A gap that long can make someone feel faint or actually black out, which is why it needs looking at rather than watching.',
  scrCause_avBlock1: 'The signal from the top chambers to the bottom ones is taking longer than usual to get through — like a slightly slow relay. Every beat still arrives. It is common with age, in athletes, and with some medicines.',
  scrCause_avBlock1Marked: 'The delay between the top and bottom chambers is long enough that the two are no longer working in step, which can cost the heart some of its efficiency. Still every beat arrives — it just arrives late.',
  scrCause_avBlock2Suspected: 'One beat looks like it went missing: the top chambers fired, and the signal did not make it through to the bottom ones that time. Sometimes harmless, sometimes the beginning of something that needs a pacemaker — telling those apart needs a longer recording.',
  scrCause_avBlockCompleteSuspected: 'The top and bottom chambers appear to have stopped talking to each other, so the bottom ones are beating on their own backup rhythm. Backups are slow and not fully reliable, which is why this needs seeing rather than watching.',
  scrCause_ivcd: 'The signal is taking slightly longer than usual to spread through the main pumping chambers. It is a small delay — not enough to name a specific blocked pathway, but enough to note.',
  scrCause_bbbLeftPattern: 'One of the two main electrical cables into the pumping chambers looks blocked, so the signal has to go the long way round and the beat comes out wide. Confirming which cable needs chest electrodes this test does not have.',
  scrCause_bbbRightPattern: 'One of the two main electrical cables into the pumping chambers looks blocked, so one side finishes late and the beat comes out wide. The right-sided version is often found in healthy people. Confirming it needs chest electrodes.',
  scrCause_bbbIndeterminate: 'The beats are wider than normal, so the signal is taking a detour somewhere — but the shape does not clearly say which side. A full ECG with chest electrodes would.',
  scrCause_lafb: 'One of the small branches of the heart\u2019s wiring is not conducting, so the signal reaches part of the muscle by a slightly longer route. This changes the direction of the beat without changing the heart itself, and on its own it is often harmless.',
  scrCause_lpfb: 'A small branch of the heart\u2019s wiring appears not to be conducting. This one is uncommon, and the same picture is produced much more often by an ordinary thin build or by the right side of the heart working hard — which is why a doctor should confirm it rather than the app.',
  scrCause_qtLong: 'After each beat the heart takes a moment to reset before it can beat again, and yours is taking longer than usual. The commonest reason by far is a medicine — many ordinary ones do it, including some antibiotics and antidepressants. Low potassium or magnesium can too.',
  scrCause_qtLongSevere: 'The reset time after each beat is very long. That matters because during the reset the heart is vulnerable, and a long enough window lets a dangerous rhythm start. Medicines are the commonest cause, and stopping the right one usually fixes it — which is why this is worth acting on today.',
  scrCause_qtShort: 'The heart is resetting faster than usual after each beat. Uncommon. It can come from too much calcium in the blood or from certain medicines, both of which a blood test settles quickly.',
  scrCause_tInversionInferior: 'The wave where the heart resets is pointing downwards in the leads that look at the bottom of the heart. This can be old, it can be down to your build or your position, and it can be new — the only way to tell is to compare with a previous recording, which is a doctor\u2019s job.',
  scrCause_tInversionLateral: 'The reset wave is pointing downwards in the leads that look at the side of the heart. As with any T-wave change, whether it matters depends almost entirely on whether it is new — which needs an older ECG to compare against.',
  scrCause_axisLeft: 'This describes the overall direction the electrical signal travels through your heart, not a problem with it. It leans left in a lot of perfectly healthy people, and does so more with age and with a fuller build.',
  scrCause_axisRight: 'This is the overall direction the signal travels through your heart. Leaning right is normal in tall, thin, young people and in children. When it means something, it usually means the right side of the heart is working harder than it should.',
  scrCause_axisExtreme: 'The signal is travelling in an unusual direction — up and to the right. The commonest reason by far is that the arm electrodes were swapped, so it is worth simply measuring again before reading anything into it.',
  scrCause_lvhVoltage: 'The electrical signal from the main pumping chamber is larger than usual, which can mean its muscle wall has thickened — usually from years of higher blood pressure. But a slim chest also makes signals look big, so this test cannot tell those apart. An ultrasound scan of the heart can, easily.',
  scrCause_raEnlargement: 'The bump at the start of each beat is taller than usual, which is what the top-right chamber produces when it is enlarged or working against pressure. It usually points at the lungs rather than the heart.',
  scrCause_stElevationInferior: 'The flat stretch after each beat is lifted in the leads that look at the bottom of the heart. This is the pattern of an artery being blocked right now, with muscle starting to die. It can also be caused by other, harmless things — but it is not something to wait out, because if it is the serious one, every minute counts.',
  scrCause_stElevationLateral: 'The flat stretch after each beat is lifted in the leads looking at the side of the heart, which can mean an artery there is blocked right now. There are harmless causes too, but this is not a pattern to wait out.',
  scrCause_stDepressionInferior: 'The flat stretch after each beat is pushed down, which is what muscle does when it is not getting as much blood as it is asking for. It often shows up during exertion and settles with rest.',
  scrCause_stDepressionLateral: 'The flat stretch after each beat is pushed down in the leads looking at the side of the heart — the pattern of muscle asking for more blood than it is getting.',
  scrCause_qWavesInferior: 'There is a downward notch at the start of the beat in the leads that look at the bottom of the heart. Dead muscle does not carry electricity, so the lead facing it records the wall opposite instead — that notch can be the scar of a heart attack, possibly one that was never noticed at the time. It is also a normal shape in some people.',
  scrCause_qWavesLateral: 'There is a downward notch at the start of the beat in the leads looking at the side of the heart. It can be the scar of an old heart attack, and it can be an ordinary variation in shape.',
  scrCause_hyperkalaemiaPattern: 'The reset wave after each beat is tall and pointed rather than rounded. The classic reason is too much potassium in the blood, which happens with kidney problems and with some blood-pressure medicines. A single blood test answers it.',
  scrCause_lowVoltage: 'All six views of your heart recorded a smaller signal than usual. The commonest reasons are about what sits between your heart and the sensors rather than the heart itself — body build, lung air, or in some cases fluid around the heart. How the device is worn also affects it, so a repeat measurement is worthwhile.',
  scrCause_electricalAlternans: 'The size of your beats alternated — big, small, big, small. That pattern is produced by the heart physically swinging with each beat, which happens when it is surrounded by fluid. It is uncommon and it is checked with an ultrasound scan.',
  scrCause_leadReversal: 'One view of your heart came out upside down. Almost always this means the sensors on the left and right arms were the wrong way round — a two-second fix. Very rarely it means the heart sits on the other side of the chest, which is harmless in itself but worth knowing.',

  /* ══════════════════════════════════════════════════════════════════
     THE PRINTED REPORT.

     This copy is written for a CLINICIAN, not for the patient — it is the
     one artefact that gets filed, emailed and read by someone who was not
     in the room. So it names things properly (the app says "the big spike",
     the report says QRS), and every threshold on it is printed beside its
     published source, because a doctor handed an automated finding is
     entitled to know which criterion produced it.
     ══════════════════════════════════════════════════════════════════ */

  pdfPageEcg: '6-Lead Limb ECG',
  pdfPageInterpretation: 'Automated Interpretation',
  pdfPageStatistics: 'Measurements & Statistics',
  pdfPageReference: 'How to Read This Report',
  pdfPageOf: 'Page {n} of {total}',
  pdfContinued: 'continued',
  pdfPatient: 'Patient',
  pdfCriterion: 'Criterion',
  pdfBorderline: 'borderline',
  pdfNoFindings: 'No abnormal pattern was detected in what these six leads can observe. Read this together with the limitations on the last page.',
  pdfEvidenceTitle: 'Measured',
  pdfConfidenceTitle: 'Confidence',
  pdfStatsVariability: 'Axis and beat-to-beat variability',
  mRrVariation: 'RR variation',

  pdfAxisCap: 'Frontal-plane QRS axis. Shaded sector is the normal range, −30° to +90°.',
  pdfPoincareCap: 'Poincaré plot: each RR interval against the next. A tight ball is a regular rhythm; a diffuse fan is what an irregular one makes.',
  pdfTachogramCap: 'RR intervals in order of occurrence, against the mean. Shows where in the recording the variation happened.',

  pdfLeadMapTitle: 'What these six leads look at',
  pdfLeadMapCap: 'Leads I, II and III are the three sides of Einthoven’s triangle, formed by the electrodes on the two arms and the left leg. aVR, aVL and aVF are derived from the same two measured channels. Together they view the heart in the frontal plane only.',
  pdfWallInferior: 'the bottom (inferior) wall',
  pdfWallLateral: 'the side (high lateral) wall',
  pdfWallNotSeen: 'the front and back walls — chest electrodes, NOT recorded here',
  pdfHowToTitle: 'How to read the ECG sheet',
  pdfHow1: 'Paper speed 25 mm/s and gain 10 mm/mV. One small square is 40 ms wide and 0.1 mV tall; one large square is 200 ms and 0.5 mV.',
  pdfHow2: 'The step at the left of every lead is a 1 mV calibration pulse. It should stand exactly two large squares tall — if it does not, the gain on this sheet is not what the label says.',
  pdfHow3: 'The short marks along the top of lead II are the detected R peaks. Every rate and interval on the following pages was computed from those detections.',
  pdfHow4: 'A recording longer than about 7 seconds continues on the next sheet, consecutive in time. Nothing is truncated.',

  pdfSheetWindow: '{from}\u2013{to} s shown of {total} s recorded',
  pdfAuditTitle: 'Every check that was made',
  pdfAuditNote: '\u25CF present \u00B7 \u2013 ruled out \u00B7 ? could not be evaluated. A ruled-out check means the pattern was looked for on these six leads and was not there; it does not exclude conditions these leads cannot see (last page).',
  pdfMedianBeatTitle: 'Representative beat',
  pdfMedianBeatCap: 'median of {used} beats, {rejected} rejected',

  pdfColMeasure: 'Measurement',
  pdfColResult: 'Result',
  pdfColRef: 'Reference',

  /* ── Shared ── */
  back: 'Back',
  exit: 'Exit',
} as const;

/** Every key the app may ask for. `he.ts` is typed against this. */
export type TranslationKey = keyof typeof en;

// v1.20.0 — Copy for the study readout ("usually 128") and the weekly goal.
//           The three-line explainer's strings and the facts captions are gone
//           with the blocks they served.
// v1.19.0 — Copy for comparing a strip against the patient's own typical beat:
//           the picker row, the status line, and the two sentences the ghost's
//           construction makes necessary — it borrows this recording's timing
//           (so compare shape, never measure an interval off it), and at a fast
//           rate each drawn beat is cut short.
// v1.18.0 — The patient's half of Insights: the plain-language verdicts, the
//           three recognisable figures, the three-line explainer, and the
//           per-study sentence that goes ABOVE the chips. Two rules the wording
//           holds to — it never grades, and it never implies an absolute
//           yardstick, because the sentence is chosen against the patient's own
//           spread and copy suggesting otherwise would describe a computation
//           that does not happen.
// v1.17.0 — The two alert strings are gone with the banner they served; it was
//           reporting "the same difference on 26 studies in a row", i.e. since
//           the beginning. The rest of the ECG ID v2 copy stands.
// v1.16.0 — ECG ID v2 copy: the effective study count, the two alert states
//           (one study is "look at this", the same difference twice is worth
//           showing a doctor), the drift section, and the line stating that a
//           study's electrode geometry was corrected for the SHAPE match and
//           deliberately not for the axis and amplitude figures.
// v1.15.0 — Copy for the app lock and the connection strip. "Offline · showing
//           saved data" rather than "no internet": what the patient needs to
//           know is what is on their screen, not what the radio is doing.
// v1.14.0 — The Insights tab (ECG ID). The copy rules for the block are written
//           INTO the block, because it is the one place in this app where a
//           careless adjective turns a measurement into a diagnosis.
// v1.3.0 — Carries the whole signed-out flow: splash, welcome, sign-in,
//          reset, registration, the six health steps, review and success —
//          plus the failure codes, each mapped to one honest sentence.
// v1.10.0 — profileLoadFailed: a card that did not load must say so, or empty
//           sections read as "you have no conditions and no allergies".
// v1.13.0 — Tests-tab picker copy, taken verbatim from the web locale wherever
//           the two apps say the same sentence. `testsEmptyTitle`/`Body` are
//           GONE: the tab is no longer a results list (History is), so a key
//           saying "no tests yet" had nothing left to describe.
// v1.12.0 — setAboutMaterial: the label for the resolved-glass diagnostic. Its
//           VALUE stays English, like the build label — a bug report should
//           quote the same string the changelog does.
// v1.11.0 — Profile-photo sheet copy. The sheet says the picture is saved to
//           your record, because that is a different decision from a device.
// v1.3.0 — The SCREENING block: 43 findings x (name + plain meaning), the four
//          verdict levels with their action lines, confidence words, category
//          names, the blind spots and the disclaimer. Its copy rule is stricter
//          than the rest of the file and is written at the top of the block:
//          this is the screen someone reads while frightened.
// v1.2.0 — English locale: the canonical key set for the mobile app. Carries
//          the comparison sheet’s copy — the legend and the sentence saying
//          what the grey trace is. The nudge-pad wording is gone with the pad.
