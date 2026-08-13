/* The screening layer's public face. Everything else under `screening/` is
   internal: the 43 rule files are reached only through the registry, and the
   registry only through the runner. A consumer imports `screenLimbEcg` and
   nothing else. */

export { screenLimbEcg } from './runner';
export { ALL_RULES, RULE_COUNT } from './registry';
export { BORDERLINE_MARGIN } from './types';
export type { ScreeningRule, RuleContext, RuleHit, RuleResult, BeatMetric } from './types';

// v1.0.0 - Public surface of the screening layer.
