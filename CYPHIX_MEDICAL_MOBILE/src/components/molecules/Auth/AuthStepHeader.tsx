/* ==================================================================
   AuthStepHeader (molecule) — the top of every step after the welcome
   screen: ← on its own for the credential steps, and ← + progress +
   Skip for the six health steps.

   Skip is a first-class control, not a get-out. A patient who will not
   state their blood type must be able to finish the flow, and hiding
   that behind a back gesture would make them abandon the account
   instead. It appears ONLY where a value is genuinely optional.
   ================================================================== */

import { StyleSheet, View } from 'react-native';
import AuthBackButton from '@/components/atoms/Auth/AuthBackButton';
import AuthLinkButton from '@/components/atoms/Auth/AuthLinkButton';
import AuthProgressBar from './AuthProgressBar';
import { type AuthPalette } from '@/theme/authTheme';

interface Props {
  onBack: () => void;
  palette: AuthPalette;
  backLabel: string;
  rtl?: boolean;
  /** 0–1. Omit for the credential steps, which have no rail. */
  progress?: number;
  progressLabel?: string;
  /** Omit to hide Skip — the step is not optional. */
  onSkip?: () => void;
  skipLabel?: string;
}

export default function AuthStepHeader({
  onBack,
  palette,
  backLabel,
  rtl = false,
  progress,
  progressLabel,
  onSkip,
  skipLabel,
}: Props) {
  return (
    <View style={[styles.row, rtl && styles.rtl]}>
      <AuthBackButton onPress={onBack} palette={palette} rtl={rtl} accessibilityLabel={backLabel} />
      {progress !== undefined && (
        <AuthProgressBar
          progress={progress}
          palette={palette}
          accessibilityLabel={progressLabel ?? ''}
        />
      )}
      {onSkip && skipLabel && (
        <AuthLinkButton label={skipLabel} onPress={onSkip} palette={palette} align="center" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  rtl: { flexDirection: 'row-reverse' },
});

// v1.0.0 — Step header: back, optional progress rail, optional Skip.
