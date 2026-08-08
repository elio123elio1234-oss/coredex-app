/* ==================================================================
   BootSplash (organism) — the first thing anyone sees: the CYPHIX
   wordmark on a white page, exactly as the web app's session-restore
   splash does it.

   It is shown while the device is checked for a stored session, and for a
   moment longer so it does not flicker: a splash that appears and
   vanishes reads as a fault.

   ══ WHY IT MATCHES THE WEB, AND WHICH WEB SCREEN ══
   The web has TWO branded loading surfaces and they are not
   interchangeable:

     • `LoadingScreen` — drifting blobs and an orbiting spinner behind the
       full lockup. The showy one.
     • `AuthGate`'s restore splash — `CyphixWordmark` on the page
       background with a small busy ring, and nothing else.

   This is the second one, at the user's instruction. It is also the right
   one for the job: this screen exists because a disk read is in flight,
   which is a fraction of a second and is not an occasion. Reserving the
   theatrical version for somewhere it is earned keeps it meaning
   something.

   ══ THE WORDMARK, NOT THE LOCKUP ══
   `CyphixWordmark` is the lettering alone. `BrandLogo` adds the mark and
   "MEDICAL" underneath, which is the full identification — right on a
   report, where the issuer of a clinical document must be unambiguous,
   and heavy on a screen that is up for 1.7 seconds while the app finds
   out who is signed in.

   ── Two earlier versions, so this is not re-litigated a third time ──
   v0.19.3 went white with a mark-only lockup and was reverted to navy.
   That revert is not evidence against white: the objection was the
   cropped MARK, not the background. This keeps the white and uses the
   WORDMARK, which is the thing the web actually shows.

   The version is printed at the bottom deliberately — it is the one
   screen everybody reaches, so "is my build actually on the phone?" is
   answered without opening Settings. With updates arriving over the air
   several times a day, that line is the fastest honest answer there is.
   ================================================================== */

import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import CyphixWordmark from '@/components/atoms/CyphixWordmark';
import { APP_VERSION } from '@/config/version';
import { authPalette } from '@/theme/authTheme';

/** `.auth-wordmark { width: min(58vw, 240px) }` — the web's own rule. */
const WIDTH_RATIO = 0.58;
const MAX_WIDTH = 240;

export default function BootSplash() {
  /* The signed-out world is white in both themes (`authTheme`), and this
     screen belongs to it — it is shown before the app knows whose theme
     to honour, so it must not depend on knowing. */
  const palette = authPalette(false);
  const { width } = useWindowDimensions();

  return (
    <View style={[styles.root, { backgroundColor: palette.page }]}>
      {/* ★ DARK glyphs. The clock and the battery were light for a navy
          screen; on white that is a status bar you cannot read, and it is
          the kind of thing a bundle and a typecheck both wave through. */}
      <StatusBar style="dark" />

      <CyphixWordmark width={Math.min(width * WIDTH_RATIO, MAX_WIDTH)} />

      {/* The web's `.auth-spin--lg` under the wordmark: a busy ring, not a
          performance. It says "working", which is the only thing this
          screen has to say. */}
      <ActivityIndicator size="small" color={palette.navy} style={styles.spinner} />

      {/* `label`, not `muted`: on navy the version sat on `onNavyFaint` and
          read fine, but `muted` (#B3BCC9) faded at 75 % on WHITE is about
          #C6CDD6 — a line that is present in the render tree and not on
          the screen. A version nobody can read answers nothing. */}
      <Text style={[styles.version, { color: palette.label }]} allowFontScaling={false}>
        {`v${APP_VERSION}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  /* `.auth-splash { gap: 30px }`. */
  spinner: { marginTop: 30 },
  version: { position: 'absolute', bottom: 40, fontSize: 10, letterSpacing: 0.6 },
});

// v2.0.0 — White page + the CYPHIX WORDMARK, matching the web's session-restore
//          splash (`AuthGate`), not its blob-and-orbit `LoadingScreen`. Drops
//          the navy field, the full lockup and the tagline; keeps the version
//          line, which is how anyone tells whether an OTA actually landed.
//          ⚠️ The status bar flipped to dark glyphs with it — light ones on a
//          white screen are invisible, and nothing in a build catches that.
// v1.4.0 — The lockup was really off-centre (the source viewBox is padded
//          asymmetrically): `crop` fixed that at the atom, width 90 % capped 520.
// v1.3.0 — Back to the navy screen and the full `BrandLogo` (v0.19.3's white
//          screen + mark-only lockup reverted).
