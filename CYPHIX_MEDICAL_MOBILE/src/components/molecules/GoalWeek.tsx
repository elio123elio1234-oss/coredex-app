/* ==================================================================
   GoalWeek (molecule) — this week against the goal, as seven dials.

      M    T    W    T    F    S    S
     ◕    ●    ◔    ●    ○    ◕    ·
     2/3  3/3  1/3  3/3  0/3  2/3

   ══ WHERE THE GOAL COMES FROM ══
   The number of reminder times the patient set. There is deliberately no
   second setting: a goal and a reminder schedule are the same intention
   said twice, and two places to state it is two places for them to
   disagree — after which the app is telling someone they missed a target
   they never set. Change the reminders, the goal follows.

   ══ WHY RINGS AND NOT BARS ══
   A ring reads as "how much of a thing is done" without a scale to
   interpret, which is the only reading available to someone glancing at
   seven of them. A bar chart asks the eye to compare heights against an
   axis, and the axis here is three — a quantity too small for a bar to
   express and too small to be worth an axis.

   ══ ⚠️ AND WHY IT NEVER SCOLDS ⚠️ ══
   An empty day is drawn as an empty ring in the ordinary border colour.
   Not red, not amber, no icon, no "missed". This is adherence, not a
   finding, and a medical app that tells a patient off for a quiet Tuesday
   is one they open less — which costs the exact thing the reminder was
   for. Days above the goal simply complete and stop; there is no reward
   state either, because "you did four instead of three" is not better
   care and implying it is would push people toward measuring for the app
   rather than for themselves.

   ══ THE FUTURE IS NOT A FAILURE ══
   Days later in the week than today are drawn at half strength and carry
   no count. A Thursday that says "0/3" on a Tuesday morning is reporting
   a miss that has not happened yet.

   Purely presentational — counts and goal come from the caller.
   ================================================================== */

import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/useTheme';

interface Props {
  /** Seven counts, Monday first — how many recordings that day held. */
  counts: readonly number[];
  /** Recordings the patient's reminder schedule asks for per day. */
  goal: number;
  /** Index into `counts` of today, so later days can be drawn as future. */
  todayIndex: number;
  /** Seven one-letter day initials, already localised, Monday first. */
  dayLetters: readonly string[];
  rtl?: boolean;
}

const SIZE = 34;
const STROKE = 3.5;

export default function GoalWeek({ counts, goal, todayIndex, dayLetters, rtl }: Props) {
  const t = useTheme();
  const radius = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(1, goal);

  return (
    <View style={[styles.row, rtl && styles.rtl]}>
      {counts.map((count, i) => {
        const future = i > todayIndex;
        const done = Math.min(1, count / target);
        const sweep = circumference * done;
        const complete = count >= target;

        return (
          <View key={dayLetters[i] + i} style={styles.day}>
            <Text
              style={[
                styles.letter,
                { color: i === todayIndex ? t.textPrimary : t.textTertiary },
              ]}
              allowFontScaling={false}
            >
              {dayLetters[i]}
            </Text>

            <Svg width={SIZE} height={SIZE} opacity={future ? 0.35 : 1}>
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={radius}
                fill="none"
                stroke={t.border}
                strokeWidth={STROKE}
              />
              {sweep > 0 && (
                <Circle
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={radius}
                  fill="none"
                  stroke={t.signal}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${sweep} ${circumference - sweep}`}
                  /* −90° so the ring starts at twelve o'clock, which is
                     where every dial a person has ever read starts. */
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                />
              )}
            </Svg>

            {/* No count on a future day — a Thursday reading "0/3" on a
                Tuesday is reporting a miss that has not happened. */}
            <Text
              style={[
                styles.count,
                { color: complete ? t.signalInk : t.textTertiary },
              ]}
              allowFontScaling={false}
            >
              {future ? '' : `${count}/${target}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rtl: { flexDirection: 'row-reverse' },
  /* Equal columns so the seven rings sit on a true grid. Without `flex: 1`
     a two-character count ("10/3") widens its own column and the whole
     week goes crooked on the busiest day. */
  day: { flex: 1, alignItems: 'center', gap: 5 },
  letter: { fontSize: 12, fontWeight: '700' },
  count: { fontSize: 11.5, fontWeight: '700', fontVariant: ['tabular-nums'], height: 15 },
});

// v1.0.0 — Seven dials against the goal the patient's own reminder schedule
//          already states — no second setting, because a goal and a schedule
//          are one intention said twice and two places to say it is two places
//          to disagree. ⚠️ It never scolds: an empty day is an empty ring in
//          the ordinary border colour, never red, never amber, no "missed".
//          Adherence is not a finding, and an app that tells someone off for a
//          quiet Tuesday is one they open less — which costs the exact thing
//          the reminder existed for.
