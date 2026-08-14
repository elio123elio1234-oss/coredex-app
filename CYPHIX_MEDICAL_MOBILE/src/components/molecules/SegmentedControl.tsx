/* ==================================================================
   SegmentedControl (molecule) — the web `.settings-seg`: a small pill
   track with one option highlighted. Used for the theme choice and the
   care-connection mode.

   Generic over the option's value so a caller cannot wire a control to
   the wrong setter and still typecheck.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
}

export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: t.bgSoft, borderColor: t.border }]}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              void Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.opt, active && { backgroundColor: t.brandNavy }]}
          >
            <Text
              style={[styles.label, { color: active ? '#FFFFFF' : t.textSecondary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
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
  /* .settings-seg { gap 4; padding 3; radius 12 }
     ★ `flexShrink: 1` + `minWidth: 0` on the track AND the options, and
     it is defensive, not decorative: Yoga's default shrink is 0, so a
     track wider than its slot used to keep its natural width, overflow
     the slot (RN views default `overflow: visible`) and paint over the
     label beside it. Wide callers should use `SettingsRow layout="stack"`;
     this makes sure a squeezed track degrades by shrinking, never by
     overpainting. */
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  /* .settings-seg-opt { padding 7px 12px; radius 9 } */
  opt: { borderRadius: 9, paddingVertical: 7, paddingHorizontal: 12, flexShrink: 1, minWidth: 0 },
  label: { fontSize: 13, fontWeight: '800' },
});

// v1.1.0 — The track and its options may SHRINK (Yoga defaults to 0), so a
//          tight slot compresses the control instead of letting it paint over
//          the label beside it. Last-resort font fit on the labels.
// v1.0.0 — Segmented pill control (web `.settings-seg`).
