/* ==================================================================
   FailSoft (atom) — an error boundary for DECORATION, so a cosmetic
   defect can never be a fatal one.

   ══════════════════════════════════════════════════════════════════
   ★ WHY THIS EXISTS: BLAST RADIUS, NOT BUGS
   ══════════════════════════════════════════════════════════════════
   React has no partial failure. An exception thrown while rendering
   ANY component unmounts the whole tree from the nearest boundary
   upward — and until this file there was no boundary in the app at
   all, so "the nearest boundary" was the root. Every component was
   therefore load-bearing, including the ones that draw nothing anybody
   needs.

   That is tolerable for a screen you can navigate away from. It is not
   tolerable on `BootSplash`, which is the FIRST thing rendered: a throw
   there is not a missing animation, it is an app that does not start,
   with no screen left to report it from and no way for the patient to
   get past it. The ornament on the splash had the same blast radius as
   the ECG.

   ⚠️ This is NOT a licence to be careless behind it, and it is not a
   general-purpose wrapper. It is for elements whose absence is
   invisible — an animation, a flourish. **Never put clinical content
   behind it.** A waveform, a measurement or a verdict that silently
   fails to draw is far worse than one that fails loudly: the reader
   cannot tell "not present" from "not rendered", and a missing finding
   reads as a normal one. If something here is important enough that
   its absence changes what a reader believes, it does not belong in a
   `fallback` — it belongs in an error state of its own.

   ── WHY THE FALLBACK IS SILENT ON SCREEN ──
   The caller supplies what to show instead, and the patient is told
   nothing. For decoration that is correct: escalating "the loading
   flourish failed" to someone waiting for their heart trace is noise
   about a thing that does not matter to them. It is not invisible to
   US, though — the throw is logged with the caller's label, which is
   the record that the fallback is on screen.
   ================================================================== */

import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * The last thing this boundary caught, for Settings › About.
 *
 * ★ WHY A DIAGNOSTIC IS PART OF THE BOUNDARY. v0.85.1 wrapped the boot orb
 * with the previous `ActivityIndicator` as its fallback — which meant a
 * CRASHED orb and an orb that had simply not started looked **identical**
 * on screen. It was reported as "I only see the old circle", and neither
 * of us could tell which of the two it was without another release.
 *
 * That is the same mistake the session diagnostic made in v0.82.0: a tool
 * that records only one of two outcomes cannot distinguish them. A silent
 * fallback is right for the patient and wrong for everybody else, so the
 * failure is silent ON SCREEN and loud in the one place built for it.
 *
 * A module-level `let`, not state: nothing re-renders when a boundary
 * trips, and Settings is opened long afterwards. It survives until the
 * app is killed, which is exactly as long as the question lasts.
 */
let lastFailure: string | null = null;

/** What `FailSoft` last caught, or `null` if nothing has failed. */
export function failSoftReport(): string | null {
  return lastFailure;
}

interface Props {
  children: ReactNode;
  /** Rendered instead, if `children` ever throws. Must not throw itself. */
  fallback: ReactNode;
  /** Names the failing element in the log. "boot orb", not "component". */
  label: string;
}

interface State {
  failed: boolean;
}

export default class FailSoft extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    /* Readable from the phone, which is the only place that matters — a
       `console.warn` on a device nobody is debugging is not a record. */
    lastFailure = `${this.props.label}: ${error.message || String(error)}`;
    /* And the full version for anyone who IS attached. NOT the audit log:
       this boundary is for decoration, and the audit trail is for things
       that happened to a PATIENT's data. Filling it with rendering trivia
       is how a trail stops being read. */
    console.warn(`[FailSoft] ${this.props.label} failed and was replaced`, error, info.componentStack);
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// v1.0.0 — The app's first error boundary, scoped to DECORATION. React has no
//          partial failure: a throw unmounts the tree from the nearest boundary
//          up, and there was none, so every component was load-bearing — which
//          on `BootSplash`, the first screen rendered, meant an ornament could
//          stop the app from starting at all. ⚠️ Never wrap clinical content in
//          it: content that silently fails to draw cannot be told apart from
//          content that was not there, and a missing finding reads as a normal
//          one.
