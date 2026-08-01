/* ==================================================================
   ToolToggle (atom) — one on/off tool in the ECG viewer's toolbar.

   ══ WHY THE DEFAULT IS AN ICON, NOT A LABELLED CHIP ══
   v0.15.0 shipped these as labelled chips, 44 pt tall and ~90 pt wide. Six
   of them plus the headline, the meta line, the tabs and a hint took roughly
   a third of the screen — on the one module whose entire subject is a
   waveform. A reading tool that gives the trace less room than its own
   chrome has the ratio backwards.

   So the toolbar is now **icons at 40 × 38**, which is the platform's own
   answer (every native media/editor toolbar is icons), and the two costs are
   paid explicitly:

     • Discoverability — every button carries an `accessibilityLabel` and the
       screen prints the ACTIVE tool's sentence in one line beneath the row.
       You always know what the tool you turned on will do.
     • Ambiguity — an icon for "baseline filter" would be a guess, so the
       filters and the comparison never became icons: they live in a labelled
       sheet behind ⋯. Only tools with an unambiguous pictogram are up here.

   `label` is still required, and is still what a screen reader announces.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  active: boolean;
  onToggle: () => void;
  /** Ionicon name. Required in the default (icon) form. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Longer sentence for screen readers — the web's `title` tooltip. */
  hint?: string;
  /** Print the label beside the icon. For rows with space, e.g. a sheet. */
  showLabel?: boolean;
  /** Slimmer still, for the full-screen bar overlaying the trace. */
  dense?: boolean;
  disabled?: boolean;
}

export default function ToolToggle({
  label,
  active,
  onToggle,
  icon,
  hint,
  showLabel,
  dense,
  disabled,
}: Props) {
  const t = useTheme();
  const size = dense ? 17 : 19;

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: active, disabled: !!disabled }}
      accessibilityLabel={label}
      accessibilityHint={hint}
      disabled={disabled}
      /* The visual is small; the TOUCH target is not. hitSlop restores the
         44 pt floor without spending 44 pt of the trace's height on it. */
      hitSlop={dense ? 6 : 8}
      onPress={() => {
        void Haptics.selectionAsync();
        onToggle();
      }}
      style={({ pressed }) => [
        styles.chip,
        dense ? styles.dense : styles.normal,
        showLabel && styles.wide,
        {
          backgroundColor: active ? t.brandNavy : t.surface,
          borderColor: active ? t.brandNavy : t.border,
          opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        },
      ]}
    >
      {icon && <Ionicons name={icon} size={size} color={active ? t.surface : t.textSecondary} />}
      {(showLabel || !icon) && (
        <Text
          style={[styles.label, { color: active ? t.surface : t.textPrimary }]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  normal: { width: 44, height: 38 },
  dense: { width: 38, height: 32 },
  wide: { width: 'auto', paddingHorizontal: 12 },
  label: { fontSize: 13.5, fontWeight: '600' },
});

// v2.0.0 — Icon-first: 44 × 38 by default with a 44 pt hitSlop target, so a
//          six-tool row costs the trace 38 pt instead of ~120.

