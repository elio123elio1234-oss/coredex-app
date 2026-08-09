/* ==================================================================
   CardListEditor (organism) — edit one list on the medical card:
   allergies, medicines, or family history.

     ┌ ALLERGIES ─────────────────────────────┐
     │  ✓ Penicillin                          │
     │    Iodinated contrast dye              │
     │    Latex                               │
     │    …                                   │
     │  ─────────────────────────────────────  │
     │  + Something else                      │
     │  [ Save ]                              │
     └────────────────────────────────────────┘

   ══ ONE SHEET, NOT A PAGE PER CATEGORY ══
   Asked for explicitly, and right: this is picking a few items off a
   short list. A pushed screen per category means four screens, four back
   buttons and four places to get lost, for a job that is over in two
   taps. The sheet arrives over a BLURRED page (`BottomSheet`), so the
   card you are editing stays visible behind the thing editing it.

   ══ WHY THE LIST IS A LIST ══
   A free-text field produces "asprin", "Aspirin ", "ASA" and
   "acetylsalicylic acid" for one substance, and nothing downstream can
   tell they are the same. The catalogue is in `@cyphix/shared` so the
   phone, the web and the server agree on what was meant — see that file
   for why the codes are CYPHIX's own and do not pretend to be SNOMED.

   ★ And "Something else" is always there. A list that cannot express the
   patient's real answer is worse than no list, because it teaches people
   to pick the nearest wrong thing — which is then recorded as if it were
   true.

   ══ ⚠️ THE LIST SCROLLS AND SAVE IS PINNED ⚠️ ══
   Both learned the hard way. `BottomSheet` caps its panel at 82 % of the
   window with `overflow: hidden`, so twenty-three catalogue rows plus a
   Save button did not overflow — the button was CLIPPED and simply was
   not on screen. Anything that can outgrow the sheet goes in the scroll
   area; anything that must always be reachable goes in `footer`.

   ══ NOTHING IS SAVED UNTIL SAVE ══
   Toggling a row edits a local draft. A sheet that wrote on every tap
   would fire a request per toggle, and a patient who opened it to look
   would leave having changed their record. Dismissing keeps what was
   already stored.
   ================================================================== */

import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  catalogueFor,
  codedFromCatalogue,
  codedFromFreeText,
  FREE_TEXT_MAX,
  LIST_MAX,
  OTHER_CODE,
  type CatalogueKind,
  type CodedAnswer,
} from '@cyphix/shared';
import BottomSheet from '@/components/molecules/BottomSheet';
import { useTranslation } from '@/i18n/useTranslation';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  kind: CatalogueKind;
  /** Title of the sheet — the section's own name. */
  title: string;
  /** What is stored today. Display strings; codes are matched where present. */
  selected: readonly CodedAnswer[];
  saving: boolean;
  /** Shown above Save when the write failed. The draft is kept. */
  error?: string;
  onClose: () => void;
  onSave: (next: CodedAnswer[]) => void;
}

export default function CardListEditor({
  visible,
  kind,
  title,
  selected,
  saving,
  error,
  onClose,
  onSave,
}: Props) {
  const t = useTheme();
  const { t: tr, rtl } = useTranslation();
  const align = rtl ? ('right' as const) : ('left' as const);

  const catalogue = useMemo(() => catalogueFor(kind), [kind]);

  /** The draft. Seeded from what is stored each time the sheet opens. */
  const [draft, setDraft] = useState<CodedAnswer[]>([]);
  const [typed, setTyped] = useState('');

  /* ★ Seeded DURING RENDER on the open, not in an effect — React's own
     "adjusting state when a prop changes" pattern.

     An effect would run AFTER the sheet had already been committed with
     the previous draft, so opening cost two full commits of two dozen
     rows: one to mount them, one to correct them. That second commit
     landed on the UI thread during the entrance animation, which is
     part of what "it comes up in frames" was. Set here, React re-runs
     this component before committing anything, and the rows are only
     ever built once.

     On OPEN only: re-seeding whenever `selected` changes would throw the
     draft away the moment a save lands and the card refetches, and the
     edit would appear to undo itself. */
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setDraft([...selected]);
      setTyped('');
    }
  }

  /* Matched on CODE where both sides have one, and on display text
     otherwise. The seeded demo data carries real SNOMED codes for some
     entries, so a code-only match would show "Penicillin" as unselected
     while it is plainly on the card. */
  const isPicked = (display: string, code?: string) =>
    draft.some((d) => (code && d.code ? d.code === code : d.display === display));

  const toggle = (display: string, code?: string) => {
    void Haptics.selectionAsync();
    setDraft((prev) =>
      isPicked(display, code)
        ? prev.filter((d) => (code && d.code ? d.code !== code : d.display !== display))
        : prev.length >= LIST_MAX
          ? prev
          : [...prev, codedFromCatalogue({ code: code ?? OTHER_CODE, display })],
    );
  };

  const addTyped = () => {
    const text = typed.trim();
    if (!text || draft.length >= LIST_MAX) return;
    if (draft.some((d) => d.display.toLowerCase() === text.toLowerCase())) {
      setTyped('');
      return;
    }
    void Haptics.selectionAsync();
    setDraft((prev) => [...prev, codedFromFreeText(text)]);
    setTyped('');
  };

  /* Anything already on the card that is not in the catalogue — typed by
     this patient, or written by a clinician from a richer vocabulary.
     It is listed FIRST and stays removable: a list that silently drops
     what it cannot represent would delete a clinician's entry the moment
     a patient opened the sheet to add a different one. */
  const extras = draft.filter((d) => !catalogue.some((c) => c.display === d.display || c.code === d.code));

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      closeLabel={tr('back')}
      scrollable
      footer={
        <View style={[styles.footer, { borderTopColor: t.border }]}>
          {/* ★ Shown, and the sheet stays OPEN with the draft intact.
              Closing on failure would discard what was just typed and
              leave the patient believing it was saved — the one outcome a
              medical record must never produce. */}
          {error && (
            <Text style={[styles.error, { color: t.attention, textAlign: align }]}>{error}</Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => onSave(draft)}
            style={({ pressed }) => [
              styles.save,
              { backgroundColor: t.accent, opacity: saving ? 0.5 : pressed ? 0.75 : 1 },
            ]}
          >
            <Text style={styles.saveText}>{saving ? tr('cardSaving') : tr('cardSave')}</Text>
          </Pressable>
        </View>
      }
    >
      <View style={styles.root}>
        {extras.map((item) => (
          <Pressable
            key={`extra-${item.display}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: true }}
            onPress={() => toggle(item.display, item.code)}
            style={({ pressed }) => [styles.row, rtl && styles.rowRtl, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="checkmark-circle" size={22} color={t.signal} />
            <Text style={[styles.label, { color: t.textPrimary, textAlign: align }]}>
              {item.display}
            </Text>
          </Pressable>
        ))}

        {catalogue.map((entry) => {
          const picked = isPicked(entry.display, entry.code);
          return (
            <Pressable
              key={entry.code}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: picked }}
              onPress={() => toggle(entry.display, entry.code)}
              style={({ pressed }) => [
                styles.row,
                rtl && styles.rowRtl,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons
                name={picked ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={picked ? t.signal : t.textTertiary}
              />
              <Text
                style={[
                  styles.label,
                  { color: picked ? t.textPrimary : t.textSecondary, textAlign: align },
                ]}
              >
                {entry.display}
              </Text>
            </Pressable>
          );
        })}

        <View style={[styles.rule, { backgroundColor: t.border }]} />

        {/* ★ Always present. See the header: a list that cannot express the
            patient's real answer teaches them to pick the nearest wrong
            one, which is then recorded as if it were true. */}
        <View style={[styles.addRow, rtl && styles.rowRtl]}>
          <TextInput
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={addTyped}
            returnKeyType="done"
            maxLength={FREE_TEXT_MAX}
            placeholder={tr('cardAddOther')}
            placeholderTextColor={t.textTertiary}
            style={[
              styles.input,
              { color: t.textPrimary, borderColor: t.border, backgroundColor: t.bgSoft, textAlign: align },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('cardAdd')}
            disabled={typed.trim() === ''}
            onPress={addTyped}
            style={({ pressed }) => [
              styles.addBtn,
              { backgroundColor: t.accent, opacity: typed.trim() === '' ? 0.35 : pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 2 },
  rowRtl: { flexDirection: 'row-reverse' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  label: { flex: 1, fontSize: 15.5, fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 10 },

  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  addBtn: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },

  /* The hairline is not decoration: it is what says the list ABOVE
     scrolls and this does not. Without it a pinned button reads as the
     last row of the list, which is exactly the row people scroll past. */
  footer: {
    paddingHorizontal: 4,
    paddingTop: 12,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  save: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
  },
  saveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  error: { marginTop: 12, fontSize: 13, lineHeight: 18, fontWeight: '600' },
});

// v1.2.0 — The draft is seeded during RENDER rather than in an effect, so
//          opening builds the rows once instead of twice — the second commit
//          was landing on the UI thread mid-animation. The pinned footer gains
//          the hairline that says the list above it scrolls and it does not.
// v1.1.0 — The list SCROLLS and Save is PINNED in the sheet's footer. Both had
//          to change: the panel clips at 82 % of the window, so Save sat under
//          23 rows and was never on screen — "the confirm is hidden and I can't
//          save anything" is what a clipped sheet looks like from outside.
// v1.0.0 — One sheet for all three list categories, over the blurred card it is
//          editing. Picks come from the shared catalogue so three systems agree
//          on what was meant; "something else" is always available, because a
//          list that cannot express the real answer teaches people to pick the
//          nearest wrong one. Nothing is written until Save — a sheet that
//          saved per tap would change a record somebody opened to look at.
