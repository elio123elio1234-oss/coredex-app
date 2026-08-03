/* ==================================================================
   OtpBoxes (molecule) — six 60 pt cells for the SMS code. The cell the
   next digit will land in carries a 2 pt navy edge; filled cells go to
   the selected fill. That moving edge is the only cursor there is, since
   the code is typed on the in-page pad rather than into a text field.

   Presentational: it is handed the code so far and draws it.
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { AUTH_METRICS, NUMERIC_TYPE, type AuthPalette } from '@/theme/authTheme';

interface Props {
  /** The digits entered so far, "" to `length` characters. */
  value: string;
  length: number;
  palette: AuthPalette;
  accessibilityLabel: string;
}

export default function OtpBoxes({ value, length, palette, accessibilityLabel }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      /* One label for the group: six separate empty boxes announced one
         by one is noise, not information. */
      accessible
    >
      {Array.from({ length }, (_, i) => {
        const char = value[i] ?? '';
        const isNext = i === value.length;
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                backgroundColor: char ? palette.selected : palette.field,
                borderColor: isNext ? palette.navy : palette.border,
                borderWidth: isNext ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.digit, { color: palette.heading }]} allowFontScaling={false}>
              {char}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 9 },
  cell: {
    flex: 1,
    height: AUTH_METRICS.otpHeight,
    borderRadius: AUTH_METRICS.fieldRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: { fontSize: 24, fontWeight: '500', ...NUMERIC_TYPE },
});

// v1.0.0 — Six-cell code display with the next-cell cursor.
