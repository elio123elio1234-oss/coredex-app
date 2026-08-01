/* ==================================================================
   LanguageSelectRow (molecule) — the language picker.

   ══ WHY A ROW OF PILLS AND NOT A DROPDOWN ══
   The web uses a `<select>` because a browser gives it a native, scrolling
   menu for free. React Native has no cross-platform equivalent that is not
   a modal, and a modal to change two options is heavier than the choice.
   Pills also keep the whole answer on screen: an elderly patient who does
   not read English cannot be asked to open a menu whose LABEL is in the
   language they are trying to leave.

   ══ REGISTRY-DRIVEN, LIKE THE WEB ATOM ══
   The options come from `LANG_META`, so registering a language in
   `i18n/config.ts` makes it appear here with no edit to this file. It
   wraps, so a third and fourth language cost a row, not a redesign.

   Each language is written IN ITSELF ("עברית", never "Hebrew") — the one
   label a speaker of it is guaranteed to recognise.
   ================================================================== */

import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LANG_CODES, LANG_META, type LangCode } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  value: LangCode;
  onChange: (lang: LangCode) => void;
  /** Already-translated group label, for screen readers. */
  accessibilityLabel?: string;
}

export default function LanguageSelectRow({ value, onChange, accessibilityLabel }: Props) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.row}
    >
      {LANG_CODES.map((code) => {
        const active = code === value;
        return (
          <Pressable
            key={code}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={LANG_META[code].name}
            onPress={() => {
              if (active) return;
              void Haptics.selectionAsync();
              onChange(code);
            }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: active ? t.brandNavy : t.bgSoft,
                borderColor: active ? t.brandNavy : t.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[styles.label, { color: active ? '#FFFFFF' : t.textSecondary }]}
              numberOfLines={1}
            >
              {LANG_META[code].name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 4 },
  /* 44 pt tall: this is aimed at the same unsteady hands as every other
     control in Settings, so it is a real tap target, not a chip. */
  pill: {
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 18,
  },
  label: { fontSize: 15, fontWeight: '800' },
});

// v1.0.0 — Registry-driven language picker; each language named in itself.
