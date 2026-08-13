/* ==================================================================
   SegmentedTabs (molecule) — a full-width, native-feeling segmented
   control for switching between two views of one record.

   ══ WHY THIS IS NOT `SegmentedControl` ══
   `SegmentedControl` is a port of the web's `.settings-seg`: chips sized
   to their own text, a brand-navy fill on the active one. That is a
   settings CHIP GROUP, and it looks right in Settings. Used as a tab bar
   it sat in the left third of the screen with the rest of the row empty,
   and recolouring on tap reads as a toggle rather than as navigation.

   What makes a segmented control feel native on iOS is not blur — it is
   the geometry: segments that divide the full width evenly, and a thumb
   that SLIDES between them so the change is continuous. Both below.

   (Glass was considered here and rejected: this control sits on a flat
   page background, and a material that refracts what is behind it has
   nothing to refract. The glass in this app is on the action bar, where
   the report actually scrolls underneath it.)
   ================================================================== */

import { useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useIsDark, useTheme } from '@/theme/useTheme';

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}

/** Inset of the thumb inside the track, on every side. */
const PAD = 3;

export default function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const t = useTheme();
  const dark = useIsDark();
  const [trackW, setTrackW] = useState(0);

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segW = trackW > 0 ? (trackW - PAD * 2) / options.length : 0;

  /* Driven on the native thread: the thumb must keep sliding smoothly even
     while the tab it is revealing is mounting six SVG strips. */
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(x, {
      toValue: index * segW,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [index, segW, x]);

  const track = dark ? t.bgSoft : t.accentSoft;
  const thumb = dark ? t.surfaceHover : t.surface;

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: track, borderColor: t.border }]}
    >
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: segW,
              backgroundColor: thumb,
              shadowColor: dark ? 'transparent' : '#0A2540',
              transform: [{ translateX: x }],
            },
          ]}
        />
      )}

      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={styles.seg}
          >
            {/* ★ THE TYPE SHRINKS WHEN THERE ARE THREE SEGMENTS.
                Reported from the phone: "Measurem… Interpretat…". With two
                options each segment is ~180 pt on a 390 pt screen and 14 pt
                bold fits anything; with three it is ~120 pt and "Measurements"
                alone is over 100 pt, so both long labels truncated and the
                control read as broken.

                `adjustsFontSizeToFit` rather than a smaller fixed size,
                because the shrink must follow the LABEL and the LANGUAGE —
                Hebrew's words here are shorter than English's, and a size
                chosen for the worst English case would needlessly shrink
                every Hebrew tab. `minimumFontScale` stops it becoming
                unreadable rather than letting it scale to nothing. */}
            <Text
              style={[
                styles.label,
                options.length > 2 && styles.labelTight,
                { color: active ? t.textPrimary : t.textSecondary },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={options.length > 2}
              minimumFontScale={0.75}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: PAD, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    bottom: PAD,
    borderRadius: 9.5,
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  /* `flex: 1` is the whole point — the segments divide the full width. */
  seg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    /* Without this the Text's intrinsic width can push past its flex share
       before `adjustsFontSizeToFit` ever measures, so the shrink is applied
       to a box that has already overflowed. */
    paddingHorizontal: 4,
  },
  label: { fontSize: 14, fontWeight: '700' },
  /* Three segments start a step down, so shrink-to-fit has less work to do
     and the three labels stay closer to one size as a result. */
  labelTight: { fontSize: 13 },
});

// v1.1.0 — The label shrinks to fit when there are more than two segments.
//          At three, "Measurements" and "Interpretation" both truncated on a
//          390 pt screen and the control read as broken.
// v1.0.0 — Full-width segmented tab bar with a sliding native-driver thumb.
