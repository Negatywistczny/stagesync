/**
 * OSMD helpers for Client score pane (measure cursor + click hit-test).
 */

import {
  OpenSheetMusicDisplay,
  PointF2D,
  type Cursor,
} from "opensheetmusicdisplay";

/** Amber measure highlight + cyan beat cursor (v4 parity colors, local to OSMD). */
const MEASURE_CURSOR = {
  type: 3,
  color: "#fbbf24",
  alpha: 0.45,
  follow: false,
};
const BEAT_CURSOR = {
  type: 1,
  color: "#22d3ee",
  alpha: 0.85,
  follow: false,
};

export function createOsmd(container: HTMLElement): OpenSheetMusicDisplay {
  // DrawingParameters.drawCursors defaults true; OSMD.enableOrDisableCursors() must
  // run only after load+render (GraphicSheet + SVG backend). Calling it at construct
  // crashes OSMD 2.x (RestoreCursorAfterRerender writes .hidden on undefined cursors).
  const osmd = new OpenSheetMusicDisplay(container, {
    autoResize: true,
    backend: "svg",
    drawTitle: true,
    drawPartNames: true,
    drawPartAbbreviations: true,
    drawMeasureNumbers: true,
    followCursor: false,
    cursorsOptions: [BEAT_CURSOR, MEASURE_CURSOR],
  });
  osmd.EngravingRules.PageBackgroundColor = "#ffffff";
  return osmd;
}

/** First paint after load — cursors are created inside OSMD.render(). */
export function renderOsmd(osmd: OpenSheetMusicDisplay): void {
  if (!osmd.IsReadyToRender()) return;
  osmd.render();
}

export function getMeasureCount(osmd: OpenSheetMusicDisplay): number {
  const source = osmd.Sheet?.SourceMeasures;
  if (Array.isArray(source) && source.length > 0) return source.length;
  const list = osmd.GraphicSheet?.MeasureList;
  if (Array.isArray(list) && list.length > 0) return list.length;
  return 1;
}

export function clampScoreBar(
  osmd: OpenSheetMusicDisplay,
  scoreBar: number,
): number {
  return Math.max(1, Math.min(getMeasureCount(osmd), Math.floor(scoreBar)));
}

function getMeasureCursor(osmd: OpenSheetMusicDisplay): Cursor | undefined {
  const cursors = osmd.cursors;
  if (!Array.isArray(cursors) || cursors.length === 0) return undefined;
  return cursors[cursors.length - 1] ?? osmd.cursor;
}

export function goToScoreBar(
  osmd: OpenSheetMusicDisplay,
  scoreBar: number,
): void {
  const cursor = getMeasureCursor(osmd);
  if (!cursor) return;
  const target = clampScoreBar(osmd, scoreBar);
  cursor.reset();
  cursor.show();
  let current = 1;
  const max = getMeasureCount(osmd);
  while (current < target && current < max) {
    cursor.nextMeasure();
    current += 1;
  }
  cursor.update();
  cursor.adjustToBackgroundColor?.();
  const el = cursor.cursorElement;
  if (el) {
    el.style.pointerEvents = "none";
    el.style.zIndex = "5";
  }
}

export function applyOsmdZoom(
  osmd: OpenSheetMusicDisplay,
  zoomPercent: number,
): void {
  osmd.Zoom = Math.max(0.4, Math.min(2.5, zoomPercent / 100));
  if (osmd.IsReadyToRender()) {
    osmd.render();
  }
}

/** Convert client click → MusicXML measure number (1-based), or null. */
export function scoreBarFromClientPoint(
  osmd: OpenSheetMusicDisplay,
  container: HTMLElement,
  clientX: number,
  clientY: number,
): number | null {
  const graphic = osmd.GraphicSheet;
  if (!graphic) return null;
  const rect = container.getBoundingClientRect();
  const scale = 10 * (osmd.Zoom || 1);
  const pos = new PointF2D(
    (clientX - rect.left) / scale,
    (clientY - rect.top) / scale,
  );
  try {
    const note = graphic.GetNearestNote(pos, new PointF2D(40, 40));
    const measure = note?.sourceNote?.SourceMeasure;
    const n = measure?.MeasureNumber;
    if (typeof n === "number" && n >= 1) return n;
  } catch {
    // fall through to MeasureList scan
  }

  const list = graphic.MeasureList;
  if (!Array.isArray(list)) return null;
  let bestBar: number | null = null;
  let bestDist = Infinity;
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    const gm = Array.isArray(row) ? row[0] : null;
    if (!gm?.PositionAndShape) continue;
    const abs = gm.PositionAndShape.AbsolutePosition;
    const size = gm.PositionAndShape.Size;
    if (!abs || !size) continue;
    const left = abs.x * scale;
    const top = abs.y * scale;
    const right = left + size.width * scale;
    const bottom = top + size.height * scale;
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    if (cx >= left && cx <= right && cy >= top && cy <= bottom) {
      const bar = gm.MeasureNumber ?? i + 1;
      return Math.max(1, bar);
    }
    const mx = (left + right) / 2;
    const my = (top + bottom) / 2;
    const d = (cx - mx) ** 2 + (cy - my) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestBar = gm.MeasureNumber ?? i + 1;
    }
  }
  return bestBar;
}

export function scrollCursorIntoView(
  scrollEl: HTMLElement,
  osmd: OpenSheetMusicDisplay,
): void {
  const cursor = getMeasureCursor(osmd);
  const el = cursor?.cursorElement;
  if (!el) return;
  const scrollRect = scrollEl.getBoundingClientRect();
  const cursorRect = el.getBoundingClientRect();
  const offset = cursorRect.top - scrollRect.top + scrollEl.scrollTop;
  const target = Math.max(0, offset - scrollRect.height * 0.14);
  scrollEl.scrollTo({ top: target, behavior: "smooth" });
}
