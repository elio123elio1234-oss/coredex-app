/* ==================================================================
   MeasureChoiceCircle (molecule) — ONE measurement offered as a big, warm,
   round photograph. The mobile twin of the web molecule of the same name
   (`.choice-tile` / `.choice-circle` in tests.css).

   ── What differs from the web, and why ──
   The web shows three of these side by side in a grid. The phone shows ONE
   AT A TIME, filling the screen, because three circles shrunk to fit a
   390 pt viewport are three thumbnails — and the whole point of this
   design is that the patient recognises the test from the picture rather
   than reading a label. So the circle is sized by the carousel, not by a
   grid cell, and it lands around 2.5× the web's phone size.

   The circle IS the button, as on the web: a photograph you tap. Purely
   presentational — the screen supplies the artwork, the copy and the
   handlers (CLAUDE.md §3.1, §3.2).
   ================================================================== */

import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import PlayIcon from '@/components/atoms/PlayIcon';
import { useTheme } from '@/theme/useTheme';

/**
 * `.choice-circle { border: 3px solid var(--surface) }` — a white rim that
 * separates the photograph from the page behind it.
 *
 * Exported because RN draws a border INSIDE the box: artwork sized to the
 * full diameter is clipped by the rim rather than framed by it. A caller
 * passing a numerically-sized visual (`SplitLeadCircle`) must subtract this
 * twice. A visual sized in percentages resolves against the content box
 * already and needs no adjustment.
 */
export const CHOICE_BORDER = 3;

interface Props {
  /** The artwork: a photograph or a <SplitLeadCircle/>. */
  visual: ReactNode;
  /** Outer diameter, decided by the carousel from the space it has. */
  size: number;
  label: string;
  sublabel: string;
  onSelect: () => void;
  disabled?: boolean;
  /** Small pill over the foot of the circle ("Scheduled" / "Coming soon"). */
  badge?: string;
  /** True the first time this test is chosen — highlights the explainer. */
  firstTime?: boolean;
  explainLabel: string;
  onExplain: () => void;
  /** Why this test cannot be started right now, if it cannot. */
  note?: string;
}

export default function MeasureChoiceCircle({
  visual,
  size,
  label,
  sublabel,
  onSelect,
  disabled = false,
  badge,
  firstTime = false,
  explainLabel,
  onExplain,
  note,
}: Props) {
  const t = useTheme();

  return (
    <View style={styles.tile}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={sublabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onSelect();
        }}
        style={({ pressed }) => [
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: t.surface,
            backgroundColor: t.surface,
            /* `.choice-circle:disabled { opacity: .5 }` — a greyscale filter
               has no RN equivalent, so the dim carries the whole message. */
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
          },
        ]}
      >
        {visual}
        {badge != null && (
          <View style={[styles.badge, { backgroundColor: t.brandNavy }]}>
            <Text style={styles.badgeText} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        )}
      </Pressable>

      <View style={styles.caption}>
        <Text style={[styles.label, { color: t.textPrimary }]}>{label}</Text>
        <Text style={[styles.sub, { color: t.textSecondary }]}>{sublabel}</Text>
      </View>

      {note != null && (
        <Text style={[styles.note, { color: t.textTertiary }]} numberOfLines={2}>
          {note}
        </Text>
      )}

      {/* Stays enabled even when the test itself is not startable: reading
          what a test involves is exactly what someone does while they are
          waiting to be able to do it. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={explainLabel}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onExplain();
        }}
        style={({ pressed }) => [
          styles.explain,
          firstTime
            ? { backgroundColor: t.accentSoft, borderColor: 'transparent' }
            : { backgroundColor: t.surface, borderColor: t.border },
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <PlayIcon size={13} color={firstTime ? t.accent : t.textSecondary} />
        <Text style={[styles.explainText, { color: firstTime ? t.accent : t.textSecondary }]}>
          {explainLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  /* .choice-tile { flex column; align-items: center; gap: 12px } */
  tile: { alignItems: 'center', gap: 14 },
  /* border: 3px solid var(--surface); box-shadow: var(--shadow-md) */
  circle: {
    borderWidth: CHOICE_BORDER,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A2540',
    shadowOpacity: 0.16,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  /* .choice-badge — pinned over the foot of the photograph, not under it. */
  badge: {
    position: 'absolute',
    bottom: 12,
    paddingHorizontal: 13,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.2 },
  caption: { alignItems: 'center' },
  /* Bigger than the web's clamp(15px, 2vw, 18px): one card owns the screen. */
  label: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.3 },
  sub: { fontSize: 14.5, marginTop: 3, textAlign: 'center' },
  note: { fontSize: 12.5, textAlign: 'center', maxWidth: 260, lineHeight: 17 },
  /* .choice-explain — a quiet pill, loud only the first time (is-firsttime). */
  explain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  explainText: { fontSize: 13.5, fontWeight: '700' },
});

// v1.0.0 — One measurement as a big round photograph; the circle is the button.
