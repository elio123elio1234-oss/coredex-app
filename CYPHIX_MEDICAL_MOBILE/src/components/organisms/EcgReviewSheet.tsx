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
   genuine misread, not a glitch. The lead labels are pinned outside it,
   because a label that slides off the paper leaves an unidentified trace.

   ══ ONE POINTER, ONE JOB ══
   A finger cannot hover, and there is only one of it. So the tools are
   MODES, and the mode says what a touch will do before it happens:

     read      scroll and read. Taps focus a lead.
     calipers  two draggable crosshairs; everything else still scrolls.
     mark      a tap labels that point; a tap on a marker opens it.
     cursor    a tap drops a reference line across every lead; a tap on a
               line removes it; its top handle drags it.
     ghost     the comparison trace is dragged in time and amplitude, and
               the sheet stops scrolling for the duration — the ONE place
               the gesture is claimed, because a drag that both pans the
               paper and moves the ghost cannot be either.

   ══ WHY THE HANDLES ARE DRAGGED RELATIVELY ══
   Every draggable thing here (caliper crosshairs, cursor handles, markers)
   moves by the finger's DELTA, never to its absolute position. A fingertip
   is ~9 mm across — at 25 mm/s that is 360 ms of ECG, wider than a QRS — so
   an absolute drag hides the thing being positioned under the hand that is
   positioning it. Relatively dragged, the target stays beside the finger
   and visible the whole time.
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
  /** Live caliper readout copy, supplied by the screen (i18n stays out). */
  caliperLabels: { ms: string; bpm: string; mv: string };
  onTapLead: (lead: LimbLeadName) => void;
  onTapPoint: (lead: LimbLeadName, sampleIndex: number, timeSec: number) => void;
  onTapAnnotation: (annotation: RecordingAnnotation) => void;
  onDropCursor: (timeSec: number) => void;
  onMoveCursor: (index: number, timeSec: number) => void;
  onMoveAnnotation: (annotation: RecordingAnnotation, sampleIndex: number) => void;
  onGhostDrag: (dxMm: number, dyMm: number) => void;
}

/** Half-width of the invisible pad around a draggable thing, in points. */
const GRAB_PAD = 24;

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
  caliperLabels,
  onTapLead,
  onTapPoint,
  onTapAnnotation,
  onDropCursor,
  onMoveCursor,
  onMoveAnnotation,
  onGhostDrag,
}: Props) {
  const t = useTheme();
  const [viewportW, setViewportW] = useState(0);
  /** Live scroll offset in points — read by gestures, never rendered from. */
  const scrollXRef = useRef(0);

  const paperMm = CAL_WIDTH_MM + view.durationSec * STANDARD_MM_PER_SEC;
  const ptPerMm = viewportW > 0 ? viewportW / windowMm : 0;
  const bandH = stripHeightMm * ptPerMm;
  const contentW = paperMm * ptPerMm;
  const mmPerSample = STANDARD_MM_PER_SEC / view.sampleRate;

  /* ── mm ⇄ pt ⇄ time, in one place ── */
  const xMmToPt = (xMm: number) => xMm * ptPerMm;
  const timeToXMm = (sec: number) => CAL_WIDTH_MM + sec * STANDARD_MM_PER_SEC;
  const xMmToTime = (xMm: number) => (xMm - CAL_WIDTH_MM) / STANDARD_MM_PER_SEC;

  /* Drop the calipers into the CURRENTLY VISIBLE window the moment the tool
     is switched on. Placing them at the start of the recording instead would
     put them off screen for anyone who had scrolled — a measuring tool that
     appears to do nothing. */
  const activeLead = calipers.lead ?? leads[0];
  const { a: caliperPointA, place: placeCalipers, nudge: nudgeCaliper } = calipers;
  useEffect(() => {
    if (mode !== 'calipers' || caliperPointA || ptPerMm === 0) return;
    const startMm = scrollXRef.current / ptPerMm;
    placeCalipers(leads[0], startMm, windowMm, stripHeightMm);
  }, [mode, caliperPointA, placeCalipers, leads, windowMm, stripHeightMm, ptPerMm]);

  const caliperBandIndex = Math.max(0, leads.indexOf(activeLead as LimbLeadName));

  /* ── Draggable things ──
     Every one of them needs the delta SINCE THE LAST EVENT, but
     `gestureState` reports the total since the touch began. Each responder
     therefore closes over its OWN running total — one shared ref would make
     two handles fight the moment a second finger landed on the sheet. */
  const dragResponder = (onStepMm: (dxMm: number, dyMm: number) => void) => {
    const last = { x: 0, y: 0 };
    const reset = () => {
      last.x = 0;
      last.y = 0;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      /* Claiming the responder on MOVE is what beats the enclosing
         ScrollView: the child that says yes first owns the gesture, and a
         drag that starts on a handle must never scroll the paper instead. */
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
      onPanResponderMove: (_e, g) => {
        if (ptPerMm === 0) return;
        onStepMm((g.dx - last.x) / ptPerMm, (g.dy - last.y) / ptPerMm);
        last.x = g.dx;
        last.y = g.dy;
      },
      onPanResponderRelease: reset,
      onPanResponderTerminate: reset,
    });
  };

  const caliperA = useMemo(
    () => dragResponder((dx, dy) => nudgeCaliper('a', dx, dy)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nudgeCaliper, ptPerMm],
  );
  const caliperB = useMemo(
    () => dragResponder((dx, dy) => nudgeCaliper('b', dx, dy)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nudgeCaliper, ptPerMm],
  );
  const ghostDrag = useMemo(
    () => dragResponder(onGhostDrag),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onGhostDrag, ptPerMm],
  );

  /* ── The taps ── */
  const handleBandPress = (lead: LimbLeadName, locationX: number, locationY: number) => {
    if (ptPerMm === 0) return;
    const xMm = locationX / ptPerMm;
    const timeSec = xMmToTime(xMm);

    if (mode === 'cursor') {
      if (timeSec < 0 || timeSec > view.durationSec) return;
      onDropCursor(timeSec);
      return;
    }
    if (mode === 'mark') {
      if (timeSec < 0) return;
      onTapPoint(lead, Math.round(timeSec * view.sampleRate), timeSec);
      return;
    }
    if (mode === 'read') {
      onTapLead(lead);
      return;
    }
    // In calipers / ghost mode a tap on the paper does nothing on purpose:
    // the handles are the interface, and a stray tap must not relocate a
    // measurement the reader has already positioned.
    void locationY;
  };

  const onScroll = (x: number) => {
    scrollXRef.current = x;
  };

  return (
    <View style={styles.root} onLayout={(e: LayoutChangeEvent) => setViewportW(e.nativeEvent.layout.width)}>
      {/* Live measurement, pinned ABOVE the paper — never beside the
          crosshairs, where the hand taking the measurement covers it. */}
      {mode === 'calipers' && calipers.delta && (
        <View style={[styles.readout, { backgroundColor: t.brandNavy }]} pointerEvents="none">
          <Text style={styles.readoutMain} allowFontScaling={false}>
            {Math.round(calipers.delta.ms)}
            <Text style={styles.readoutUnit}> {caliperLabels.ms}</Text>
          </Text>
          {calipers.delta.impliedBpm != null && (
            <Text style={styles.readoutSide} allowFontScaling={false}>
              {Math.round(calipers.delta.impliedBpm)} {caliperLabels.bpm}
            </Text>
          )}
          <Text style={styles.readoutSide} allowFontScaling={false}>
            {calipers.delta.mv >= 0 ? '+' : ''}
            {calipers.delta.mv.toFixed(2)} {caliperLabels.mv}
          </Text>
        </View>
      )}

      {viewportW > 0 && (
        <ScrollView
          style={styles.vScroll}
          contentContainerStyle={styles.vContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.row}>
            <ScrollView
              horizontal
              directionalLockEnabled
              scrollEnabled={mode !== 'ghost'}
              showsHorizontalScrollIndicator
              scrollEventThrottle={32}
              onScroll={(e) => onScroll(e.nativeEvent.contentOffset.x)}
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
                      rPeaks={showRPeaks && lead === 'II' ? view.analysis.rPeaks : undefined}
                      palette={palette}
                    />

                    {/* Tap layer. Below the markers in z-order so a tap on a
                        marker opens it rather than creating another. */}
                    <Pressable
                      style={StyleSheet.absoluteFill}
                      accessibilityRole="button"
                      accessibilityLabel={`Lead ${lead}`}
                      onPress={(e) =>
                        handleBandPress(lead, e.nativeEvent.locationX, e.nativeEvent.locationY)
                      }
                    />

                    {/* Markers on this lead. */}
                    {annotations
                      .filter((a) => a.lead === lead)
                      .map((a) => (
                        <AnnotationPin
                          key={a.id}
                          annotation={a}
                          /* Inside the band's own View, so the origin is the
                             band top — NOT the sheet's. */
                          left={xMmToPt(CAL_WIDTH_MM + a.sampleIndex * mmPerSample)}
                          bandH={bandH}
                          draggable={mode === 'mark'}
                          ptPerMm={ptPerMm}
                          mmPerSample={mmPerSample}
                          tone={tagTone(a.text)}
                          colors={{
                            beat: t.accentLive,
                            artifact: t.danger,
                            note: t.textSecondary,
                          }}
                          onPress={() => onTapAnnotation(a)}
                          onCommit={(sampleIndex) => onMoveAnnotation(a, sampleIndex)}
                        />
                      ))}
                  </View>
                ))}

                {/* ── Reference lines: one per drop, across EVERY lead ── */}
                {lockedCursorsSec.map((sec, i) => (
                  <CursorLine
                    key={`${i}-${sec.toFixed(3)}`}
                    left={xMmToPt(timeToXMm(sec))}
                    height={bandH * leads.length}
                    color={t.accentLive}
                    draggable={mode === 'cursor'}
                    onMoveMm={(dxMm) =>
                      onMoveCursor(
                        i,
                        Math.min(Math.max(0, sec + dxMm / STANDARD_MM_PER_SEC), view.durationSec),
                      )
                    }
                  />
                ))}

                {/* ── The calipers, inside their own lead's band ── */}
                {mode === 'calipers' && calipers.a && calipers.b && (
                  <>
                    <CaliperSpan
                      left={xMmToPt(Math.min(calipers.a.xMm, calipers.b.xMm))}
                      width={xMmToPt(Math.abs(calipers.b.xMm - calipers.a.xMm))}
                      top={caliperBandIndex * bandH + (calipers.a.yMm + calipers.b.yMm) / 2 * ptPerMm}
                      color={t.accent}
                    />
                    <CaliperHandle
                      left={xMmToPt(calipers.a.xMm)}
                      top={caliperBandIndex * bandH}
                      yPt={calipers.a.yMm * ptPerMm}
                      bandH={bandH}
                      sheetH={bandH * leads.length}
                      color={t.accent}
                      responder={caliperA.panHandlers}
                    />
                    <CaliperHandle
                      left={xMmToPt(calipers.b.xMm)}
                      top={caliperBandIndex * bandH}
                      yPt={calipers.b.yMm * ptPerMm}
                      bandH={bandH}
                      sheetH={bandH * leads.length}
                      color={t.accent}
                      responder={caliperB.panHandlers}
                    />
                  </>
                )}

                {/* Ghost drag surface — the one gesture that owns the whole
                    sheet, and only in its own mode. */}
                {mode === 'ghost' && (
                  <View
                    style={[StyleSheet.absoluteFill, { height: bandH * leads.length }]}
                    {...ghostDrag.panHandlers}
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
   them means anything without the sheet's coordinate system, and a
   "one file per element" split here would be three files that can only
   ever be imported together.
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
  return (
    <View
      pointerEvents="none"
      style={[styles.span, { left, width, top, borderColor: color }]}
    />
  );
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
      {/* The crosshair: bright inside its own band, with a ring at the
          measured point. */}
      <View
        pointerEvents="none"
        style={[styles.caliperBand, { left, top, height: bandH, backgroundColor: color }]}
      />
      <View
        pointerEvents="none"
        style={[styles.caliperRing, { left: left - 7, top: top + yPt - 7, borderColor: color }]}
      />
      {/* The grab pad is bigger than the ring and INVISIBLE. A visible 48 pt
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
  draggable,
  onMoveMm,
}: {
  left: number;
  height: number;
  color: string;
  draggable: boolean;
  onMoveMm: (dxMm: number) => void;
}) {
  const lastX = useRef(0);
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => draggable,
        onMoveShouldSetPanResponder: (_e, g) => draggable && Math.abs(g.dx) > 2,
        onPanResponderMove: (_e, g) => {
          onMoveMm(g.dx - lastX.current);
          lastX.current = g.dx;
        },
        onPanResponderRelease: () => {
          lastX.current = 0;
        },
        onPanResponderTerminate: () => {
          lastX.current = 0;
        },
      }),
    [draggable, onMoveMm],
  );

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.cursorLine, { left, height, backgroundColor: color }]}
      />
      {/* A grab tab at the TOP of the line, outside the trace it marks. */}
      {draggable && (
        <View style={[styles.cursorGrab, { left: left - GRAB_PAD }]} {...responder.panHandlers}>
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
  onPress,
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
  onPress: () => void;
  onCommit: (sampleIndex: number) => void;
}) {
  const [dragPt, setDragPt] = useState(0);
  const dragRef = useRef(0);
  const color = colors[tone];

  const responder = useMemo(
    () =>
      PanResponder.create({
        /* ★ Never claim on START. The chip inside is a Pressable, and a
           wrapper that takes the responder on touch-down swallows the tap —
           the marker would be draggable and un-openable. Only a real
           MOVEMENT becomes a drag. */
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_e, g) => draggable && Math.abs(g.dx) > 3,
        onPanResponderMove: (_e, g) => {
          dragRef.current = g.dx;
          setDragPt(g.dx);
        },
        /* Committed ONCE on release, not on every move. The mutation is an
           in-place PATCH so it could not duplicate anyway, but writing on
           every frame of a drag would still mean ~60 round trips to the
           store for one intended change. */
        onPanResponderRelease: () => {
          if (ptPerMm > 0 && dragRef.current !== 0) {
            const shift = Math.round(dragRef.current / ptPerMm / mmPerSample);
            onCommit(Math.max(0, annotation.sampleIndex + shift));
          }
          dragRef.current = 0;
          setDragPt(0);
        },
        onPanResponderTerminate: () => {
          dragRef.current = 0;
          setDragPt(0);
        },
      }),
    [draggable, ptPerMm, mmPerSample, annotation.sampleIndex, onCommit],
  );

  return (
    <View style={[styles.pinWrap, { left: left + dragPt }]} {...responder.panHandlers}>
      <View pointerEvents="none" style={[styles.pinLine, { height: bandH, backgroundColor: color }]} />
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={annotation.text}
        style={[styles.pinChip, { backgroundColor: color }]}
      >
        <Text style={styles.pinText} numberOfLines={1} allowFontScaling={false}>
          {annotation.text}
        </Text>
      </Pressable>
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
    marginTop: 4,
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  leadChipText: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 },

  readout: {
    position: 'absolute',
    top: 6,
    alignSelf: 'center',
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  readoutMain: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  readoutUnit: { fontSize: 11, fontWeight: '700' },
  readoutSide: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 12.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  caliperLine: { position: 'absolute', top: 0, width: 1, opacity: 0.35 },
  caliperBand: { position: 'absolute', width: 1.5 },
  caliperRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  grab: { position: 'absolute', width: GRAB_PAD * 2, height: GRAB_PAD * 2 },
  span: {
    position: 'absolute',
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    opacity: 0.8,
  },

  cursorLine: { position: 'absolute', top: 0, width: 1, opacity: 0.9 },
  cursorGrab: {
    position: 'absolute',
    top: 0,
    width: GRAB_PAD * 2,
    height: GRAB_PAD * 2,
    alignItems: 'center',
    paddingTop: 2,
  },
  cursorTab: { width: 16, height: 16, borderRadius: 4 },

  /* The wrap's LEFT edge is the marked instant: the hairline sits at x = 0
     and the label hangs off to its right, so the chip never covers the
     sample it points at. */
  pinWrap: { position: 'absolute', top: 0, alignItems: 'flex-start' },
  pinLine: { position: 'absolute', top: 0, left: 0, width: 1, opacity: 0.75 },
  pinChip: {
    marginTop: 2,
    marginLeft: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: 110,
  },
  pinText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '700' },
});

// v1.0.0 — Touch ECG review sheet: tiled vector paper in one synchronised
//          scroll, modal tools, and every draggable handle moved by delta so
//          the thing being positioned is never under the finger doing it.
