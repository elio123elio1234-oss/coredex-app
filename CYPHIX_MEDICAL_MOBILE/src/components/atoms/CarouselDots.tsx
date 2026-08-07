/* ==================================================================
   CarouselDots (atom) — "there is more than one of these, and you are on
   this one". With a single card filling the screen, nothing else on the
   Tests tab says a second test exists; the dots are the only standing
   evidence, so they render even while the arrows are dimmed.

   Index order is PHYSICAL, matching the ScrollView's own left-to-right
   layout — see the note in `CarouselArrow` about why nothing here mirrors
   under Hebrew.
   ================================================================== */

import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  count: number;
  /** Zero-based page currently filling the screen. */
  index: number;
}

export default function CarouselDots({ count, index }: Props) {
  const t = useTheme();
  return (
    /* One accessible node, not `count` of them: a screen reader announcing
       "dot, dot" tells a patient nothing. The carousel itself is labelled. */
    <View style={styles.row} accessible={false} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === index
              ? { backgroundColor: t.accent, width: 22 }
              : { backgroundColor: t.textTertiary, opacity: 0.45 },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

// v1.0.0 — Page indicator for the Tests carousel; the active dot stretches.
