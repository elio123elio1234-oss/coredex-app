/* ==================================================================
   THE REGISTRY - the one list of every screening rule.

   * THIS FILE IS THE ONLY PLACE A RULE IS REGISTERED, and adding a disease
   is therefore exactly two steps: write its file, add its line here. The
   runner iterates this array and knows nothing else about the rule set, so
   nothing downstream has to be told that a new rule exists.

   ORDER IS NOT PRIORITY. Findings are sorted for display by the runner
   (urgent first, then confidence, then category); the order here is
   alphabetical within a category purely so a human can find a rule.

   RULE_COUNT is the denominator of "41 of 43 checks ran", the number that
   makes a clear result mean anything. It is DERIVED from the array rather
   than written down, so it cannot go stale.
   ================================================================== */

import type { ScreeningRule } from './types';

import { rule as bradycardia } from './rate/bradycardia';
import { rule as bradycardiaSevere } from './rate/bradycardiaSevere';
import { rule as tachycardia } from './rate/tachycardia';
import { rule as tachycardiaExtreme } from './rate/tachycardiaExtreme';
import { rule as atrialFibrillation } from './rhythm/atrialFibrillation';
import { rule as atrialFlutter } from './rhythm/atrialFlutter';
import { rule as ectopyFrequent } from './rhythm/ectopyFrequent';
import { rule as ectopyOccasional } from './rhythm/ectopyOccasional';
import { rule as irregularRhythm } from './rhythm/irregularRhythm';
import { rule as pause } from './rhythm/pause';
import { rule as pauseLong } from './rhythm/pauseLong';
import { rule as svt } from './rhythm/svt';
import { rule as wideComplexTachycardia } from './rhythm/wideComplexTachycardia';
import { rule as avBlock1 } from './conduction/avBlock1';
import { rule as avBlock1Marked } from './conduction/avBlock1Marked';
import { rule as avBlock2Suspected } from './conduction/avBlock2Suspected';
import { rule as avBlockCompleteSuspected } from './conduction/avBlockCompleteSuspected';
import { rule as bbbIndeterminate } from './conduction/bbbIndeterminate';
import { rule as bbbLeftPattern } from './conduction/bbbLeftPattern';
import { rule as bbbRightPattern } from './conduction/bbbRightPattern';
import { rule as ivcd } from './conduction/ivcd';
import { rule as lafb } from './conduction/lafb';
import { rule as lpfb } from './conduction/lpfb';
import { rule as qtLong } from './repolarisation/qtLong';
import { rule as qtLongSevere } from './repolarisation/qtLongSevere';
import { rule as qtShort } from './repolarisation/qtShort';
import { rule as tInversionInferior } from './repolarisation/tInversionInferior';
import { rule as tInversionLateral } from './repolarisation/tInversionLateral';
import { rule as axisExtreme } from './axis/axisExtreme';
import { rule as axisLeft } from './axis/axisLeft';
import { rule as axisRight } from './axis/axisRight';
import { rule as lvhVoltage } from './chamber/lvhVoltage';
import { rule as raEnlargement } from './chamber/raEnlargement';
import { rule as qWavesInferior } from './ischaemia/qWavesInferior';
import { rule as qWavesLateral } from './ischaemia/qWavesLateral';
import { rule as stDepressionInferior } from './ischaemia/stDepressionInferior';
import { rule as stDepressionLateral } from './ischaemia/stDepressionLateral';
import { rule as stElevationInferior } from './ischaemia/stElevationInferior';
import { rule as stElevationLateral } from './ischaemia/stElevationLateral';
import { rule as electricalAlternans } from './other/electricalAlternans';
import { rule as hyperkalaemiaPattern } from './other/hyperkalaemiaPattern';
import { rule as lowVoltage } from './other/lowVoltage';
import { rule as leadReversal } from './technical/leadReversal';

export const ALL_RULES: readonly ScreeningRule[] = [
  /* -- rate -- */
  bradycardia,
  bradycardiaSevere,
  tachycardia,
  tachycardiaExtreme,
  /* -- rhythm -- */
  atrialFibrillation,
  atrialFlutter,
  ectopyFrequent,
  ectopyOccasional,
  irregularRhythm,
  pause,
  pauseLong,
  svt,
  wideComplexTachycardia,
  /* -- conduction -- */
  avBlock1,
  avBlock1Marked,
  avBlock2Suspected,
  avBlockCompleteSuspected,
  bbbIndeterminate,
  bbbLeftPattern,
  bbbRightPattern,
  ivcd,
  lafb,
  lpfb,
  /* -- repolarisation -- */
  qtLong,
  qtLongSevere,
  qtShort,
  tInversionInferior,
  tInversionLateral,
  /* -- axis -- */
  axisExtreme,
  axisLeft,
  axisRight,
  /* -- chamber -- */
  lvhVoltage,
  raEnlargement,
  /* -- ischaemia -- */
  qWavesInferior,
  qWavesLateral,
  stDepressionInferior,
  stDepressionLateral,
  stElevationInferior,
  stElevationLateral,
  /* -- other -- */
  electricalAlternans,
  hyperkalaemiaPattern,
  lowVoltage,
  /* -- technical -- */
  leadReversal,
];

/** The denominator of the checks-run line. Derived, never written down. */
export const RULE_COUNT = ALL_RULES.length;

// v1.0.0 - Every screening rule, registered once.
