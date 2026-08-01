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
   44 pt chips answer the common case in one tap and the keyboard never
   opens at all. Free text stays one tap away for everything else — which is
   the same bargain the web strikes, weighted for a thumb.

   The point being labelled is named in the subtitle (lead + time), because
   the sheet covers the marker that would otherwise show it.
   ================================================================== */

import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ANNOTATION_TAGS } from '@/features/history/annotationTags';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

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
  const { t: tr, rtl } = useTranslation();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState(existingText ?? '');

  /* `key` on the Modal resets this state per point — without it, opening the
     composer on a second beat would arrive pre-filled with the first one's
     label, which is how a wrong note gets saved by accident. */
  const align = rtl ? ('right' as const) : ('left' as const);
  const submit = (value: string) => {
    const label = value.trim();
    if (label === '') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSubmit(label);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.scrim} onPress={onCancel} accessibilityLabel={tr('annCancel')} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: t.border }]} />

          <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
            {existingText != null ? tr('annEditTitle') : tr('annTitle')}
          </Text>
          <Text style={[styles.at, { color: t.textSecondary, textAlign: align }]}>
            {tr('annAt', { lead, time: timeSec.toFixed(2) })}
          </Text>

          {/* One tap, no keyboard — the reason the shortlist exists. */}
          <View style={styles.tags}>
            {ANNOTATION_TAGS.map((tag) => (
              <Pressable
                key={tag.id}
                accessibilityRole="button"
                disabled={busy}
                onPress={() => submit(tr(tag.labelKey))}
                style={({ pressed }) => [
                  styles.tag,
                  {
                    backgroundColor: pressed ? t.accentSoft : t.bgSoft,
                    borderColor: tag.tone === 'artifact' ? t.danger : t.border,
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
              {
                color: t.textPrimary,
                backgroundColor: t.bgSoft,
                borderColor: t.border,
                textAlign: align,
              },
            ]}
            value={text}
            onChangeText={setText}
            placeholder={tr('annPlaceholder')}
            placeholderTextColor={t.textTertiary}
            autoCapitalize="sentences"
            accessibilityLabel={tr('annPlaceholder')}
          />

          <View style={styles.actions}>
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
                { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
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
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>
                {existingText != null ? tr('annSave') : tr('annAdd')}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: 10,
  },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '800' },
  at: { fontSize: 13, fontVariant: ['tabular-nums'] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  tag: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: RADIUS.md, borderWidth: 1 },
  tagText: { fontSize: 14, fontWeight: '600' },
  input: { borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 13, fontSize: 15 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 2 },
  btn: { flex: 1, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  ghost: { borderWidth: 1 },
  btnText: { fontSize: 14.5, fontWeight: '700' },
});

// v1.0.0 — Annotation composer as a keyboard-aware bottom sheet; five quick
//          tags answer the common case without opening the keyboard at all.
