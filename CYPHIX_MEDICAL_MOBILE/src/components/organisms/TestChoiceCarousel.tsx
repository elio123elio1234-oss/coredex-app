/* ==================================================================
   TestChoiceCarousel (organism) — ONE test circle on screen at a time,
   changed by swiping sideways or by tapping an arrow.

   ── Why a carousel and not the web's grid ──
   The web lays its choices out as a row of circles because a browser
   window is wide. A phone is not: the same grid on a 390 pt screen shrinks
   each photograph to a thumbnail, and the photograph IS the interface here
   — an elderly patient recognises "the watch on the wrist" long before
   they read "6 Limb Leads". So the phone gives one circle the whole width
   and offers TWO ways to reach the next one, because the two failure modes
   are opposite: a patient who does not know to swipe never discovers the
   second test, and a patient with unsteady hands cannot swipe reliably.
   The dots below are the standing evidence that a second test exists at
   all — with one card filling the screen, nothing else says so.

   ── Everything here is PHYSICAL left-to-right, in every language ──
   RN only reverses a horizontal ScrollView when `I18nManager.isRTL` is
   set, which this app deliberately does not use (direction is handled
   per-component so the language can change without an app restart). Pages,
   arrows and dots therefore all run left-to-right under Hebrew too — see
   the note in `CarouselArrow`.

   Presentation and paging only: what a page contains is the caller's.
   ================================================================== */

import { useRef, useState, type ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import CarouselArrow from '@/components/atoms/CarouselArrow';
import CarouselDots from '@/components/atoms/CarouselDots';

/** `CarouselArrow`'s own diameter — needed to centre it on the circle. */
const ARROW = 44;
/** PatientShell's horizontal padding, used only as a first-frame guess. */
const SHELL_PADDING = 20;

interface Props {
  /** One node per page. Each is centred in a full-width page. */
  pages: ReactNode[];
  /**
   * Diameter of the circle at the top of every page.
   *
   * The arrows are absolutely positioned (they must not scroll away with
   * the pages), so they cannot find the circle's centre by layout — they
   * are told where it is. Pages are top-aligned precisely so this is one
   * number and not a measurement per page.
   */
  circleSize: number;
  prevLabel: string;
  nextLabel: string;
}

export default function TestChoiceCarousel({ pages, circleSize, prevLabel, nextLabel }: Props) {
  const { width: screenW } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  /* Seeded from the window so the first frame already paginates correctly;
     onLayout then corrects it to whatever the shell actually granted. */
  const [width, setWidth] = useState(screenW - SHELL_PADDING * 2);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(pages.length - 1, next));
    setIndex(clamped);
    scroller.current?.scrollTo({ x: clamped * width, animated: true });
  };

  /* Live during the drag so the dots track the finger, but only committed
     when the page actually changes — a setState per scroll frame would
     re-render both cards sixty times a second for a 7 pt dot. */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== index) setIndex(page);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      <View>
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          /* Top-aligned, not centred: it is what lets one `circleSize`
             locate the arrows for every page regardless of how tall each
             page's caption runs. */
          contentContainerStyle={styles.track}
        >
          {pages.map((page, i) => (
            <View key={i} style={[styles.page, { width }]}>
              {page}
            </View>
          ))}
        </ScrollView>

        {/* Outside the ScrollView so they stay put while the cards move,
            and vertically centred on the circle rather than on the card. */}
        <View
          style={[styles.arrows, { top: circleSize / 2 - ARROW / 2 }]}
          pointerEvents="box-none"
        >
          <CarouselArrow
            direction="prev"
            onPress={() => goTo(index - 1)}
            disabled={index === 0}
            accessibilityLabel={prevLabel}
          />
          <CarouselArrow
            direction="next"
            onPress={() => goTo(index + 1)}
            disabled={index === pages.length - 1}
            accessibilityLabel={nextLabel}
          />
        </View>
      </View>

      <CarouselDots count={pages.length} index={index} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 18 },
  track: { alignItems: 'flex-start' },
  page: { alignItems: 'center' },
  arrows: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

// v1.0.0 — One test circle per screen, paged by swipe or arrow, with dots.
