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
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import CyphixWordmark from '@/components/atoms/CyphixWordmark';
import FailSoft from '@/components/atoms/FailSoft';
import ThinkingOrb from '@/components/atoms/ThinkingOrb';
import { APP_VERSION } from '@/config/version';
import { authPalette } from '@/theme/authTheme';

/** `.auth-wordmark { width: min(58vw, 240px) }` — the web's own rule. */
const WIDTH_RATIO = 0.58;
const MAX_WIDTH = 240;

/** Big enough to be the thing you are looking at, under a ≤240 pt wordmark. */
const ORB_SIZE = 104;

/**
 * Just enough that the orb arrives rather than appears.
 *
 * ⚠️ Short on purpose. v0.85.0 used 520 ms inside a splash whose MINIMUM
 * is 900 ms — so on a healthy launch the orb was still fading in when the
 * screen was already going away.
 */
const ENTER_MS = 260;

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

      {/* ★ THE ORB IS THE INDICATOR. From the first frame, every launch.
          `connecting` of the nine states, because that is literally what is
          happening: a constellation wiring itself.

          ⚠️ v0.85.0 put a 1.5 s threshold in front of this, on the
          reasoning quoted in the header — a disk read "is not an occasion",
          so the flourish should be reserved for a wait that earned it. The
          reasoning was fine and the number was fatal: `AuthGate`'s minimum
          splash is **900 ms**, so on a healthy launch the orb was never
          mounted at all. Reported as "I only see the old circle", and that
          is exactly what it was. Taste is not worth a feature that never
          runs; a loading indicator that only shows up when things go badly
          is not a loading indicator.

          Painted in the brand's ink on the brand's paper rather than the
          package's grey — `ThinkingOrb` maps the depth language onto the
          two colours, so nearest still reads darkest. */}
      <FailSoft
        label="boot orb"
        /* ★ And now the ring MEANS something. It was the default state and
           the failure state at once, which made a crashed orb and an
           unmounted one identical on screen — the thing that cost this
           round trip. With no threshold in front, the orb is always what
           should be here, so a ring is proof that `FailSoft` caught a
           throw, and Settings › About names it. */
        fallback={<ActivityIndicator size="small" color={palette.navy} style={styles.spinner} />}
      >
        <FadeUpView duration={ENTER_MS} distance={6} style={styles.spinner}>
          <ThinkingOrb
            state="connecting"
            size={ORB_SIZE}
            ink={palette.navy}
            paper={palette.page}
          />
        </FadeUpView>
      </FailSoft>

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
