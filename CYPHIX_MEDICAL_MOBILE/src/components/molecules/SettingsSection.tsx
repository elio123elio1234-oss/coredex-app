/* ==================================================================
   SettingsSection (molecule) — a titled card grouping related settings
   rows. Ported from the web molecule: the full-colour illustration sits
   DIRECTLY on the card at 48 × 48 with no tinted tile behind it
   (`.settings-section-icon--art`), because these illustrations carry
   their own pastel palette rather than being currentColor line icons.

   Purely presentational, configured entirely by props.
   ================================================================== */

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IllustrationProps } from '@/components/atoms/Illustration';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  art: React.ComponentType<IllustrationProps>;
  title: string;
  description?: string;
  /** Optional trailing element in the header (e.g. a status chip). */
  aside?: ReactNode;
  children: ReactNode;
}

export default function SettingsSection({ art: Art, title, description, aside, children }: Props) {
  const t = useTheme();
  return (
    <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={styles.head}>
        <Art size={48} />
        <View style={styles.heading}>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          {description != null && (
            <Text style={[styles.desc, { color: t.textSecondary }]}>{description}</Text>
          )}
        </View>
        {aside != null && <View style={styles.aside}>{aside}</View>}
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .settings-section { padding: 18px 20px; radius-lg; shadow-sm } */
  section: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 6 },
  heading: { flex: 1, minWidth: 0 },
  title: { fontSize: 16.5, fontWeight: '800', marginTop: 2 },
  desc: { fontSize: 12.5, lineHeight: 18.75, marginTop: 3 },
  aside: { flexShrink: 0 },
  body: { marginTop: 6 },
});

// v1.0.0 — Settings card with the full-colour illustration header (web parity).
