/* ==================================================================
   patientContext — WHO a screening may be personalised for.

   ★ v2.0.0 (LAUNCH_PLAN 7.5): the rule itself moved to `@cyphix/shared`
   ecg/screeningContext.ts, verbatim, so the web's Interpretation panel
   and this phone apply ONE rule — four consumers, one copy. This module
   stays as the phone's import path (the Findings tab, the History digest
   backfill and the PDF export import from here) and re-exports it.
   ================================================================== */

export { ageYearsFrom, screeningContextFor, type ResolvedScreeningContext } from '@cyphix/shared';

// v2.0.0 — Re-exports the rule from @cyphix/shared (lifted there in 7.5; byte-identical logic).
// v1.0.0 — The "provably theirs" rule extracted from useScreening, so the
//          Findings tab, the History digest backfill and the PDF export apply
//          one rule rather than three copies of it.
