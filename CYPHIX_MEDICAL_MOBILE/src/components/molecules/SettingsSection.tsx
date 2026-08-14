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
import { useTranslation } from '@/i18n/useTranslation';
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
  const { rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);
  return (
    <View style={[styles.section, { backgroundColor: t.surface, borderColor: t.border }]}>
      {/* The illustration leads the heading, so in Hebrew it moves to the
          right with it — an icon stranded on the far side of its own title
          reads as belonging to the row above. */}
      <View style={[styles.head, rtl && styles.headRtl]}>
        <Art size={48} />
        <View style={styles.heading}>
          <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{title}</Text>
          {description != null && (
            <Text style={[styles.desc, { color: t.textSecondary, textAlign: align }]}>
              {description}
            </Text>
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
  /* `center`, not `flex-start`: the 48 pt art is taller than a one-line
     heading block, and top-aligning left it hanging below the text — the
     header baseline read as broken on every section without a description. */
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  headRtl: { flexDirection: 'row-reverse' },
  heading: { flex: 1, minWidth: 0 },
  title: { fontSize: 16.5, fontWeight: '800' },
  desc: { fontSize: 12.5, lineHeight: 18.75, marginTop: 3 },
  aside: { flexShrink: 0 },
  body: { marginTop: 6 },
});

// v1.2.0 — The 48 pt art centres against the heading block instead of hanging
//          below a one-line title.
// v1.1.0 — Header reverses and re-aligns under an RTL language.
