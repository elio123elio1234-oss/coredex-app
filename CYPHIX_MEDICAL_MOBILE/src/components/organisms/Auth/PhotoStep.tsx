/* ==================================================================
   PhotoStep (organism) — the account photo, or a colour to put initials
   on.

   The colour row is not a consolation prize. A photo is optional and a
   good number of patients will not want one on a medical record; two
   letters on a chosen tone still does the job the reference states —
   helping a clinician confirm they are looking at the right record — and
   is chosen in one tap.
   ================================================================== */

import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import AuthLabel from '@/components/atoms/Auth/AuthLabel';
import AuthPrimaryButton from '@/components/atoms/Auth/AuthPrimaryButton';
import AuthSecondaryButton from '@/components/atoms/Auth/AuthSecondaryButton';
import AvatarBubble from '@/components/molecules/Auth/AvatarBubble';
import { useTranslation } from '@/i18n/useTranslation';
import { AVATAR_TONES, type AuthPalette } from '@/theme/authTheme';
import ProfileStepShell from './ProfileStepShell';

interface Props {
  palette: AuthPalette;
  index: number;
  total: number;
  progress: number;
  initials: string;
  avatarIndex: number;
  photoUri?: string;
  onChangeAvatar: (index: number) => void;
  onTakePhoto: () => void;
  onPickPhoto: () => void;
  /** True when the OS refused camera or library access. */
  denied: boolean;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  rtl: boolean;
}

export default function PhotoStep({
  palette,
  index,
  total,
  progress,
  initials,
  avatarIndex,
  photoUri,
  onChangeAvatar,
  onTakePhoto,
  onPickPhoto,
  denied,
  onBack,
  onSkip,
  onNext,
  rtl,
}: Props) {
  const { t: tr } = useTranslation();
  const tone = AVATAR_TONES[avatarIndex % AVATAR_TONES.length];

  return (
    <ProfileStepShell
      palette={palette}
      index={index}
      total={total}
      progress={progress}
      title={tr('authPhotoTitle')}
      subtitle={tr('authPhotoSub')}
      onBack={onBack}
      onSkip={onSkip}
      onNext={onNext}
      scroll
      rtl={rtl}
    >
      <View style={styles.avatarRow}>
        <AvatarBubble
          initials={initials}
          tone={tone}
          size={132}
          photoUri={photoUri}
          elevated
          accessibilityLabel={tr('authPhotoPreviewA11y')}
        />
      </View>

      <View style={[styles.actions, rtl && styles.actionsRtl]}>
        <View style={styles.grow}>
          <AuthPrimaryButton
            label={tr('authTakePhoto')}
            onPress={onTakePhoto}
            palette={palette}
          />
        </View>
        <AuthSecondaryButton
          label={tr('authUpload')}
          onPress={onPickPhoto}
          palette={palette}
          style={styles.grow}
        />
      </View>

      {denied && (
        <Text
          accessibilityRole="alert"
          style={[styles.denied, { color: palette.body, textAlign: rtl ? 'right' : 'left' }]}
        >
          {tr('authPhotoDenied')}
        </Text>
      )}

      <AuthLabel palette={palette} style={[styles.tonesLabel, rtl && styles.rtlText]}>
        {tr('authAvatarColour')}
      </AuthLabel>

      <View
        style={[styles.tones, rtl && styles.tonesRtl]}
        accessibilityRole="radiogroup"
        accessibilityLabel={tr('authAvatarColour')}
      >
        {AVATAR_TONES.map((swatch, i) => {
          const selected = i === avatarIndex;
          return (
            <Pressable
              key={swatch}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={tr('authAvatarColourN', { n: i + 1 })}
              onPress={() => {
                void Haptics.selectionAsync();
                onChangeAvatar(i);
              }}
              style={[
                styles.swatch,
                {
                  backgroundColor: swatch,
                  borderColor: selected ? palette.navy : 'transparent',
                },
              ]}
            />
          );
        })}
      </View>
    </ProfileStepShell>
  );
}

const styles = StyleSheet.create({
  avatarRow: { alignItems: 'center', marginBottom: 22 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionsRtl: { flexDirection: 'row-reverse' },
  grow: { flex: 1 },
  denied: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  tonesLabel: { marginBottom: 12 },
  rtlText: { textAlign: 'right' },
  tones: { flexDirection: 'row', gap: 10, paddingBottom: 8 },
  tonesRtl: { flexDirection: 'row-reverse' },
  swatch: { width: 46, height: 46, borderRadius: 23, borderWidth: 3 },
});

// v1.0.0 — Account photo or an initials tone, with a spoken-out refusal.
