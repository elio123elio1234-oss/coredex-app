/* ==================================================================
   PageTitle (molecule) — a screen's title that is PART OF THE PAGE and
   fades out as the page is scrolled.

   ══ WHAT IT REPLACES, AND WHY ══
   History and Insights carried their title, count and Import button on a
   frosted `GlassSurface` bar pinned to the top, with the list travelling
   underneath it. That bar cost more than it gave:

     • it permanently occupied ~90–180 pt of the tallest part of the
       screen to restate the name of the tab the dock already highlights;
     • its height could not be known, only MEASURED, so every scroller had
       to carry a measured content inset, an estimate for the first frame
       before the measurement existed, and an `onLayout` that added the
       bar's own padding back by hand — three numbers that had to agree
       and had no way of failing loudly when they did not;
     • and a full-width frosted slab over a list is chrome, in a product
       whose patient screens are meant to be one big thing to press.

   Asked for as: *"in Insights and History there is no need for a top bar —
   it can be part of the page and fade out as you scroll down."*

   ══ WHY IT IS NOT AN ANIMATED PINNED BAR ══
   The obvious implementation is to keep the absolute bar and animate
   `translateY: -scrollY` so it appears to scroll away. Don't: that makes
   the title's position a 60 Hz animation driven by a JS `onScroll`
   callback throttled to 16–32 ms, and a POSITION that lags the content it
   is meant to be part of reads as the title sliding independently —
   exactly the thing it is pretending not to do.

   This component is rendered INSIDE the scroll content instead (a
   `ListHeaderComponent`, or the first child of a ScrollView). It then
   moves with the page for free, because it *is* the page, at whatever
   frame rate the scroller itself runs at. The only animated property left
   is OPACITY, and an opacity that updates every 32 ms is invisible as
   stutter in a way a position never is.

   ★ `pointerEvents` is driven by a plain boolean prop, not by the shared
   value. A faded-out accessory that is still tappable is a button nobody
   can see and everybody can press; the screens already track a scroll
   threshold in JS, so they pass `interactive={false}` from the same test.
   ================================================================== */

import { useCallback, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useReplayOnFocus } from '@/hooks/useReplayOnFocus';

/**
 * How far the page travels before the title is completely gone.
 *
 * Exported so a screen can drive its `interactive` prop off the same
 * number the fade uses — two constants that are meant to be one is how a
 * button ends up invisible and live.
 */
export const TITLE_FADE_DISTANCE = 64;

interface Props {
  title: string;
  /** Right-hand accessory (History's Import button). */
  accessory?: ReactNode;
  /** A line under the title — the study count, a progress clause. */
  subtitle?: ReactNode;
  /** Anything that belongs to the title block but below the row (errors). */
  below?: ReactNode;
  /** Live scroll offset of the page this title sits in. */
  scrollY: SharedValue<number>;
  /** False once the title has faded far enough to stop being a target. */
  interactive?: boolean;
  align: 'left' | 'right';
  rtl?: boolean;
  color: string;
  /** Top clearance — the safe area, since the screen bleeds to the top. */
  paddingTop: number;
  paddingHorizontal: number;
  /** Air between the title block and the first row of real content. */
  marginBottom?: number;
}

export default function PageTitle({
  title,
  accessory,
  subtitle,
  below,
  scrollY,
  interactive = true,
  align,
  rtl = false,
  color,
  paddingTop,
  paddingHorizontal,
  marginBottom = 14,
}: Props) {
  /**
   * The entrance: the title lands first, and the page follows it.
   *
   * ★ It lives in the SAME animated style as the scroll fade, multiplied
   * into it, rather than in a wrapper. Two nested animated views both
   * writing `opacity` is how a title ends up half-lit: each one is correct
   * about its own factor and neither knows about the other, so a screen
   * entered mid-scroll would play the entrance over a value the scroll had
   * already lowered. One expression, two factors, no ambiguity.
   */
  const intro = useSharedValue(0);
  /* ★ Every VISIT, not once per session: a bottom-tab screen mounts once and
     stays mounted, so an entrance keyed on mount plays for the first arrival
     and never again. Reset first — `withTiming` starts from the CURRENT
     value, which on a return visit is already 1. */
  const play = useCallback(() => {
    intro.value = 0;
    intro.value = withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) });
  }, [intro]);
  useReplayOnFocus(play);

  /* Linear over `TITLE_FADE_DISTANCE`, clamped at both ends. A rubber-band
     overscroll drives `scrollY` NEGATIVE on iOS, so the lower clamp is not
     defensive padding — without it the title brightens past full opacity
     and then snaps back when the bounce settles. */
  const fade = useAnimatedStyle(() => {
    const y = scrollY.value;
    const p = y <= 0 ? 0 : y >= TITLE_FADE_DISTANCE ? 1 : y / TITLE_FADE_DISTANCE;
    return {
      opacity: (1 - p) * intro.value,
      /* 8 pt, not the 10 the cards use: a 30 pt heading travelling as far
         as a card reads as the heading being late rather than as the page
         arriving. */
      transform: [{ translateY: 8 * (1 - intro.value) }],
    };
  });

  return (
    <Animated.View
      pointerEvents={interactive ? 'box-none' : 'none'}
      style={[{ paddingTop, paddingHorizontal, marginBottom }, fade]}
    >
      <View style={[styles.row, rtl && styles.rowRtl]}>
        <View style={styles.text}>
          <Text style={[styles.title, { color, textAlign: align }]}>{title}</Text>
          {subtitle}
        </View>
        {accessory}
      </View>
      {below}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRtl: { flexDirection: 'row-reverse' },
  text: { flex: 1, flexShrink: 1, gap: 2 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.4 },
});

// v1.1.0 — Rises in on mount (380 ms, 8 pt), so both tabs open with the title
//          landing ahead of their content instead of appearing finished. The
//          entrance is MULTIPLIED INTO the scroll fade rather than wrapped
//          around it: two nested animated views both writing `opacity` is how
//          a screen entered mid-scroll ends up with a half-lit heading.
// v1.0.0 — A screen title that lives in the scroll content and fades out as
//          the page moves, replacing the frosted pinned bar on History and
//          Insights. Rendered inside the scroller on purpose: it then travels
//          with the content at the scroller's own frame rate, leaving OPACITY
//          as the only animated property — a lagging position is visible as
//          independent movement, a lagging opacity is not.
