/* ==================================================================
   RemindersScreen — "remind me to measure, at these times".

   ══ WHY THIS IS A SCREEN AND NOT A BOTTOM SHEET ══
   It was a sheet first, and that was wrong. On iOS a Settings row with a
   chevron PUSHES a screen; a bottom sheet is for a quick action or a
   single pick — something you glance at and dismiss. This is a switch, a
   segmented control, a list of times and an inline picker, which is a
   panel of settings, and cramming it into a half-height sheet made it read
   as small and improvised.

   As a pushed route it also gets things the sheet had to fake: the native
   slide transition, the edge-swipe back gesture, a real back affordance,
   and as much height as it needs.

   ══ IT IS BUILT FROM SETTINGS' OWN PARTS ══
   `SettingsSection` and `SettingsRow`, the same backdrop, the same top
   bar, the same page metrics. Not for code reuse — for CONTINUITY. This
   screen is reached from Settings and is part of it, so a bespoke layout
   would announce itself as somewhere else.

   ══ ★ ONE CARD, NO PROSE ══
   It grew to four sections, three descriptions, a subtitle and a footnote
   — a full scrolling page to set a notification, which was reported in
   those words and was right. Everything now lives in ONE card that fits
   without scrolling, and every cut followed one rule: **a control that
   explains itself needs no sentence under it.**

   What went, and why none of it is missed:
     • the follow-up's own section, switch and description — "Ask again
       after" simply gained an OFF segment, so a whole section became one
       row with the same expressive power;
     • "Check it works" — two count rows and a test row became ONE row
       whose VALUE is the count;
     • every section description, the page subtitle, the footnote.

   What stayed, and why: the permission warning (rare, and every control
   above it is a lie without it) and the armed count (it is FACT rather
   than intent, and its absence once cost somebody an hour).

   ══ WHAT IT DOES NOT SAY ══
   Nowhere does it suggest how often anyone should measure. Four a day is a
   UI bound, not a recommendation, and no option is marked "recommended" —
   telling a patient how often to take an ECG is a clinical instruction and
   this app does not give those (`@cyphix/shared` `types/reminder`).
   ================================================================== */

import { useNavigation } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { FOLLOW_UP_CHOICES, formatMinutes, MAX_REMINDERS_PER_DAY } from '@cyphix/shared';
import HeroBackdrop from '@/components/atoms/HeroBackdrop';
import { NotificationsIllustration } from '@/components/atoms/Illustration';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import SettingsRow from '@/components/molecules/SettingsRow';
import SettingsSection from '@/components/molecules/SettingsSection';
import { usePreferences } from '@/features/preferences/usePreferences';
import { useReminders } from '@/features/reminders/useReminders';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { shellPalette } from '@/theme/shellTheme';
import { RADIUS } from '@/theme/tokens';
import { useIsDark, useTheme } from '@/theme/useTheme';

function BackChevron({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * What each row is called, by its position in the day.
 *
 * Chosen from the slot's own TIME rather than its index, so a patient who
 * moves their second reminder to 07:30 sees "Morning" and not "Reminder 2".
 * The list then reads as a day, which is what makes it checkable at a
 * glance instead of requiring the numbers to be read.
 */
function partOfDay(at: number): TranslationKey {
  if (at < 11 * 60) return 'remPartMorning';
  if (at < 15 * 60) return 'remPartMidday';
  if (at < 19 * 60) return 'remPartAfternoon';
  return 'remPartEvening';
}

export default function RemindersScreen() {
  const t = useTheme();
  const dark = useIsDark();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<{ goBack: () => void }>();
  const { t: tr, lang, rtl } = useTranslation();
  const { prefs, setNotification } = usePreferences();
  const reminders = useReminders();

  /** Which slot's picker is open. Null when none is. */
  const [editing, setEditing] = useState<string | null>(null);
  const [testState, setTestState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const palette = shellPalette(prefs.background, dark);
  const align = rtl ? ('right' as const) : ('left' as const);
  const count = Math.max(1, reminders.schedule.slots.length);

  /* The master switch gates everything: it answers "may this app remind me
     at all", and the times below it are meaningless while it is off. */
  const allowed = prefs.notifications.testReminders;
  const showTimes = allowed && reminders.schedule.enabled;

  const countOptions = useMemo(
    () =>
      Array.from({ length: MAX_REMINDERS_PER_DAY }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
    [],
  );

  /* ★ OFF is a SEGMENT, not a switch above the segments. That one choice
     removed an entire section — a switch, its description and the heading
     they lived under — for exactly the same expressive power. Minutes are
     labelled in the unit a patient thinks in: "1h", not "60". */
  const followUpOptions = useMemo(
    () => [
      { value: 'off', label: tr('remFollowOff') },
      ...FOLLOW_UP_CHOICES.map((m) => ({
        value: String(m),
        label: m < 60 ? `${m}m` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${m % 60}`,
      })),
    ],
    [tr],
  );

  /** A `Date` carrying only the time — what the OS picker takes. */
  const asDate = (at: number): Date => {
    const d = new Date();
    d.setHours(Math.floor(at / 60), at % 60, 0, 0);
    return d;
  };

  const onPicked = (slotId: string) => (event: DateTimePickerEvent, date?: Date) => {
    /* Android's dialog is modal and reports its own dismissal; iOS's inline
       wheel does not, and is closed by the Done button below it. Treating
       them the same is how the Android picker ends up un-closable. */
    if (Platform.OS === 'android') setEditing(null);
    if (event.type === 'dismissed' || !date) return;
    void Haptics.selectionAsync();
    reminders.setSlotTime(slotId, date.getHours() * 60 + date.getMinutes());
  };

  return (
    <View style={styles.root}>
      <HeroBackdrop palette={palette} />

      {/* A pushed route keeps a real back affordance rather than relying on
          the edge-swipe gesture alone — the same rule Settings follows. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('back')}
          hitSlop={12}
          onPress={() => {
            void Haptics.selectionAsync();
            nav.goBack();
          }}
          style={({ pressed }) => [
            styles.backBtn,
            rtl && styles.rowRtl,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <BackChevron color={t.textPrimary} />
          <Text style={[styles.backLabel, { color: t.textPrimary }]}>{tr('settingsTitle')}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: t.textPrimary, textAlign: align }]}>
          {tr('remTitle')}
        </Text>

        <SettingsSection art={NotificationsIllustration} title={tr('remSecWhen')}>
          <SettingsRow
            first
            label={tr('remEnable')}
            control={
              <Switch
                value={allowed && reminders.schedule.enabled}
                onValueChange={(v) => {
                  void Haptics.selectionAsync();
                  /* One switch, both settings — on THIS screen they cannot
                     usefully differ, and a patient facing two toggles that
                     both say "reminders" has to work out which is which.
                     They stay separate in the model so silencing does not
                     forget the times. */
                  if (v && !allowed) setNotification('testReminders', true);
                  reminders.setEnabled(v);
                }}
                accessibilityLabel={tr('remEnable')}
              />
            }
          />

          {showTimes && (
            <SettingsRow
              label={tr('remHowMany')}
              control={
                <SegmentedControl
                  options={countOptions}
                  value={String(count)}
                  onChange={(v) => reminders.setCount(Number(v))}
                  accessibilityLabel={tr('remHowMany')}
                />
              }
            />
          )}

          {showTimes &&
            reminders.schedule.slots.map((slot) => {
              const open = editing === slot.id;
              return (
                <View key={slot.id}>
                  <SettingsRow
                    label={tr(partOfDay(slot.at))}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      setEditing(open ? null : slot.id);
                    }}
                    value={
                      <Text
                        style={[styles.time, { color: open ? t.accentLive : t.textPrimary }]}
                        allowFontScaling={false}
                      >
                        {formatMinutes(slot.at)}
                      </Text>
                    }
                  />

                  {open && (
                    <View style={styles.picker}>
                      <DateTimePicker
                        value={asDate(slot.at)}
                        mode="time"
                        /* `spinner` on iOS: the wheel is what "set a time"
                           has looked like on this phone since 2007, and the
                           compact variant opens its own popover — a second
                           surface inside a screen that already is one. */
                        display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                        onChange={onPicked(slot.id)}
                        locale={lang}
                      />
                      {Platform.OS === 'ios' && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setEditing(null)}
                          style={({ pressed }) => [
                            styles.done,
                            { backgroundColor: t.accent, opacity: pressed ? 0.75 : 1 },
                          ]}
                        >
                          <Text style={styles.doneText}>{tr('remDone')}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

          {/* The second ask, as ONE row. It is ON by default, so the thing
              worth exposing is the delay — and OFF is just its first
              segment rather than a switch of its own. */}
          {showTimes && (
            <SettingsRow
              label={tr('remFollowAfter')}
              control={
                <SegmentedControl
                  options={followUpOptions}
                  value={
                    reminders.schedule.followUpMinutes === null
                      ? 'off'
                      : String(reminders.schedule.followUpMinutes)
                  }
                  onChange={(v) => reminders.setFollowUp(v === 'off' ? null : Number(v))}
                  accessibilityLabel={tr('remFollowAfter')}
                />
              }
            />
          )}

          {/* FACT, not intent — read from the OS, and its absence once cost
              an hour. The count is this row's VALUE rather than two rows of
              its own. */}
          {showTimes && (
            <SettingsRow
              label={tr('remTest')}
              description={testState === 'sent' ? tr('remTestSent') : undefined}
              onPress={() => {
                void Haptics.selectionAsync();
                setTestState('sending');
                void reminders.sendTest().then((ok) => setTestState(ok ? 'sent' : 'failed'));
              }}
              value={
                <Text style={[styles.armed, { color: t.textSecondary }]} allowFontScaling={false}>
                  {reminders.armed
                    ? tr('remArmed', {
                        d: String(reminders.armed.daily),
                        f: String(reminders.armed.followUps),
                      })
                    : '—'}
                </Text>
              }
            />
          )}
        </SettingsSection>

        {/* ★ Kept when nearly everything else was cut: every control above
            is a lie without it. Rare, and load-bearing when it appears. */}
        {showTimes && reminders.permission === 'denied' && (
          <View
            style={[
              styles.notice,
              { backgroundColor: t.attentionSoft, borderColor: t.attention },
              rtl && styles.rowRtl,
            ]}
          >
            <Ionicons name="notifications-off-outline" size={18} color={t.attention} />
            <Text style={[styles.noticeText, { color: t.attention, textAlign: align }]}>
              {tr('remDenied')}
            </Text>
          </View>
        )}

        {testState === 'failed' && (
          <Text style={[styles.failed, { color: t.attention, textAlign: align }]}>
            {tr('remTestFailed')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rowRtl: { flexDirection: 'row-reverse' },
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  backLabel: { fontSize: 17, fontWeight: '600' },
  /* Settings' own page metrics, deliberately — this screen is part of it. */
  page: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  title: { fontSize: 32, fontWeight: '800', paddingHorizontal: 4 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 18 },
  failed: { fontSize: 12.5, lineHeight: 18, paddingHorizontal: 4 },

  time: { fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  armed: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

  picker: { alignItems: 'center', gap: 10, paddingBottom: 14 },
  done: {
    alignSelf: 'center',
    minWidth: 140,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  doneText: { color: '#FFFFFF', fontSize: 15.5, fontWeight: '700' },
});

// v1.2.0 — Cut to ONE card that fits without scrolling. It had become four
//          sections, three descriptions, a subtitle and a footnote — a whole
//          scrolling page to set a notification. `Off` became a SEGMENT of the
//          follow-up control, collapsing a switch, a description and a heading
//          into nothing; the armed count became the test row's VALUE instead of
//          two rows of its own. Kept: the permission warning (every control
//          above it is a lie without it) and the count (fact, not intent — its
//          absence once cost an hour).
// v1.1.0 — Adds the armed count and the one-minute test.
// v1.0.0 — The reminder editor as a PUSHED SCREEN rather than a bottom sheet.
