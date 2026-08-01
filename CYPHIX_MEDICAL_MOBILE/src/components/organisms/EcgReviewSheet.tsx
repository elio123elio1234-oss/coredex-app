/* ==================================================================
   EcgReviewSheet (organism) — the reviewable ECG, for a touch screen.

   The mobile counterpart of the web `EcgViewer`'s trace column. Same
   guarantees, different hands.

   ══ THE SCALE IS FIXED; ZOOM IS A WINDOW ══
   Always 25 mm/s : 10 mm/mV. Zooming changes how many MILLIMETRES OF PAPER
   fit across the glass, never the relationship between them, so a caliper
   reading is the true interval at any zoom and the grid squares stay
   square. `windowMm` is the whole of the zoom state.

   ══ ONE SCROLL, SIX LEADS ══
   All the leads live inside ONE horizontal scroll, so they always show the
   same instant. Six independently scrolled strips would let a reader
   compare 2.1 s of one lead against 3.4 s of another without noticing — a
   genuine misread, not a glitch. The lead labels are pinned outside it.

   ══════════════════════════════════════════════════════════════════
   ★ WHY EVERY HANDLE TURNS THE SCROLL OFF THE MOMENT IT IS TOUCHED
   ══════════════════════════════════════════════════════════════════
   v0.15.0 shipped every draggable thing here as a `PanResponder` that
   claimed the gesture on MOVE. It does not work, and the failure is not
   subtle: a `ScrollView` that has already begun panning OWNS the responder,
   and a child asking for it afterwards is simply ignored. So grabbing a
   caliper crosshair scrolled the paper underneath it — the crosshair moved
   AND the trace moved, and the measurement could not be placed at all.
   Cursor lines and markers had the same defect for the same reason.

   The fix is to decide before the pan can start: every handle claims on
   TOUCH-DOWN (`onStartShouldSetPanResponder`) and sets `dragging` in its
   `onPanResponderGrant`, which flips `scrollEnabled` to false in the same
   commit. The ScrollView therefore never begins. Release turns it back on.

   A handle that must ALSO be tappable (a marker opens its composer; a
   reference line is removed by tapping it) cannot use a `Pressable` inside
   the responder — the responder swallows it. So tap and drag are told apart
   on RELEASE by how far the finger travelled: under `TAP_SLOP` it was a tap.

   ══ WHY EVERY HANDLE IS DRAGGED RELATIVELY ══
   Everything here moves by the finger's DELTA, never to its absolute
   position. A fingertip is ~9 mm across — at 25 mm/s that is 360 ms of ECG,
   wider than a QRS — so an absolute drag hides the thing being positioned
   under the hand that is positioning it.
   ================================================================== */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderHandlers,
  type LayoutChangeEvent,
} from 'react-native';
import { STANDARD_MM_PER_SEC, type LimbLeadName, type RecordingAnnotation } from '@cyphix/shared';
import EcgReviewStrip, {
  CAL_WIDTH_MM,
  type StripPalette,
} from '@/components/molecules/EcgReviewStrip';
import { tagTone } from '@/features/history/annotationTags';
import type { UseCalipersResult } from '@/features/history/hooks/useCalipers';
import type { RecordingView } from '@/features/history/hooks/useRecordingView';
import type { OverlayView } from '@/features/history/hooks/useOverlayRecording';
import { useTheme } from '@/theme/useTheme';

export type ViewerMode = 'read' | 'calipers' | 'mark' | 'cursor' | 'ghost';

interface Props {
  view: RecordingView;
  leads: LimbLeadName[];
  /** Millimetres of paper across the viewport. Smaller = more zoomed in. */
  windowMm: number;
  stripHeightMm: number;
  showRPeaks: boolean;
  ghost: OverlayView | null;
  ghostOffsetMm: number;
  annotations: RecordingAnnotation[];
  lockedCursorsSec: number[];
  mode: ViewerMode;
  calipers: UseCalipersResult;
  palette: StripPalette;
  onTapLead: (lead: LimbLeadName) => void;
  onTapPoint: (lead: LimbLeadName, sampleIndex: number, timeSec: number) => void;
  onTapAnnotation: (annotation: RecordingAnnotation) => void;
  onDropCursor: (timeSec: number) => void;
  onRemoveCursor: (index: number) => void;
  onMoveCursor: (index: number, timeSec: number) => void;
  onMoveAnnotation: (annotation: RecordingAnnotation, sampleIndex: number) => void;
  onGhostDrag: (dxMm: number, dyMm: number) => void;
  /** Reported so the screen's Fit button can size the window to the height. */
  onLayoutBox?: (box: { width: number; height: number }) => void;
}

/** Half-width of the invisible pad around a draggable thing, in points. */
const GRAB_PAD = 26;
/** Points of travel under which a gesture was a TAP, not a drag. */
const TAP_SLOP = 6;
/** Half-width of a reference line's grab strip, in points. */
const LINE_GRAB = 14;

/**
 * Tap within this many millimetres of a reference line to REMOVE it instead
 * of dropping another. Exported because the screen owns the list and so owns
 * the toggle; 2.5 mm is 100 ms of paper, comfortably inside a fingertip.
 */
export const CURSOR_HIT_MM = 2.5;

export default function EcgReviewSheet({
  view,
  leads,
  windowMm,
  stripHeightMm,
  showRPeaks,
  ghost,
  ghostOffsetMm,
  annotations,
  lockedCursorsSec,
  mode,
  calipers,
  palette,
  onTapLead,
  onTapPoint,
  onTapAnnotation,
  onDropCursor,
  onRemoveCursor,
  onMoveCursor,
  onMoveAnnotation,
  onGhostDrag,
  onLayoutBox,
}: Props) {
  const t = useTheme();
  const [box, setBox] = useState({ width: 0, height: 0 });
  /** True while ANY handle owns the gesture. Freezes both scrolls. */
  const [dragging, setDragging] = useState(false);
  /** Live scroll offset in points — read by gestures, never rendered from. */
  const scrollXRef = useRef(0);

  const traceMm = CAL_WIDTH_MM + view.durationSec * STANDARD_MM_PER_SEC;
  /* Blank paper past the end of the recording when the window is wider than
     the trace — which is what "fit all six leads to the height" produces on a
     landscape phone. A printout does exactly this; the alternative is a sheet
     that does not reach the edge of its own panel. */
  const paperMm = Math.max(traceMm, windowMm);
  const ptPerMm = box.width > 0 ? box.width / windowMm : 0;
  const bandH = stripHeightMm * ptPerMm;
  const contentW = paperMm * ptPerMm;
  const mmPerSample = STANDARD_MM_PER_SEC / view.sampleRate;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((b) => (b.width === width && b.height === height ? b : { width, height }));
    onLayoutBox?.({ width, height });
  };

  /* ── mm ⇄ pt ⇄ time, in one place ── */
  const xMmToPt = (xMm: number) => xMm * ptPerMm;
  const timeToXMm = (sec: number) => CAL_WIDTH_MM + sec * STANDARD_MM_PER_SEC;
  const xMmToTime = (xMm: number) => (xMm - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC;

  /* Drop the calipers into the CURRENTLY VISIBLE window the moment the tool
     is switched on. Placing them at the start of the recording instead would
     put them off screen for anyone who had scrolled — a measuring tool that
     appears to do nothing. */
  const activeLead = calipers.lead ?? leads[0];
  const { a: caliperA, place: placeCalipers, nudge: nudgeCaliper } = calipers;
  useEffect(() => {
    if (mode !== 'calipers' || caliperA || ptPerMm === 0) return;
    placeCalipers(leads[0], scrollXRef.current / ptPerMm, windowMm, stripHeightMm);
  }, [mode, caliperA, placeCalipers, leads, windowMm, stripHeightMm, ptPerMm]);

  const caliperBandIndex = Math.max(0, leads.indexOf(activeLead as LimbLeadName));

  /**
   * The one gesture factory. Everything draggable on this sheet goes through
   * it so they cannot drift apart — and so the scroll-freeze can never be
   * forgotten on one of them.
   */
  const grabber = (opts: {
    enabled: boolean;
    onStepMm: (dxMm: number, dyMm: number) => void;
    onTap?: () => void;
    onCommit?: () => void;
  }) => {
    const last = { x: 0, y: 0 };
    let travelled = 0;
    const end = () => {
      last.x = 0;
      last.y = 0;
      setDragging(false);
    };
    return PanResponder.create({
      /* ★ On START, not on move — see the header. By the time a move event
         arrives the ScrollView already owns the gesture. */
      onStartShouldSetPanResponder: () => opts.enabled,
      onStartShouldSetPanResponderCapture: () => opts.enabled,
      onPanResponderGrant: () => {
        travelled = 0;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        if (ptPerMm === 0) return;
        travelled = Math.max(travelled, Math.abs(g.dx) + Math.abs(g.dy));
        opts.onStepMm((g.dx - last.x) / ptPerMm, (g.dy - last.y) / ptPerMm);
        last.x = g.dx;
        last.y = g.dy;
      },
      onPanResponderRelease: () => {
        // Under the slop the finger did not really move: it was a tap.
        if (travelled < TAP_SLOP) opts.onTap?.();
        else opts.onCommit?.();
        end();
      },
      onPanResponderTerminate: end,
    });
  };

  const handleA = useMemo(
    () => grabber({ enabled: mode === 'calipers', onStepMm: (dx, dy) => nudgeCaliper('a', dx, dy) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, nudgeCaliper, ptPerMm],
  );
  const handleB = useMemo(
    () => grabber({ enabled: mode === 'calipers', onStepMm: (dx, dy) => nudgeCaliper('b', dx, dy) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, nudgeCaliper, ptPerMm],
  );
  const ghostGrab = useMemo(
    () => grabber({ enabled: mode === 'ghost', onStepMm: onGhostDrag }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, onGhostDrag, ptPerMm],
  );

  /* ── Taps on the paper itself ── */
  const handleBandPress = (lead: LimbLeadName, locationX: number) => {
    if (ptPerMm === 0) return;
    const timeSec = xMmToTime(locationX / ptPerMm);

    if (mode === 'cursor') {
      if (timeSec < 0 || timeSec > view.durationSec) return;
      onDropCursor(timeSec);
      return;
    }
    if (mode === 'mark') {
      if (timeSec < 0 || timeSec > view.durationSec) return;
      onTapPoint(lead, Math.round(timeSec * view.sampleRate), timeSec);
      return;
    }
    if (mode === 'read') onTapLead(lead);
    // In calipers / ghost mode a tap on the paper does nothing on purpose:
    // the handles are the interface, and a stray tap must not relocate a
    // measurement the reader has already positioned.
  };

  return (
    <View style={styles.root} onLayout={onLayout}>
      {box.width > 0 && (
        <ScrollView
          style={styles.vScroll}
          contentContainerStyle={styles.vContent}
          scrollEnabled={!dragging}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.row}>
            <ScrollView
              horizontal
              directionalLockEnabled
              /* Frozen while a handle is held, and while the ghost is being
                 nudged. This is the whole fix for "the waves move when I grab
                 the marker" — see the header. */
              scrollEnabled={mode !== 'ghost' && !dragging}
              showsHorizontalScrollIndicator
              scrollEventThrottle={32}
              onScroll={(e) => {
                scrollXRef.current = e.nativeEvent.contentOffset.x;
              }}
            >
              <View style={{ width: contentW }}>
                {leads.map((lead) => (
                  <View key={lead}>
                    <EcgReviewStrip
                      data={view.leads[lead]}
                      ghost={ghost?.leads[lead]}
                      ghostOffsetMm={ghostOffsetMm}
                      sampleRate={view.sampleRate}
                      paperMm={paperMm}
                      heightMm={stripHeightMm}
                      ptPerMm={ptPerMm}
                      /* ★ EVERY lead, not just II. The rate is computed from
                         one rhythm strip, but a reader wants to see which
                         beats it came from wherever they happen to be
                         looking — which is exactly what the web viewer does
                         (`showRPeaks` there is per-lead too). The report is
                         the one place that marks II alone, because a printed
                         sheet is a statement rather than a tool. */
                      rPeaks={showRPeaks ? view.analysis.rPeaks : undefined}
                      palette={palette}
                    />

                    {/* Tap layer. Below the markers in z-order so a tap on a
                        marker opens it rather than creating another. */}
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      accessibilityRole="button"
                      accessibilityLabel={`Lead ${lead}`}
                      onPress={(e) => handleBandPress(lead, e.nativeEvent.locationX)}
                    />

                    {annotations
                      .filter((a) => a.lead === lead)
                      .map((a) => (
                        <AnnotationPin
                          key={a.id}
                          annotation={a}
                          left={xMmToPt(CAL_WIDTH_MM + a.sampleIndex * mmPerSample)}
                          bandH={bandH}
                          draggable={mode === 'mark'}
                          ptPerMm={ptPerMm}
                          mmPerSample={mmPerSample}
                          tone={tagTone(a.text)}
                          colors={{ beat: t.accentLive, artifact: t.danger, note: t.textSecondary }}
                          setDragging={setDragging}
                          onTap={() => onTapAnnotation(a)}
                          onCommit={(sampleIndex) => onMoveAnnotation(a, sampleIndex)}
                        />
                      ))}
                  </View>
                ))}

                {/* ── Reference lines: one per drop, across EVERY lead ── */}
                {lockedCursorsSec.map((sec, i) => (
                  <CursorLine
                    key={i}
                    left={xMmToPt(timeToXMm(sec))}
                    height={bandH * leads.length}
                    color={t.accentLive}
                    grabbable={mode === 'cursor'}
                    ptPerMm={ptPerMm}
                    setDragging={setDragging}
                    onStepMm={(dxMm) =>
                      onMoveCursor(
                        i,
                        Math.min(Math.max(0, sec + dxMm / STANDARD_MM_PER_SEC), view.durationSec),
                      )
                    }
                    onTap={() => onRemoveCursor(i)}
                  />
                ))}

                {/* ── The calipers, inside their own lead's band ── */}
                {mode === 'calipers' && calipers.a && calipers.b && (
                  <>
                    <CaliperSpan
                      left={xMmToPt(Math.min(calipers.a.xMm, calipers.b.xMm))}
                      width={xMmToPt(Math.abs(calipers.b.xMm - calipers.a.xMm))}
                      top={
                        caliperBandIndex * bandH +
                        ((calipers.a.yMm + calipers.b.yMm) / 2) * ptPerMm
                      }
                      color={t.accent}
                    />
                    <CaliperHandle
                      left={xMmToPt(calipers.a.xMm)}
                      top={caliperBandIndex * bandH}
                      yPt={calipers.a.yMm * ptPerMm}
                      bandH={bandH}
                      sheetH={bandH * leads.length}
                      color={t.accent}
                      responder={handleA.panHandlers}
                    />
                    <CaliperHandle
                      left={xMmToPt(calipers.b.xMm)}
                      top={caliperBandIndex * bandH}
                      yPt={calipers.b.yMm * ptPerMm}
                      bandH={bandH}
                      sheetH={bandH * leads.length}
                      color={t.accent}
                      responder={handleB.panHandlers}
                    />
                  </>
                )}

                {/* Ghost drag surface — the one gesture that owns the whole
                    sheet, and only in its own mode. */}
                {mode === 'ghost' && (
                  <View
                    style={[styles.ghostSurface, { height: bandH * leads.length }]}
                    {...ghostGrab.panHandlers}
                  />
                )}
              </View>
            </ScrollView>

            {/* Pinned lead labels. Outside the scroll, backed with the paper
                colour so the millimetre grid does not run through the
                letters. */}
            <View pointerEvents="none" style={styles.gutter}>
              {leads.map((lead) => (
                <View key={lead} style={{ height: bandH }}>
                  <View style={[styles.leadChip, { backgroundColor: palette.paper }]}>
                    <Text
                      style={[styles.leadChipText, { color: palette.trace }]}
                      allowFontScaling={false}
                    >
                      {lead}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ────────────────────────────────────────────────────────────────
   Sub-parts. Kept in this file rather than split out because none of
   them means anything without the sheet's coordinate system.
   ──────────────────────────────────────────────────────────────── */

function CaliperSpan({
  left,
  width,
  top,
  color,
}: {
  left: number;
  width: number;
  top: number;
  color: string;
}) {
  return <View pointerEvents="none" style={[styles.span, { left, width, top, borderColor: color }]} />;
}

function CaliperHandle({
  left,
  top,
  yPt,
  bandH,
  sheetH,
  color,
  responder,
}: {
  left: number;
  top: number;
  yPt: number;
  bandH: number;
  sheetH: number;
  color: string;
  responder: GestureResponderHandlers;
}) {
  return (
    <>
      {/* The vertical line runs the WHOLE sheet at low opacity, so the
          instant being measured is visible on every lead even though the
          measurement itself belongs to one. */}
      <View
        pointerEvents="none"
        style={[styles.caliperLine, { left, height: sheetH, backgroundColor: color }]}
      />
      <View
        pointerEvents="none"
        style={[styles.caliperBand, { left, top, height: bandH, backgroundColor: color }]}
      />
      <View
        pointerEvents="none"
        style={[styles.caliperRing, { left: left - 8, top: top + yPt - 8, borderColor: color }]}
      />
      {/* The grab pad is bigger than the ring and INVISIBLE. A visible 52 pt
          disc on the trace would hide the waveform it is measuring. */}
      <View
        style={[styles.grab, { left: left - GRAB_PAD, top: top + yPt - GRAB_PAD }]}
        {...responder}
      />
    </>
  );
}

function CursorLine({
  left,
  height,
  color,
  grabbable,
  ptPerMm,
  setDragging,
  onStepMm,
  onTap,
}: {
  left: number;
  height: number;
  color: string;
  grabbable: boolean;
  ptPerMm: number;
  setDragging: (v: boolean) => void;
  onStepMm: (dxMm: number) => void;
  onTap: () => void;
}) {
  const responder = useMemo(() => {
    let lastX = 0;
    let travelled = 0;
    const end = () => {
      lastX = 0;
      setDragging(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => grabbable,
      onStartShouldSetPanResponderCapture: () => grabbable,
      onPanResponderGrant: () => {
        travelled = 0;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        if (ptPerMm === 0) return;
        travelled = Math.max(travelled, Math.abs(g.dx));
        onStepMm((g.dx - lastX) / ptPerMm);
        lastX = g.dx;
      },
      onPanResponderRelease: () => {
        /* A tap ON the line removes it; a drag moves it. Both live on the
           same target because a reference line is a thin thing and giving it
           two separate hit areas would mean neither is comfortable. */
        if (travelled < TAP_SLOP) onTap();
        end();
      },
      onPanResponderTerminate: end,
    });
  }, [grabbable, ptPerMm, onStepMm, onTap, setDragging]);

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.cursorLine, { left, height, backgroundColor: color }]}
      />
      {/* The grab strip covers the WHOLE line, not a tab at the top: after a
          vertical scroll a 48 pt tab at y = 0 is off screen, which is what
          made a dropped line impossible to move at all. */}
      {grabbable && (
        <View
          style={[styles.cursorGrab, { left: left - LINE_GRAB, height }]}
          {...responder.panHandlers}
        >
          <View style={[styles.cursorTab, { backgroundColor: color }]} />
        </View>
      )}
    </>
  );
}

function AnnotationPin({
  annotation,
  left,
  bandH,
  draggable,
  ptPerMm,
  mmPerSample,
  tone,
  colors,
  setDragging,
  onTap,
  onCommit,
}: {
  annotation: RecordingAnnotation;
  left: number;
  bandH: number;
  draggable: boolean;
  ptPerMm: number;
  mmPerSample: number;
  tone: 'beat' | 'artifact' | 'note';
  colors: Record<'beat' | 'artifact' | 'note', string>;
  setDragging: (v: boolean) => void;
  onTap: () => void;
  onCommit: (sampleIndex: number) => void;
}) {
  const [dragPt, setDragPt] = useState(0);
  const color = colors[tone];

  const responder = useMemo(() => {
    let dx = 0;
    const end = () => {
      dx = 0;
      setDragPt(0);
      setDragging(false);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => draggable,
      onStartShouldSetPanResponderCapture: () => draggable,
      onPanResponderGrant: () => {
        dx = 0;
        setDragging(true);
      },
      onPanResponderMove: (_e, g) => {
        dx = g.dx;
        setDragPt(g.dx);
      },
      /* Committed ONCE on release, not on every move: the mutation is an
         in-place PATCH so it could not duplicate anyway, but writing on every
         frame would still be ~60 round trips to the store for one change. */
      onPanResponderRelease: () => {
        if (Math.abs(dx) < TAP_SLOP) onTap();
        else if (ptPerMm > 0) {
          const shift = Math.round(dx / ptPerMm / mmPerSample);
          onCommit(Math.max(0, annotation.sampleIndex + shift));
        }
        end();
      },
      onPanResponderTerminate: end,
    });
  }, [draggable, ptPerMm, mmPerSample, annotation.sampleIndex, onCommit, onTap, setDragging]);

  return (
    <View style={[styles.pinWrap, { left: left + dragPt }]} {...responder.panHandlers}>
      <View pointerEvents="none" style={[styles.pinLine, { height: bandH, backgroundColor: color }]} />
      <View style={[styles.pinChip, { backgroundColor: color }]}>
        <Text style={styles.pinText} numberOfLines={1} allowFontScaling={false}>
          {annotation.text}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  vScroll: { flex: 1 },
  vContent: { flexGrow: 1 },
  row: { flexDirection: 'row' },
  gutter: { position: 'absolute', left: 0, top: 0 },
  leadChip: {
    alignSelf: 'flex-start',
    marginTop: 3,
    marginLeft: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  leadChipText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5 },

  ghostSurface: { position: 'absolute', left: 0, right: 0, top: 0 },

  caliperLine: { position: 'absolute', top: 0, width: 1, opacity: 0.35 },
  caliperBand: { position: 'absolute', width: 1.5 },
  caliperRing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    backgroundColor: 'transparent',
  },
  grab: { position: 'absolute', width: GRAB_PAD * 2, height: GRAB_PAD * 2 },
  span: { position: 'absolute', height: 0, borderTopWidth: 1, borderStyle: 'dashed', opacity: 0.85 },

  cursorLine: { position: 'absolute', top: 0, width: 1, opacity: 0.9 },
  cursorGrab: { position: 'absolute', top: 0, width: LINE_GRAB * 2, alignItems: 'center' },
  cursorTab: { width: 14, height: 14, borderRadius: 4, marginTop: 2 },

  /* The wrap's LEFT edge is the marked instant: the hairline sits at x = 0
     and the label hangs off to its right, so the chip never covers the
     sample it points at. */
  pinWrap: { position: 'absolute', top: 0, alignItems: 'flex-start' },
  pinLine: { position: 'absolute', top: 0, left: 0, width: 1, opacity: 0.75 },
  pinChip: { marginTop: 2, marginLeft: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, maxWidth: 110 },
  pinText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});

// v2.0.0 — Every handle now claims the gesture on TOUCH-DOWN and freezes both
//          scrolls while held (v0.15.0 claimed on move, which a ScrollView
//          that has already begun panning ignores — so nothing was draggable).
//          Tap and drag are told apart on release by travel. Reference lines
//          are grabbable along their whole length. R peaks draw on every lead.
//          The caliper readout moved out to the screen's chrome.
