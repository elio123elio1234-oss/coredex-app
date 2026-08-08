/* ==================================================================
   ReminderSheet (organism) — "remind me to measure, at these times".

     ┌ REMINDERS ─────────────────────────────┐
     │  Remind me to measure          ( ●   ) │
     │                                        │
     │  HOW MANY TIMES A DAY                  │
     │  [  1  ][  2  ][  3  ][  4  ]          │
     │                                        │
     │  ◷  Morning                    08:00 › │
     │  ◷  Midday                     14:00 › │
     │  ◷  Evening                    20:00 › │
     │                                        │
     │  Next reminder today at 20:00          │
     └────────────────────────────────────────┘

   ══ COUNT FIRST, THEN TIMES ══
   "How many times a day" is the question a patient (or their doctor)
   actually has an answer to — "twice" — and the times follow from it.
   Asking for times first means an empty list and an add button, which is
   a data-entry form. Picking 2 fills in a morning and an evening that are
   already right for most people and can then be nudged.

   The row labels are PARTS OF THE DAY, not "Reminder 1". At a glance the
   list reads as a day rather than as a numbered set, which is what makes
   it checkable without reading the numbers.

   ══ THE TIME PICKER IS THE OS'S ══
   `@react-native-community/datetimepicker` renders the real iOS wheel and
   the real Android clock dialog. A hand-built picker is the single
   fastest way to make a settings screen feel like a website, and this one
   is used by people who have set an alarm on this phone a thousand times.

   ══ WHAT IT DOES NOT SAY ══
   Nowhere does this sheet suggest how often anyone should measure. Four is
   a UI bound, not a recommendation, and there is no "recommended" marker
   on any option — telling a patient how often to take an ECG is a clinical
   instruction and this app does not give those.
   ================================================================== */

import { useMemo, useState } from 'react';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { formatMinutes, MAX_REMINDERS_PER_DAY, type ReminderSlot } from '@cyphix/shared';
import BottomSheet from '@/components/molecules/BottomSheet';
import SegmentedControl from '@/components/molecules/SegmentedControl';
import { useReminders } from '@/features/reminders/useReminders';
import { useTranslation } from '@/i18n/useTranslation';
import type { TranslationKey } from '@/i18n/config';
import { RADIUS } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * What each row is called, by its position in the day.
 *
 * Chosen from the slot's own TIME rather than its index, so a patient who
 * drags their second reminder to 07:30 sees "Morning" and not "Midday".
 * The boundaries are ordinary waking-day language, not clinical periods.
 */
function partOfDay(at: number): TranslationKey {
  if (at < 11 * 60) return 'remPartMorning';
  if (at < 15 * 60) return 'remPartMidday';
  if (at < 19 * 60) return 'remPartAfternoon';
  return 'remPartEvening';
}

export default function ReminderSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const { t: tr, lang, rtl } = useTranslation();
  const reminders = useReminders();

  /** The slot whose picker is open. Null when none is. */
  const [editing, setEditing] = useState<ReminderSlot | null>(null);

  const align = rtl ? ('right' as const) : ('left' as const);
  const count = Math.max(1, reminders.schedule.slots.length);

  const countOptions = useMemo(
    () =>
      Array.from({ length: MAX_REMINDERS_PER_DAY }, (_, i) => ({
        value: String(i + 1),
        label: String(i + 1),
      })),
    [],
  );

  /** A `Date` carrying only the time — what the OS picker takes. */
  const asDate = (at: number): Date => {
    const d = new Date();
    d.setHours(Math.floor(at / 60), at % 60, 0, 0);
    return d;
  };

  const onPicked = (event: DateTimePickerEvent, date?: Date) => {
    /* Android's dialog is modal and reports its own dismissal; iOS's inline
       wheel does not, and is closed by the Done row below it. Treating
       them the same is how the Android picker ends up un-closable. */
    if (Platform.OS === 'android') setEditing(null);
    if (event.type === 'dismissed' || !date || !editing) return;
    void Haptics.selectionAsync();
    reminders.setSlotTime(editing.id, date.getHours() * 60 + date.getMinutes());
  };

  const nextText = reminders.next
    ? tr('remNextAt', {
        when: reminders.next.toLocaleString(lang, {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      })
    : null;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={tr('remTitle')}
      closeLabel={tr('remClose')}
    >
      <View style={styles.root}>
        <View style={[styles.switchRow, rtl && styles.rowRtl]}>
          <View style={styles.switchText}>
            <Text style={[styles.label, { color: t.textPrimary, textAlign: align }]}>
              {tr('remEnable')}
            </Text>
            <Text style={[styles.hint, { color: t.textSecondary, textAlign: align }]}>
              {tr('remEnableDesc')}
            </Text>
          </View>
          <Switch
            value={reminders.schedule.enabled}
            onValueChange={(v) => {
              void Haptics.selectionAsync();
              reminders.setEnabled(v);
            }}
            accessibilityLabel={tr('remEnable')}
          />
        </View>

        {/* ★ Permission is the one state that makes everything below a lie.
            A schedule that looks armed and silently never fires is worse
            than one that is plainly off, so it is said here, in words,
            with what to do about it. */}
        {reminders.schedule.enabled && reminders.permission === 'denied' && (
          <View style={[styles.notice, { backgroundColor: t.attentionSoft }]}>
            <Ionicons name="notifications-off-outline" size={16} color={t.attention} />
            <Text style={[styles.noticeText, { color: t.attention, textAlign: align }]}>
              {tr('remDenied')}
            </Text>
          </View>
        )}

        {reminders.schedule.enabled && (
          <>
            <Text style={[styles.section, { color: t.textTertiary, textAlign: align }]}>
              {tr('remHowMany')}
            </Text>
            <SegmentedControl
              options={countOptions}
              value={String(count)}
              onChange={(v) => reminders.setCount(Number(v))}
              accessibilityLabel={tr('remHowMany')}
            />

            <View style={styles.slots}>
              {reminders.schedule.slots.map((slot, i) => {
                const open = editing?.id === slot.id;
                return (
                  <View key={slot.id}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${tr(partOfDay(slot.at))} ${formatMinutes(slot.at)}`}
                      onPress={() => {
                        void Haptics.selectionAsync();
                        setEditing(open ? null : slot);
                      }}
                      style={({ pressed }) => [
                        styles.slotRow,
                        rtl && styles.rowRtl,
                        {
                          borderTopColor: t.border,
                          borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="time-outline"
                        size={17}
                        color={open ? t.accentLive : t.textTertiary}
                      />
                      <Text style={[styles.slotLabel, { color: t.textPrimary }]}>
                        {tr(partOfDay(slot.at))}
                      </Text>
                      <Text
                        style={[styles.slotTime, { color: open ? t.accentLive : t.textSecondary }]}
                        allowFontScaling={false}
                      >
                        {formatMinutes(slot.at)}
                      </Text>
                      <Ionicons
                        name={open ? 'chevron-down' : rtl ? 'chevron-back' : 'chevron-forward'}
                        size={15}
                        color={t.textTertiary}
                      />
                    </Pressable>

                    {open && (
                      <View style={styles.picker}>
                        <DateTimePicker
                          value={asDate(slot.at)}
                          mode="time"
                          /* `spinner` on iOS: the wheel is what "set a time"
                             has looked like on this phone since 2007, and
                             the compact variant opens a popover that fights
                             a bottom sheet for the same corner. */
                          display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                          onChange={onPicked}
                          locale={lang}
                        />
                        {Platform.OS === 'ios' && (
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setEditing(null)}
                            style={({ pressed }) => [
                              styles.done,
                              { borderColor: t.border, opacity: pressed ? 0.6 : 1 },
                            ]}
                          >
                            <Text style={[styles.doneText, { color: t.accentLive }]}>
                              {tr('remDone')}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {nextText && (
              <Text style={[styles.next, { color: t.textSecondary, textAlign: align }]}>
                {nextText}
              </Text>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  rowRtl: { flexDirection: 'row-reverse' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  switchText: { flex: 1, flexShrink: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 15.5, fontWeight: '700' },
  hint: { fontSize: 12.5, lineHeight: 17 },

  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
  },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 17 },

  section: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },

  slots: { gap: 0 },
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  slotLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  slotTime: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  picker: { alignItems: 'center', gap: 4, paddingBottom: 6 },
  done: {
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doneText: { fontSize: 14.5, fontWeight: '700' },

  next: { fontSize: 12.5, lineHeight: 18 },
});

// v1.0.0 — The reminder editor: how many times a day first (the question a
//          patient has an answer to), then times named by part of the day and
//          set through the OS's own picker. Says plainly when notification
//          permission has been denied, because a schedule that looks armed and
//          never fires is worse than one that is plainly off.
