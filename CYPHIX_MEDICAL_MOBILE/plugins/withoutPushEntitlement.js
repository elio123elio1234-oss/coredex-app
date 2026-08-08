/* ==================================================================
   withoutPushEntitlement — this app does not send push notifications,
   so it must not claim the capability to.

   ══ WHY THIS FILE EXISTS ══
   `expo-notifications` adds `aps-environment` to the iOS entitlements
   unconditionally (`plugin/build/withNotificationsIOS.js`), and it is
   applied by AUTOLINKING — removing it from `app.json`'s `plugins` array
   does nothing, which is worth knowing before anyone tries that again.

   That entitlement is for REMOTE push. CYPHIX schedules LOCAL daily
   reminders through `UNUserNotificationCenter`, which needs no entitlement
   at all: nothing in this app ever calls `getExpoPushTokenAsync`, no
   device token is ever created, and no server can reach the phone.

   Carrying it anyway costs real things:
     • the App ID needs the Push Notifications capability enabled, and the
       provisioning profile must be reissued to match — which is exactly
       what failed the first 0.34.0 build ("Provisioning profile … doesn't
       support the Push Notifications capability");
     • App Store review can ask why a medical app declares a capability it
       never exercises, and "our notification library adds it" is a poor
       answer for a product whose whole argument is that it claims only
       what it does;
     • an entitlement list that does not describe the binary is a small
       lie in the one document that is supposed to be exhaustive.

   ══ HOW ══
   `withEntitlementsPlist` mods compose in registration order and the last
   one registered runs last, so this deletes the key after the library has
   set it. Deleting rather than blanking on purpose: the library's own
   guard is `if (!config.modResults['aps-environment'])`, so an empty
   string would simply be overwritten on the next run.

   ⚠️ If a future release genuinely needs remote push — a clinician
   messaging a patient, say — DELETE THIS PLUGIN rather than working
   around it, and let the capability be enabled honestly.
   ================================================================== */

const { withEntitlementsPlist } = require('expo/config-plugins');

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withoutPushEntitlement = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    delete cfg.modResults['aps-environment'];
    return cfg;
  });

module.exports = withoutPushEntitlement;

// v1.0.0 — Strips the push entitlement `expo-notifications` adds by autolinking.
//          This app schedules local reminders only and claims nothing else.
