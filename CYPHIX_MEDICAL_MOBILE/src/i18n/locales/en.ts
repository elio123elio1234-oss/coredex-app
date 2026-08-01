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
  setAccountSignOut: 'Sign out',
  setAccountSignOutDesc: 'Available once accounts are connected to the server',

  setSecAbout: 'About',
  setSecAboutDesc: 'Version and compliance',
  setAboutVersion: 'App version',
  setAboutBuild: 'This build',
  setAboutCompliance: 'Compliance',
  setAboutComplianceValue: 'HIPAA · GDPR · Israeli Privacy Law',

  setComingSoon: 'Coming soon',

  /* ── History / Tests / Chat tabs ── */
  histTitle: 'Scan History',
  histEmptyTitle: 'No recordings yet',
  histEmptyBody:
    'Completed measurements sync here through the CYPHIX server, with the same waveform viewer and calipers as the web history view.',
  testsTitle: 'My Tests',
  testsEmptyTitle: 'No tests yet',
  testsEmptyBody: 'Finish a measurement from the home screen and it will appear here.',
  chatTitle: 'Chat',
  chatEmptyBody:
    'Messages with your care team will appear here, on the same thread you see on the web.',

  /* ── Shared ── */
  back: 'Back',
  exit: 'Exit',
} as const;

/** Every key the app may ask for. `he.ts` is typed against this. */
export type TranslationKey = keyof typeof en;

// v1.0.0 — English locale: the canonical key set for the mobile app.
