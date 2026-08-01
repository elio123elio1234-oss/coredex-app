/* ==================================================================
   Annotation quick tags — the labels a reader reaches for most.
   Ported from the web app's `features/history/annotationTags.ts`.

   ══ THESE ARE THE CLINICIAN'S WORDS, NOT THE SOFTWARE'S ══
   The app never applies any of these by itself. The analysis can say "this
   beat arrived 23% early"; only a human may write "PVC" next to it. That is
   the difference between a measurement and an interpretation, and this
   product is validated for the former only.

   Offering a shortlist rather than free text alone is not just convenience:
   it means the common cases are spelled consistently, so a future search for
   every beat someone marked "PVC" actually finds them instead of also
   needing "pvc", "P.V.C." and "prem vent". Free text stays available.

   ★ On a phone the shortlist earns its keep twice over: tapping one of five
   44 pt chips is the difference between a note that gets written and one
   that does not, because the alternative is a keyboard covering the trace
   the reader is annotating.

   ⚠️ These are display labels attached to a waveform position by a named
   author — NOT coded clinical findings. When they need to become part of a
   coded record, each maps to a SNOMED CT concept (e.g. PVC = 17338001) and
   moves into a CodeableConcept. Until then they must not be presented
   anywhere as a diagnosis.
   ================================================================== */

import type { TranslationKey } from '@/i18n/config';

export interface AnnotationTag {
  id: string;
  labelKey: TranslationKey;
  /** Colour role. */
  tone: 'beat' | 'artifact' | 'note';
}

export const ANNOTATION_TAGS: readonly AnnotationTag[] = [
  { id: 'PVC', labelKey: 'tagPvc', tone: 'beat' },
  { id: 'PAC', labelKey: 'tagPac', tone: 'beat' },
  { id: 'PAUSE', labelKey: 'tagPause', tone: 'beat' },
  { id: 'ARTIFACT', labelKey: 'tagArtifact', tone: 'artifact' },
  { id: 'NOTE', labelKey: 'tagNote', tone: 'note' },
] as const;

export function tagTone(text: string): AnnotationTag['tone'] {
  return ANNOTATION_TAGS.find((tg) => text.toUpperCase().startsWith(tg.id))?.tone ?? 'note';
}

// v1.0.0 — Quick-tag vocabulary (display labels by a named author, never coded findings).
