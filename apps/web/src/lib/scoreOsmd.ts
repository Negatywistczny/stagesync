/**
 * OSMD helpers for Client score pane (measure cursor + click hit-test).
 */

import {
  OpenSheetMusicDisplay,
  PointF2D,
  type Cursor,
} from "opensheetmusicdisplay";

/**
 * Fetch MusicXML / MXL bytes as a Blob for `osmd.load(blob)`.
 *
 * Do **not** pass our asset API URL to `osmd.load(url)`: OSMD's XHR only uses
 * binary-safe `charset=x-user-defined` when the URL contains `.mxl`. StageSync
 * serves `/api/.../assets/:id/file` without an extension, so compressed `.mxl`
 * (ZIP) was decoded as XML text and rejected with "Invalid MXL file".
 * Passing a Blob lets OSMD unzip MXL or fall back to plain MusicXML text.
 */
export async function fetchScoreBlob(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Blob> {
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`Nie można pobrać partytury (HTTP ${res.status})`);
  }
  return res.blob();
}

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

/**
 * Construct OSMD for the score pane.
 *
 * Never call `enableOrDisableCursors` here. OSMD 2.x creates cursors inside
 * `render()` after the SVG backend exists; calling enable at construct crashes
 * when `RestoreCursorAfterRerender` writes `.hidden` on undefined cursors.
 */
export function createOsmd(container: HTMLElement): OpenSheetMusicDisplay {
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
  // OSMD bug belt-and-suspenders: enableOrDisableCursors(true) still assigns
  // `this.cursors[i].hidden` when cursor creation was skipped (no backend yet).
  osmd.EngravingRules.RestoreCursorAfterRerender = false;
  return osmd;
}

/**
 * First paint after load. Relies solely on OSMD.render() to create/enable
 * cursors (do not call enableOrDisableCursors from app code).
 */
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

export type ScorePartInfo = {
  id: string;
  label: string;
  index: number;
};

export function scoreInstrumentId(
  instr: { IdString?: string; Name?: string; PartAbbreviation?: string },
  index: number,
): string {
  const base = String(
    instr.IdString || instr.Name || instr.PartAbbreviation || "part",
  ).trim();
  return `${base || "part"}::${index}`;
}

export function listScoreParts(osmd: OpenSheetMusicDisplay): ScorePartInfo[] {
  const instruments = osmd.Sheet?.Instruments;
  if (!Array.isArray(instruments)) return [];
  return instruments.map((instr, index) => {
    const name = String(
      (instr as { Name?: string }).Name ||
        (instr as { PartAbbreviation?: string }).PartAbbreviation ||
        "",
    ).trim();
    return {
      id: scoreInstrumentId(
        instr as { IdString?: string; Name?: string; PartAbbreviation?: string },
        index,
      ),
      label: name || `Partia ${index + 1}`,
      index,
    };
  });
}

/** Hide parts listed in `hiddenIds`; keep at least one visible when possible. */
export function applyScorePartVisibility(
  osmd: OpenSheetMusicDisplay,
  hiddenIds: readonly string[],
): void {
  const instruments = osmd.Sheet?.Instruments;
  if (!Array.isArray(instruments) || instruments.length === 0) return;
  const hidden = new Set(hiddenIds);
  const parts = listScoreParts(osmd);
  let visibleCount = parts.filter((p) => !hidden.has(p.id)).length;
  if (visibleCount === 0 && parts.length > 0) {
    hidden.delete(parts[0]!.id);
    visibleCount = 1;
  }
  instruments.forEach((instr, index) => {
    const id = scoreInstrumentId(
      instr as { IdString?: string; Name?: string; PartAbbreviation?: string },
      index,
    );
    const visible = !hidden.has(id);
    (instr as { Visible?: boolean }).Visible = visible;
    const voices = (instr as { Voices?: Array<{ Visible?: boolean }> }).Voices;
    if (Array.isArray(voices)) {
      for (const voice of voices) {
        voice.Visible = visible;
      }
    }
  });
}

export type ScoreOctave = -1 | 0 | 1;

export function clampScoreOctave(n: unknown): ScoreOctave {
  const v = typeof n === "number" ? n : Number.parseInt(String(n), 10);
  if (!Number.isFinite(v)) return 0;
  if (v <= -1) return -1;
  if (v >= 1) return 1;
  return 0;
}

export function scoreOctaveToSemitones(octave: ScoreOctave): number {
  return octave * 12;
}

/** Apply Sheet.Transpose (team + score octave) and re-render when ready. */
export function applyScoreSheetTranspose(
  osmd: OpenSheetMusicDisplay,
  semitones: number,
): void {
  if (!osmd.Sheet) return;
  const next = Math.trunc(semitones);
  const current = osmd.Sheet.Transpose ?? 0;
  if (current === next) {
    if (osmd.IsReadyToRender()) osmd.render();
    return;
  }
  osmd.Sheet.Transpose = next;
  try {
    osmd.updateGraphic();
  } catch {
    /* older OSMD */
  }
  if (osmd.IsReadyToRender()) {
    osmd.render();
  }
}

const HIDDEN_PARTS_KEY = "stagesync-score-hidden-parts";
const OCTAVE_KEY = "stagesync-score-octave";

export function loadScoreHiddenParts(projectId: string): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_PARTS_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw) as Record<string, string[]>;
    const list = map[projectId];
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export function saveScoreHiddenParts(
  projectId: string,
  hiddenIds: readonly string[],
): void {
  try {
    const raw = localStorage.getItem(HIDDEN_PARTS_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, string[]>) : {};
    map[projectId] = [...hiddenIds];
    localStorage.setItem(HIDDEN_PARTS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function loadScoreOctave(projectId: string): ScoreOctave {
  try {
    const raw = localStorage.getItem(OCTAVE_KEY);
    if (!raw) return 0;
    const map = JSON.parse(raw) as Record<string, number>;
    return clampScoreOctave(map[projectId]);
  } catch {
    return 0;
  }
}

export function saveScoreOctave(projectId: string, octave: ScoreOctave): void {
  try {
    const raw = localStorage.getItem(OCTAVE_KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[projectId] = octave;
    localStorage.setItem(OCTAVE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

