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
  setPrivacyOnDevice: 'On-device processing',
  setPrivacyOnDeviceDesc: 'Your ECG never leaves this device. There is no server today.',
  encryptionBadge: 'Secure On-Device Processing',
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
  /* ── Measurement reminders ──
     ★ Copy rule for this block: it says WHEN the patient asked to be
     reminded and never how often anyone should measure. No "recommended",
     no "you should", no streak language. How often to take an ECG is a
     clinical instruction and this app does not give those. */
  remTitle: 'Reminders',
  remSubtitle: 'Choose when CYPHIX should ask you to take a reading.',
  remSecWhen: 'Reminders',
  remSecWhenDesc: 'A notification at the times you choose, every day.',
  remSecTimes: 'Times',
  remSecTimesDesc: 'Tap a time to change it.',
  remEnable: 'Remind me to measure',
  remEnableDesc: 'The phone will notify you even when CYPHIX is closed.',
  remHowMany: 'How many times a day',
  remHowManyDesc: 'Pick a number and the times fill in — all of them editable.',
  remFootnote:
    'Reminders are a note to yourself. How often to take an ECG is a decision for you and your doctor.',
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

  insFlaggedTitle: 'Early studies that disagree',
  insFlaggedBody: 'The first studies shape the baseline most. Open these and check them.',

  insTimelineTitle: 'Match over time',
  insBaselineTitle: 'Your baseline',
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

  /* ── Shared ── */
  back: 'Back',
  exit: 'Exit',
} as const;

/** Every key the app may ask for. `he.ts` is typed against this. */
export type TranslationKey = keyof typeof en;

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
// v1.2.0 — English locale: the canonical key set for the mobile app. Carries
//          the comparison sheet’s copy — the legend and the sentence saying
//          what the grey trace is. The nudge-pad wording is gone with the pad.
