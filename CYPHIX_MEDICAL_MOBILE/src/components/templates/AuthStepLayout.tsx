/* ==================================================================
   AuthStepLayout (template) — the frame every onboarding step is poured
   into: safe-area top, a 24 pt gutter, a body that takes the slack, and
   a footer pinned above the home indicator.

   ── The three things it exists to stop happening ──
   1. A primary button under the keyboard. Steps with a text field pass
      `keyboard`, and the layout lifts its footer instead of each step
      inventing its own answer.
   2. A primary button under the home indicator. The footer's bottom
      padding is `max(inset, 16)` — measured from the screen edge, never
      added to it (mobile CLAUDE.md §1).
   3. Content that cannot be reached on a small phone. Steps that can
      overflow pass `scroll`; the footer stays outside the scroll view so
      the way forward never scrolls away.
   ================================================================== */

import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AUTH_METRICS } from '@/theme/authTheme';

interface Props {
  children: React.ReactNode;
  /** Back / progress / skip. Sits above the gutter, outside the scroll. */
  header?: React.ReactNode;
  /** The step's primary action. Pinned to the bottom. */
  footer?: React.ReactNode;
  /** Page fill — the navy screens pass their own. */
  background: string;
  scroll?: boolean;
  /** Lift the footer when a text field is focused. */
  keyboard?: boolean;
  /** Drop the 24 pt gutter (the welcome screen's hero bleeds full width). */
  bleed?: boolean;
}

export default function AuthStepLayout({
  children,
  header,
  footer,
  background,
  scroll = false,
  keyboard = false,
  bleed = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const gutter = bleed ? 0 : AUTH_METRICS.gutter;

  /* `flex: 1` pins the body to the screen for a step that must fit; inside
     a ScrollView it would do the opposite (basis 0 against a container
     that is sized BY its content), so a scrolling step grows instead. */
  const body = (
    <View style={[styles.body, scroll ? styles.bodyGrow : styles.bodyFill, { paddingHorizontal: gutter }]}>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: background }]}
      behavior={keyboard && Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {header != null && (
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: AUTH_METRICS.gutter }}>
          {header}
        </View>
      )}

      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {body}
        </ScrollView>
      ) : (
        body
      )}

      {footer != null && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: gutter || AUTH_METRICS.gutter },
          ]}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingTop: 22 },
  bodyFill: { flex: 1 },
  bodyGrow: { flexGrow: 1 },
  scrollBody: { flexGrow: 1 },
  footer: { paddingTop: 14, gap: 10 },
});

// v1.0.0 — The onboarding step frame (gutter, keyboard lift, pinned footer).
