/**
 * OSMD helpers for Client score pane (measure cursor + click hit-test).
 */

import {
  clampSemitoneOffset,
  resolveInstrumentPitchOffset,
  type InstrumentPitchMode,
} from "@stagesync/shared";
import {
  OpenSheetMusicDisplay,
  PointF2D,
  TransposeCalculator,
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

/** Fallbacks when CSS tokens are unset (jsdom / early construct). Match packages/ui tokens.css. */
const FALLBACK_MEASURE_HEX = "#fbbf24";
const FALLBACK_BEAT_HEX = "#22d3ee";
const FALLBACK_PAPER_HEX = "#ffffff";

const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Read a `--ss-*` color token as concrete hex for OSMD (API requires a string color).
 * Prefers `el`, then `document.documentElement`; falls back when detached / unset.
 */
export function readOsmdCssHex(
  varName: string,
  fallback: string,
  el?: HTMLElement | null,
): string {
  if (typeof getComputedStyle === "undefined") return fallback;
  const roots: Array<Element | null | undefined> = [
    el,
    typeof document !== "undefined" ? document.documentElement : null,
  ];
  for (const root of roots) {
    if (!root) continue;
    const raw = getComputedStyle(root).getPropertyValue(varName).trim();
    if (HEX_RE.test(raw)) return raw;
  }
  return fallback;
}

/**
 * Construct OSMD for the score pane.
 *
 * Never call `enableOrDisableCursors` here. OSMD 2.x creates cursors inside
 * `render()` after the SVG backend exists; calling enable at construct crashes
 * when `RestoreCursorAfterRerender` writes `.hidden` on undefined cursors.
 */
export function createOsmd(container: HTMLElement): OpenSheetMusicDisplay {
  const measureHex = readOsmdCssHex(
    "--ss-color-primary",
    FALLBACK_MEASURE_HEX,
    container,
  );
  const beatHex = readOsmdCssHex(
    "--ss-color-focus-ring",
    FALLBACK_BEAT_HEX,
    container,
  );
  const paperHex = readOsmdCssHex(
    "--ss-color-osmd-paper",
    FALLBACK_PAPER_HEX,
    container,
  );

  const osmd = new OpenSheetMusicDisplay(container, {
    autoResize: true,
    backend: "svg",
    drawTitle: true,
    drawPartNames: true,
    drawPartAbbreviations: true,
    drawMeasureNumbers: true,
    followCursor: false,
    cursorsOptions: [
      { type: 1, color: beatHex, alpha: 0.85, follow: false },
      { type: 3, color: measureHex, alpha: 0.45, follow: false },
    ],
  });
  osmd.EngravingRules.PageBackgroundColor = paperHex;
  // OSMD bug belt-and-suspenders: enableOrDisableCursors(true) still assigns
  // `this.cursors[i].hidden` when cursor creation was skipped (no backend yet).
  osmd.EngravingRules.RestoreCursorAfterRerender = false;
  // Required for Sheet.Transpose / Instrument.Transpose to take effect (OSMD plugin).
  osmd.TransposeCalculator = new TransposeCalculator();
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

/** OSMD exposes both `Iterator` (getter) and `iterator` (field). */
function getCursorIterator(cursor: Cursor):
  | {
      CurrentMeasureIndex?: number;
      EndReached?: boolean;
    }
  | undefined {
  const withGetter = cursor as Cursor & {
    Iterator?: {
      CurrentMeasureIndex?: number;
      EndReached?: boolean;
    };
  };
  return withGetter.Iterator ?? cursor.iterator ?? undefined;
}

/**
 * Move the measure cursor to a MusicXML / sheet measure (1-based).
 *
 * Cursor-only: never calls `osmd.render()`. Do **not** count
 * `nextMeasure()` calls: OSMD's iterator follows musical repeats / voltas /
 * jumps, so N steps ≠ sheet measure index N. Navigate by
 * `CurrentMeasureIndex` instead (0-based list index).
 *
 * When the cursor is already at/before the target, walk forward only —
 * avoid `reset()` on every transport tick.
 */
export function goToScoreBar(
  osmd: OpenSheetMusicDisplay,
  scoreBar: number,
): void {
  const cursor = getMeasureCursor(osmd);
  if (!cursor) return;
  const target = clampScoreBar(osmd, scoreBar);
  const targetIndex = target - 1;

  const styleCursorEl = () => {
    cursor.update();
    cursor.adjustToBackgroundColor?.();
    const el = cursor.cursorElement;
    if (el) {
      el.style.pointerEvents = "none";
      el.style.zIndex = "5";
    }
  };

  const iteratorBefore = getCursorIterator(cursor);
  const currentIndex = iteratorBefore?.CurrentMeasureIndex;
  if (currentIndex === targetIndex) {
    cursor.show();
    styleCursorEl();
    return;
  }

  // Only reset when behind the target is unknown or we need to go backward.
  if (currentIndex == null || currentIndex > targetIndex) {
    cursor.reset();
  }
  cursor.show();

  const measureCount = getMeasureCount(osmd);
  // Allow walking through repeat passes (volta 1 → jump → volta 2).
  const maxSteps = Math.max(measureCount * 8, 64);
  let steps = 0;
  while (steps < maxSteps) {
    const iterator = getCursorIterator(cursor);
    if (!iterator || iterator.EndReached) break;
    const idx = iterator.CurrentMeasureIndex ?? 0;
    if (idx >= targetIndex) break;
    cursor.nextMeasure();
    steps += 1;
  }

  styleCursorEl();
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
        instr as {
          IdString?: string;
          Name?: string;
          PartAbbreviation?: string;
        },
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
  const visibleCount = parts.filter((p) => !hidden.has(p.id)).length;
  if (visibleCount === 0 && parts.length > 0) {
    hidden.delete(parts[0]!.id);
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

/**
 * Combined OSMD Sheet.Transpose: Live Desk team + local instrument pitch + score octave.
 * Matches Grid/Karaoke chord offset (v4 StageSyncTranspose) plus partytura octave (±12).
 */
export function scoreSheetTransposeSemitones(opts: {
  teamSemitones?: number;
  scoreOctave?: ScoreOctave;
  instrumentPitch?: InstrumentPitchMode | string;
  instrumentPitchManual?: number;
}): number {
  const local = resolveInstrumentPitchOffset(
    opts.instrumentPitch ?? "concert",
    opts.instrumentPitchManual ?? 0,
  );
  return (
    clampSemitoneOffset(opts.teamSemitones ?? 0) +
    local +
    scoreOctaveToSemitones(opts.scoreOctave ?? 0)
  );
}

/** Apply Sheet.Transpose (team + pitch + score octave) and re-render when ready. */
export function applyScoreSheetTranspose(
  osmd: OpenSheetMusicDisplay,
  semitones: number,
): void {
  if (!osmd.Sheet) return;
  const installedCalculator = !osmd.TransposeCalculator;
  if (installedCalculator) {
    osmd.TransposeCalculator = new TransposeCalculator();
  }
  const next = Math.trunc(semitones);
  const current = osmd.Sheet.Transpose ?? 0;
  if (current === next) {
    // Calculator may have been missing while Transpose was already set — force graphic rebuild.
    if (installedCalculator) {
      try {
        osmd.updateGraphic();
      } catch {
        /* older OSMD */
      }
    }
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
