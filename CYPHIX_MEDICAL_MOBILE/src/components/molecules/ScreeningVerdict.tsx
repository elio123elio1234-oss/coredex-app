/* ==================================================================
   ScreeningVerdict (molecule) — the answer, and nothing else.

   ══ THIS IS THE WHOLE SCREEN, IN ONE VIEW ══
   Someone opens Interpretation to settle one question: am I fine, or do I
   need to do something? Everything under this component is supporting
   evidence for an answer they have already read. So the answer gets a
   viewport of its own: a mark, a sentence, and the action.

   ══ WHY IT BREATHES ══
   Two `PulseRing`s at 3 s — slower than a resting heart, deliberately.
   A ring at heart rate reads as a monitor and raises the pulse of anyone
   watching it; at breathing rate it reads as calm, and slow breathing is
   the thing a frightened person is trying to do. The urgent state runs at
   2 s: still not a strobe, but visibly more insistent.

   ══ THE COLOURS, AND THE ONE RULE THEY BREAK ══
   `tokens.ts` says red is for destructive actions and genuine failures,
   and that painting a mere deviation red is a layer interpreting when it
   may not. That rule is about the ANALYSIS layer, which measures. This
   component sits on the SCREENING layer, whose entire job is to say
   "act now" — and on a medical device that sentence is red or it is not
   the sentence. `attention` amber still carries "worth a look", exactly
   as it does in Insights.

     clear         signal green   the instrument colour: alive, reading, fine
     attention     attention gold worth a look, not worth adrenaline
     urgent        danger red     act now
     inconclusive  neutral grey   no claim was made at all
   ================================================================== */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import type { ScreeningLevel } from '@cyphix/shared';
import PulseRing from '@/components/atoms/Auth/PulseRing';
import FadeUpView from '@/components/atoms/Auth/FadeUpView';
import type { TranslationKey } from '@/i18n/config';
import { useTranslation } from '@/i18n/useTranslation';
import type { ThemeTokens } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  level: ScreeningLevel;
  /** "41 of 43 checks ran" — the denominator that makes `clear` mean something. */
  checksLine: string;
}

/** Diameter of the mark. Large enough to be the first thing seen from arm's
    length, small enough that the first finding is on screen under it. */
const MARK = 116;

export interface VerdictPalette {
  /** Strokes, rings, the glyph. */
  accent: string;
  /** The mark's fill. */
  soft: string;
  /** The headline. Never `attention` — see tokens.ts on why that token is
      never allowed to be words. */
  ink: string;
}

export function verdictPalette(level: ScreeningLevel, t: ThemeTokens): VerdictPalette {
  switch (level) {
    case 'clear':
      return { accent: t.signal, soft: t.signalSoft, ink: t.signalInk };
    case 'attention':
      return { accent: t.attention, soft: t.attentionSoft, ink: t.textPrimary };
    case 'urgent':
      return { accent: t.danger, soft: t.dangerSoft, ink: t.danger };
    case 'inconclusive':
      return { accent: t.textTertiary, soft: t.surfaceHover, ink: t.textSecondary };
  }
}

const GLYPH: Record<ScreeningLevel, keyof typeof Ionicons.glyphMap> = {
  clear: 'checkmark',
  attention: 'alert-circle-outline',
  urgent: 'warning',
  inconclusive: 'help-outline',
};

const HEADLINE_KEY: Record<ScreeningLevel, TranslationKey> = {
  clear: 'scrLevelClear',
  attention: 'scrLevelAttention',
  urgent: 'scrLevelUrgent',
  inconclusive: 'scrLevelInconclusive',
};

const ACTION_KEY: Record<ScreeningLevel, TranslationKey> = {
  clear: 'scrActClear',
  attention: 'scrActAttention',
  urgent: 'scrActUrgent',
  inconclusive: 'scrActInconclusive',
};

export default function ScreeningVerdict({ level, checksLine }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const p = verdictPalette(level, t);
  const beat = level === 'urgent' ? 2000 : 3000;

  return (
    <View style={styles.wrap}>
      <FadeUpView duration={520} distance={14}>
        <View style={styles.markBox}>
          {/* Behind the mark, and non-interactive: the rings are atmosphere,
              and a ring that swallowed a tap would make the mark feel broken. */}
          <PulseRing color={p.accent} duration={beat} />
          <PulseRing color={p.accent} duration={beat} delay={beat / 2} />
          <View style={[styles.mark, { backgroundColor: p.soft, borderColor: p.accent }]}>
            <Ionicons name={GLYPH[level]} size={50} color={p.accent} />
          </View>
        </View>
      </FadeUpView>

      <FadeUpView delay={140} duration={520} distance={12} style={styles.copy}>
        {/* `allowFontScaling` stays ON everywhere in this block: this is the
            one screen an older reader most needs at their own text size, and
            nothing here is laid out so tightly that growing it breaks. */}
        <Text style={[styles.headline, { color: p.ink }]}>{tr(HEADLINE_KEY[level])}</Text>
        <Text style={[styles.action, { color: t.textSecondary }]}>{tr(ACTION_KEY[level])}</Text>
        <Text style={[styles.checks, { color: t.textTertiary }]}>{checksLine}</Text>
      </FadeUpView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 18, paddingTop: 8 },
  markBox: { width: MARK, height: MARK, alignItems: 'center', justifyContent: 'center' },
  mark: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  headline: { fontSize: 27, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  action: { fontSize: 15.5, lineHeight: 21, textAlign: 'center' },
  checks: { fontSize: 12.5, textAlign: 'center', marginTop: 2 },
});

// v1.0.0 — The screening answer as one view: a breathing mark in the level's
//          colour, the verdict, the action, and the checks-run denominator.
