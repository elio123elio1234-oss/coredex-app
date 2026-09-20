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
   History mounted, with the same props.

   ══ ★ v0.70.0 — THERE IS NO TOP BAR ══
   The title used to ride a frosted `GlassSurface` pinned to the top with
   the panel travelling underneath it. It is now the panel's first child
   and fades out as the page moves (`PageTitle`).

   What that deletes is worth listing, because it was all machinery in
   service of a bar that said one word:

     • the measured header height, the `EST_TITLE` estimate that covered
       the first frame before the measurement existed, and the `onLayout`
       that added the bar's own padding back by hand — three numbers that
       had to agree and no way of noticing when they did not;
     • the `scrolled` state and the hairline it switched on;
     • `HEADER_PAD_BOTTOM`, `HEADER_SHADOW_AT`, `CONTENT_TOP_GAP`, and the
       tint pair that had to be kept in step with History's and the dock's.

   The screen keeps `bleedTop`: the shell still must not add its own top
   padding, because the title now carries the safe area itself.

   ★ `active` is hard-wired TRUE here, and that is correct rather than
   sloppy. Inside History the panel outlived its own tab — it was hidden,
   not unmounted, so its builder and caliper could still buzz into the
   studies list. A tab screen is unmounted by the navigator when you leave
   it, so there is no hidden-but-alive state to defend against.
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSharedValue } from 'react-native-reanimated';
import PageTitle, { TITLE_FADE_DISTANCE } from '@/components/molecules/PageTitle';
import EcgIdentityPanel from '@/components/organisms/EcgIdentityPanel';
import PatientShell, { shellPaddingH } from '@/components/templates/PatientShell';
import { usePermissions, useCurrentUser } from '@/features/auth/useCurrentUser';
import { useTranslation } from '@/i18n/useTranslation';
import { useTheme } from '@/theme/useTheme';

export default function InsightsScreen() {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const navigation = useNavigation<{ navigate: (screen: string, params: object) => void }>();
  const insets = useSafeAreaInsets();
  const user = useCurrentUser();
  const { can } = usePermissions();

  /* The live offset the title fades against. A shared value rather than
     state: it is written on every scroll event and read on the UI thread,
     so putting it in React would re-render the whole panel per frame. */
  const scrollY = useSharedValue(0);
  /* The one thing that DOES need a re-render — and only twice per scroll,
     at the threshold. See `PageTitle`: a faded-out title must stop being a
     touch target, and pointer events are not an animatable property. */
  const [titleGone, setTitleGone] = useState(false);

  const onContentScroll = useCallback(
    (offsetY: number) => {
      scrollY.value = offsetY;
      const gone = offsetY >= TITLE_FADE_DISTANCE;
      setTitleGone((was) => (was === gone ? was : gone));
    },
    [scrollY],
  );

  /* A patient sees only their own baseline — the same scope History's list
     is fetched with, so the two screens can never describe different people. */
  const selfOnly = !can('history:read') && can('history:read:self');
  const subject = selfOnly ? (user?.linkedPatientId ?? 'MOCK-SELF') : undefined;

  const align = rtl ? ('right' as const) : ('left' as const);
  const padH = shellPaddingH(insets);

  const openStudy = useCallback(
    (id: string) => navigation.navigate('StudyViewer', { id }),
    [navigation],
  );

  return (
    /* The same shell concessions History makes, for the same reasons: the
       signature reaches the screen edge (`bleedHorizontal`), the title owns
       the safe area (`bleedTop`), and the dock has something to refract
       (`scrollsUnderDock`). */
    <PatientShell scrollsUnderDock bleedHorizontal bleedTop>
      <View style={styles.root}>
        <EcgIdentityPanel
          patientId={subject}
          paddingHorizontal={padH}
          /* 0: there is no floating bar to clear any more. The title is
             inside this scroller and carries the safe area itself. */
          paddingTop={0}
          header={
            <PageTitle
              title={tr('insTabInsights')}
              scrollY={scrollY}
              interactive={!titleGone}
              align={align}
              rtl={rtl}
              color={t.textPrimary}
              paddingTop={insets.top + 6}
              /* The panel's content container already carries `padH`. */
              paddingHorizontal={0}
              /* `styles.content` in the panel has `gap: 14`, which is the
                 air this block needs below it — a margin here would be a
                 second gap on top of it. */
              marginBottom={0}
            />
          }
          onScroll={onContentScroll}
          onOpenStudy={openStudy}
        />
      </View>
    </PatientShell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

// v0.70.0 — No top bar. The title is the panel's first child and fades out as
//           the page moves, taking the frosted bar, its measured height, its
//           first-frame estimate, its onLayout and its hairline state with it.
// v0.59.0 — The ECG ID panel, promoted out of History's sub-tab into the
//           dock slot that used to be "My Tests". Owns the frosted title bar
//           History used to lend it; the panel itself is untouched.
