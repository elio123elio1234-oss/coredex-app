/* ==================================================================
   SettingsChip (atom) — the small pill a settings row uses for a status
   ("Configured", "Offline", "Coming soon"). The web `.settings-chip`.

   Status is never colour ALONE: the chip always carries its own words,
   the tone only reinforces them (web CLAUDE.md §6 / accessibility).
   ================================================================== */

import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  label: string;
  tone?: 'neutral' | 'ok' | 'warn';
}

export default function SettingsChip({ label, tone = 'neutral' }: Props) {
  const t = useTheme();
  const skin =
    tone === 'ok'
      ? { backgroundColor: t.successSoft, color: t.success }
      : tone === 'warn'
        ? { backgroundColor: t.dangerSoft, color: t.danger }
        : { backgroundColor: t.accentSoft, color: t.textSecondary };

  return <Text style={[styles.chip, skin]}>{label}</Text>;
}

const styles = StyleSheet.create({
  /* .settings-chip { padding: 4px 10px; radius 999; 12px/700 } */
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
    fontWeight: '700',
  },
});

// v1.0.0 — Status pill for settings rows.
