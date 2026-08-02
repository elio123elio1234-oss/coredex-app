/* ==================================================================
   AnnotationComposer (molecule) — label one point on the trace.
   Ported from the web molecule, restructured as a bottom sheet.

   ══ WHY A SHEET AND NOT A FLOATING CARD ══
   The web floats the composer over the trace so opening it never shrinks
   the waveform. On a phone the thing that shrinks the waveform is not the
   composer — it is the KEYBOARD, which takes the bottom half of the screen
   the moment the text field is focused. A card floating over the middle of
   the trace would then be sandwiched between the two, covering exactly the
   beat being annotated.

   So it rises from the bottom, and the quick tags sit ABOVE the field: five
   chips answer the common case in one tap and the keyboard never opens at
   all. Free text stays one tap away for everything else.

   ══ THE POINT BEING LABELLED IS STILL MARKED ON THE TRACE ══
   Opening this sheet does not make the reader lose their place: the sheet
   names the lead and the instant in its subtitle, AND the viewer draws a
   provisional marker at that sample for as long as this is open (see
   `pending` in EcgReviewSheet). Both are needed — the sheet may cover the
   marker on a short screen, and a subtitle alone would leave a clinician
   guessing which beat they tapped.

   Presentation belongs to `BottomSheet`, and the KEYBOARD belongs to
   `OverlayLayer` beneath it — a bottom-anchored sheet rendered in tree is not
   lifted by the OS, so the layer measures the keyboard and rides above it.
   `KeyboardAvoidingView` was removed rather than kept "just in case": it does
   not work inside an absolutely-positioned host, so it was only ever adding a
   second thing that could move the sheet.
   ================================================================== */

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import BottomSheet from '@/components/molecules/BottomSheet';
import { ANNOTATION_TAGS } from '@/features/history/annotationTags';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  lead: string;
  timeSec: number;
  /** Set when editing an existing marker; undefined when adding a new one. */
  existingText?: string;
  busy: boolean;
  onSubmit: (text: string) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export default function AnnotationComposer({
  visible,
  lead,
  timeSec,
  existingText,
  busy,
  onSubmit,
  onDelete,
  onCancel,
}: Props) {
  const t = useTheme();
  const dark = useIsDark();
  const { t: tr, rtl } = useTranslation();
  const [text, setText] = useState(existingText ?? '');

  const align = rtl ? ('right' as const) : ('left' as const);
  const submit = (value: string) => {
    const label = value.trim();
    if (label === '') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit(label);
  };

  /* On the glass panel a solid field would look pasted on, so inputs and
     chips are a translucent wash of the surface instead — the same material
     idea, one level down. */
  const wash = dark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.05)';
  const hairline = dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.10)';

  return (
    <BottomSheet visible={visible} onClose={onCancel} closeLabel={tr('annCancel')}>
      <View style={styles.body}>
        <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
          {existingText != null ? tr('annEditTitle') : tr('annTitle')}
        </Text>
        <Text style={[styles.at, { color: t.textSecondary, textAlign: align }]}>
          {tr('annAt', { lead, time: timeSec.toFixed(2) })}
        </Text>

        {/* One tap, no keyboard — the reason the shortlist exists. */}
        <View style={[styles.tags, rtl && styles.rowRtl]}>
          {ANNOTATION_TAGS.map((tag) => (
            <Pressable
              key={tag.id}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => submit(tr(tag.labelKey))}
              style={({ pressed }) => [
                styles.tag,
                {
                  backgroundColor: pressed ? t.accentSoft : wash,
                  borderColor: tag.tone === 'artifact' ? t.danger : hairline,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: t.textPrimary }]}>{tr(tag.labelKey)}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={[
            styles.input,
            { color: t.textPrimary, backgroundColor: wash, borderColor: hairline, textAlign: align },
          ]}
          value={text}
          onChangeText={setText}
          placeholder={tr('annPlaceholder')}
          placeholderTextColor={t.textTertiary}
          autoCapitalize="sentences"
          accessibilityLabel={tr('annPlaceholder')}
        />

        <View style={[styles.actions, rtl && styles.rowRtl]}>
          {onDelete && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onDelete}
              style={({ pressed }) => [
                styles.btn,
                styles.ghost,
                { borderColor: t.danger, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={[styles.btnText, { color: t.danger }]}>{tr('annDelete')}</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancel}
            style={({ pressed }) => [
              styles.btn,
              styles.ghost,
              { borderColor: hairline, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text style={[styles.btnText, { color: t.textPrimary }]}>{tr('annCancel')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy || text.trim() === ''}
            onPress={() => submit(text)}
            style={({ pressed }) => [
              styles.btn,
              {
                backgroundColor: t.brandNavy,
                opacity: busy || text.trim() === '' ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.btnText, { color: dark ? t.bg : '#FFFFFF' }]}>
              {existingText != null ? tr('annSave') : tr('annAdd')}
            </Text>
          </Pressable>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 10, paddingBottom: 4, gap: 10 },
  rowRtl: { flexDirection: 'row-reverse' },
  title: { fontSize: 19, fontWeight: '800' },
  at: { fontSize: 13, fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  tag: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 14, borderWidth: 1 },
  tagText: { fontSize: 14, fontWeight: '600' },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 13,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', gap: 9, marginTop: 2 },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 14.5, fontWeight: '700' },
});

// v2.1.0 — KeyboardAvoidingView removed: OverlayLayer under the sheet owns the
//          keyboard now, and a KAV inside an absolutely-positioned host was a
//          second thing that could move the panel without ever working.
