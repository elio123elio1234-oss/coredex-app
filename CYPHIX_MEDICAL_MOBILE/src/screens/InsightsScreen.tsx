/* ==================================================================
   InsightsScreen — the ECG ID, promoted to a tab of its own.

   ══ WHERE THIS CAME FROM ══
   Until v0.59.0 this panel lived behind a segmented control inside
   History (`Studies | Insights`), and the dock's second slot was "My
   Tests" — the test-choice carousel. At the user's instruction the two
   swapped: the carousel is no longer reachable from the dock (a patient
   starts a test from the HOME button, which is the one control that has
   always started one), and the dock slot now opens this. History is a
   list of studies again, with no sub-tab.

   The panel itself is UNCHANGED — `EcgIdentityPanel` is the same organism
   History mounted, with the same props. What this screen adds is the
   chrome History used to lend it: a frosted title bar the content passes
   under, the side padding the shell no longer applies, and the dock's
   footprint on the scroll content rather than on the content box.

   ★ `active` is hard-wired TRUE here, and that is now correct rather than
   sloppy. Inside History the panel outlived its own tab — it was hidden,
   not unmounted, so its builder and caliper could still buzz into the
   studies list. A tab screen is unmounted by the navigator when you leave
   it, so there is no hidden-but-alive state to defend against.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlassSurface, { IS_LIQUID_GLASS } from '@/components/atoms/GlassSurface';
import EcgIdentityPanel from '@/components/organisms/EcgIdentityPanel';
import PatientShell, { shellPaddingH } from '@/components/templates/PatientShell';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { useTranslation } from '@/i18n/useTranslation';
import { useIsDark, useTheme } from '@/theme/useTheme';

/** The glass bar's own bottom padding, added back when measuring it. */
const HEADER_PAD_BOTTOM = 12;
/** Points of scroll before the header earns its edge — below this there is
    nothing behind it and a hairline would divide nothing from nothing. */
const HEADER_SHADOW_AT = 6;
/** Air between the glass and the first block, at rest. */
const CONTENT_TOP_GAP = 14;
/** The first frame paints before `onLayout` has run; this covers it. The
    bar here is one title line, so the estimate lands within a point. */
const EST_TITLE = 36;

export default function InsightsScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const { t: tr, rtl } = useTranslation();
  const navigation = useNavigation<{ navigate: (screen: string, params: object) => void }>();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const { can } = usePermissions();

  const [measuredHeaderH, setMeasuredHeaderH] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  /* Only re-render when the header actually crosses the threshold. */
  const onContentScroll = useCallback((offsetY: number) => {
    const past = offsetY > HEADER_SHADOW_AT;
    setScrolled((was) => (was === past ? was : past));
  }, []);

  /* A patient sees only their own baseline — the same scope History's list
     is fetched with, so the two screens can never describe different people. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;

  const align = rtl ? ('right' as const) : ('left' as const);
  const padH = shellPaddingH(insets);
  const headerH = measuredHeaderH || insets.top + 6 + EST_TITLE + HEADER_PAD_BOTTOM;

  /* Same split History and the dock make: Liquid Glass tints itself a
     little, so it takes the lower pair. */
  const headerTint = IS_LIQUID_GLASS
    ? dark
      ? 'rgba(19, 27, 44, 0.46)'
      : 'rgba(255, 255, 255, 0.50)'
    : dark
      ? 'rgba(19, 27, 44, 0.58)'
      : 'rgba(255, 255, 255, 0.64)';

  const openStudy = useCallback(
    (id: string) => navigation.navigate('StudyViewer', { id }),
    [navigation],
  );

  return (
    /* The same three shell concessions History makes, for the same three
       reasons: the signature reaches the screen edge (`bleedHorizontal`),
       the page travels under the glass (`bleedTop`), and the dock has
       something to refract (`scrollsUnderDock`). */
    <PatientShell scrollsUnderDock bleedHorizontal bleedTop>
      <View style={styles.root}>
        <EcgIdentityPanel
          patientId={subject}
          paddingHorizontal={padH}
          paddingTop={headerH + CONTENT_TOP_GAP}
          onScroll={onContentScroll}
          onOpenStudy={openStudy}
        />

        {/* Drawn LAST so it sits above the panel without a zIndex argument. */}
        <GlassSurface
          dark={dark}
          tint={headerTint}
          style={[
            styles.header,
            {
              paddingTop: insets.top + 6,
              paddingLeft: Math.max(insets.left, 0),
              paddingRight: Math.max(insets.right, 0),
              borderBottomColor: scrolled ? t.border : 'transparent',
            },
          ]}
        >
          <View
            onLayout={(e) => {
              /* The measured View is INSIDE the glass, so the bar's own
                 padding has to be added back — without it the first block
                 sits under the title. */
              const h = e.nativeEvent.layout.height + insets.top + 6 + HEADER_PAD_BOTTOM;
              setMeasuredHeaderH((prev) => (Math.abs(prev - h) < 0.5 ? prev : h));
            }}
          >
            <View style={{ paddingHorizontal: padH }}>
              <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
                {tr('insTabInsights')}
              </Text>
            </View>
          </View>
        </GlassSurface>
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
});

// v0.59.0 — The ECG ID panel, promoted out of History's sub-tab into the
//           dock slot that used to be "My Tests". Owns the frosted title bar
//           History used to lend it; the panel itself is untouched.
