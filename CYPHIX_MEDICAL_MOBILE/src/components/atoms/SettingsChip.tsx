/* ==================================================================
   SettingsChip (atom) — the small pill a settings row uses for a status
   ("Configured", "Offline", "Coming soon"). The web `.settings-chip`.

   Status is never colour ALONE: the chip always carries its own words,
   the tone only reinforces them (web CLAUDE.md §6 / accessibility).
   ================================================================== */

import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  tone?: 'neutral' | 'ok' | 'warn';
}

export default function SettingsChip({ label, tone = 'neutral' }: Props) {
  const t = useTheme();
  const skin =
    tone === 'ok'
      ? { back: t.successSoft, ink: t.success }
      : tone === 'warn'
        ? { back: t.dangerSoft, ink: t.danger }
        : { back: t.accentSoft, ink: t.textSecondary };

  /* ★ A VIEW owns the pill, the Text only carries words. It used to be a
     bare <Text> with `borderRadius: 999 + overflow: 'hidden'` — and when a
     long label wrapped to two lines, a stadium radius on a ~44 pt-tall
     text node CLIPPED the first and last glyphs of each line. A view clips
     its padding box, never its glyphs. */
  return (
    <View style={[styles.chip, { backgroundColor: skin.back }]}>
      <Text style={[styles.text, { color: skin.ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .settings-chip { padding: 4px 10px; radius 999; 12px/700 } */
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});

// v1.1.0 — The pill is a View around the Text, not a rounded Text: a stadium
//          radius with overflow:hidden on a wrapping text node clips the first
//          and last glyphs of every line.
// v1.0.0 — Status pill for settings rows.
