/* ==================================================================
   ClinicalNote (molecule) — free-text summary for the whole study.
   Ported from the web molecule.

   A doctor's impression or a patient's remark, as prose — distinct from the
   beat markers (annotations) pinned to the trace. One per recording. Save
   enables only when the text has actually changed and shows a brief "saved"
   state, so the reader always knows whether what they see is what is
   stored.

   ★ `blurOnSubmit={false}` and no `returnKeyType="done"`: this is a
   multi-line clinical note, and a Return key that dismisses the keyboard
   instead of starting a new line is how a two-paragraph impression becomes
   one run-on sentence.

   Purely presentational: value in, onSave out. Storage + audit live in
   useRecordingNote.
   ================================================================== */

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** The note currently stored for this recording. */
  value: string;
  /** A stable key (the recording id) so the field resets between studies. */
  resetKey: string;
  canEdit: boolean;
  busy: boolean;
  rtl: boolean;
  onSave: (text: string) => void;
  labels: { title: string; placeholder: string; save: string; saved: string; hint: string };
}

export default function ClinicalNote({
  value,
  resetKey,
  canEdit,
  busy,
  rtl,
  onSave,
  labels,
}: Props) {
  const t = useTheme();
  const [text, setText] = useState(value);
  const [justSaved, setJustSaved] = useState(false);

  // Reset to the stored value whenever the study changes.
  useEffect(() => {
    setText(value);
    setJustSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  // If the stored value updates (e.g. the save landed), follow it.
  useEffect(() => {
    setText(value);
  }, [value]);

  const dirty = text.trim() !== value.trim();
  const align = rtl ? ('right' as const) : ('left' as const);

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>{labels.title}</Text>

      <TextInput
        style={[
          styles.input,
          { color: t.textPrimary, backgroundColor: t.bgSoft, borderColor: t.border, textAlign: align },
        ]}
        value={text}
        placeholder={labels.placeholder}
        placeholderTextColor={t.textTertiary}
        editable={canEdit}
        multiline
        blurOnSubmit={false}
        textAlignVertical="top"
        accessibilityLabel={labels.title}
        onChangeText={(next) => {
          setText(next);
          setJustSaved(false);
        }}
      />

      {canEdit && (
        <View style={styles.foot}>
          <Text style={[styles.hint, { color: t.textTertiary, textAlign: align }]}>
            {labels.hint}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!dirty || busy}
            onPress={() => {
              onSave(text.trim());
              setJustSaved(true);
            }}
            style={({ pressed }) => [
              styles.save,
              {
                backgroundColor: t.brandNavy,
                opacity: !dirty || busy ? 0.35 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={styles.saveText}>
              {justSaved && !dirty ? labels.saved : labels.save}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 15.5, fontWeight: '700' },
  input: {
    minHeight: 96,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    fontSize: 14.5,
    lineHeight: 20,
  },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1, flexShrink: 1, fontSize: 11.5, lineHeight: 16 },
  save: { flexShrink: 0, paddingHorizontal: 18, paddingVertical: 11, borderRadius: RADIUS.md },
  saveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

// v1.0.0 — Study-level clinical note; Save enables only on change and confirms.
