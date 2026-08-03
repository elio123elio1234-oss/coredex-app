/* ==================================================================
   AuthField (molecule) — a labelled text input: 52 pt tall, 13 pt
   corners, a near-white resting fill that goes white and navy-edged on
   focus, and room on the trailing edge for one action (the password
   Show/Hide).

   Focus is tracked in state rather than left to the platform because the
   reference's focus style changes the BACKGROUND as well as the border,
   and RN has no `:focus`.

   It owns no validation. Whether an address is usable is decided in
   `onboardingModel.ts`; this renders what it is told and reports what is
   typed.
   ================================================================== */

import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import { AUTH_METRICS, type AuthPalette } from '@/theme/authTheme';

interface Props {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  palette: AuthPalette;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoComplete?: TextInputProps['autoComplete'];
  textContentType?: TextInputProps['textContentType'];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  /** Rendered inside the field, on the trailing edge. */
  trailing?: React.ReactNode;
  /** Digits read better tracked when the field IS a number. */
  numeric?: boolean;
  rtl?: boolean;
}

export default function AuthField({
  label,
  value,
  onChangeText,
  palette,
  placeholder,
  keyboardType,
  autoComplete,
  textContentType,
  secureTextEntry,
  autoCapitalize = 'none',
  returnKeyType,
  onSubmitEditing,
  trailing,
  numeric = false,
  rtl = false,
}: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <AuthLabel palette={palette} style={[styles.label, rtl && styles.labelRtl]}>
        {label}
      </AuthLabel>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          placeholderTextColor={palette.placeholder}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          style={[
            styles.input,
            numeric && styles.numeric,
            {
              color: palette.heading,
              backgroundColor: focused ? palette.page : palette.field,
              borderColor: focused ? palette.navy : palette.border,
              textAlign: rtl ? 'right' : 'left',
              /* Explicit sides, not `paddingEnd`: the app does not switch
                 `I18nManager` (see i18n/I18nProvider), so `end` would stay
                 the right edge in Hebrew while the button moved left, and
                 the text would run underneath it. */
              paddingRight: trailing && !rtl ? 62 : 15,
              paddingLeft: trailing && rtl ? 62 : 15,
            },
          ]}
        />
        {trailing != null && (
          <View style={[styles.trailing, rtl ? styles.trailingStart : styles.trailingEnd]}>
            {trailing}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  label: { marginBottom: 0 },
  labelRtl: { textAlign: 'right' },
  row: { position: 'relative', justifyContent: 'center' },
  input: {
    height: AUTH_METRICS.fieldHeight,
    borderWidth: 1,
    borderRadius: AUTH_METRICS.fieldRadius,
    paddingHorizontal: 15,
    fontSize: 15.5,
  },
  numeric: { fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  /* Two whole styles rather than one with an overridden side: RN keeps
     `right: undefined` in the flattened style on some paths, and a field
     with both edges set is a control that jumps in Hebrew. */
  trailing: { position: 'absolute', top: 8, height: 36, justifyContent: 'center' },
  trailingEnd: { right: 8 },
  trailingStart: { left: 8 },
});

// v1.0.0 — Labelled input with the reference's focus treatment.
