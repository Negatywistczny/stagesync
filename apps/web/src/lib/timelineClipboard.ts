/**
 * In-app Timeline clipboard (v4 ⌘C/X/V/D) — JSON payloads, not system clipboard.
 */

import {
  insertSpanOverwrite,
  type FormaClip,
  type Project,
} from "@stagesync/shared";
import { contentFloorTicks } from "./formaCanvas.js";
import {
  contentAsForma,
  type ContentLaneId,
} from "./contentLaneEdit.js";
import type { ClipSelectionLane } from "./timelineSelection.js";
import { isAudioSelectionLane } from "./timelineSelection.js";

export type ClipboardPayload = {
  name?: string;
  note?: string;
  subsections?: number[];
  text?: string;
  symbol?: string;
  label?: string;
};

export type ClipboardItem = {
  lane: ClipSelectionLane;
  startTicks: number;
  lengthTicks: number;
  payload: ClipboardPayload;
};

export type TimelineClipboard = {
  lane: ClipSelectionLane;
  items: ClipboardItem[];
};

type TimedPayloadClip = {
  id: string;
  startTicks: number;
  lengthTicks: number;
  kind?: string;
  name?: string;
  note?: string;
  subsections?: number[];
  text?: string;
  symbol?: string;
  label?: string;
};

export function buildClipboardFromClips(
  lane: ClipSelectionLane,
  clips: TimedPayloadClip[],
): TimelineClipboard | null {
  if (!clips.length) return null;
  const ordered = [...clips].sort(
    (a, b) =>
      a.startTicks - b.startTicks || String(a.id).localeCompare(String(b.id)),
  );
  const items: ClipboardItem[] = ordered.map((c) => {
    if (lane === "forma") {
      return {
        lane,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        payload: {
          name: c.name || "Sekcja",
          note: c.note,
          subsections: c.subsections ? [...c.subsections] : undefined,
        },
      };
    }
    if (lane === "tekst") {
      return {
        lane,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        payload: { text: c.text ?? "" },
      };
    }
    if (lane === "akordy") {
      return {
        lane,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        payload: { symbol: c.symbol || "C" },
      };
    }
    return {
      lane,
      startTicks: c.startTicks,
      lengthTicks: c.lengthTicks,
      payload: { label: c.label || "Cue" },
    };
  });
  return { lane, items };
}

export function selectionMaxEndTicks(clips: TimedPayloadClip[]): number {
  let max = 0;
  for (const c of clips) {
    max = Math.max(max, c.startTicks + c.lengthTicks);
  }
  return max;
}

function mintId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Paste clipboard items at anchorTicks with relative offsets (v4 pasteItems).
 * Uses insertSpanOverwrite per item (overwrite / no-overlap like pencil).
 * @returns new project + created ids (or null on empty)
 */
/**
 * Paste with rigid Δ from clipboard item starts (v4 optionCopy / Alt+drag).
 * `deltaTicks` = primaryNewStart − primaryOriginStart.
 */
export function pasteClipboardWithDelta(
  project: Project,
  clipboard: TimelineClipboard,
  deltaTicks: number,
): { project: Project; newIds: string[] } | null {
  if (!clipboard.items.length || deltaTicks === 0) return null;
  const origin = clipboard.items[0]!.startTicks;
  return pasteClipboardAt(project, clipboard, origin + deltaTicks);
}

export function pasteClipboardAt(
  project: Project,
  clipboard: TimelineClipboard,
  anchorTicks: number,
): { project: Project; newIds: string[] } | null {
  if (!clipboard.items.length) return null;
  const origin = clipboard.items[0]!.startTicks;
  const floor = contentFloorTicks(project.forma.clips);
  const newIds: string[] = [];
  let next = project;

  for (const item of clipboard.items) {
    const start = Math.max(
      floor,
      Math.trunc(anchorTicks + (item.startTicks - origin)),
    );
    const length = Math.max(1, Math.trunc(item.lengthTicks));
    if (clipboard.lane === "forma") {
      const id = mintId("forma");
      const newClip: FormaClip = {
        id,
        name: item.payload.name || "Sekcja",
        kind: "section",
        startTicks: start,
        lengthTicks: length,
        ...(item.payload.note ? { note: item.payload.note } : {}),
        ...(item.payload.subsections?.length
          ? { subsections: [...item.payload.subsections] }
          : {}),
      };
      const clips = insertSpanOverwrite(next.forma.clips, newClip, {
        contentFloorTicks: floor,
      });
      next = { ...next, forma: { clips } };
      newIds.push(id);
      continue;
    }

    const lane = clipboard.lane as ContentLaneId;
    const idPrefix =
      lane === "tekst" ? "tekst" : lane === "akordy" ? "akord" : "cue";
    const id = mintId(idPrefix);
    const formaLike: FormaClip = {
      id,
      name:
        lane === "tekst"
          ? item.payload.text || "…"
          : lane === "akordy"
            ? item.payload.symbol || "C"
            : item.payload.label || "Cue",
      kind: "section",
      startTicks: start,
      lengthTicks: length,
    };
    const placed = insertSpanOverwrite(contentAsForma(next, lane), formaLike, {
      contentFloorTicks: floor,
    });
    if (lane === "tekst") {
      const byId = new Map(next.tekst.clips.map((c) => [c.id, c]));
      const clips = placed
        .filter((c) => c.kind === "section")
        .map((c) => {
          if (c.id === id) {
            return {
              id: c.id,
              startTicks: c.startTicks,
              lengthTicks: c.lengthTicks,
              text: item.payload.text ?? "",
            };
          }
          const prev = byId.get(c.id);
          return {
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            text: prev?.text ?? "",
          };
        });
      next = { ...next, tekst: { clips } };
    } else if (lane === "akordy") {
      const byId = new Map(next.akordy.clips.map((c) => [c.id, c]));
      const clips = placed
        .filter((c) => c.kind === "section")
        .map((c) => {
          if (c.id === id) {
            return {
              id: c.id,
              startTicks: c.startTicks,
              lengthTicks: c.lengthTicks,
              symbol: item.payload.symbol || "C",
            };
          }
          const prev = byId.get(c.id);
          return {
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            symbol: prev?.symbol ?? "C",
          };
        });
      next = { ...next, akordy: { clips } };
    } else {
      const byId = new Map(next.cue.clips.map((c) => [c.id, c]));
      const clips = placed
        .filter((c) => c.kind === "section")
        .map((c) => {
          if (c.id === id) {
            return {
              id: c.id,
              startTicks: c.startTicks,
              lengthTicks: c.lengthTicks,
              label: item.payload.label || "Cue",
            };
          }
          const prev = byId.get(c.id);
          return {
            id: c.id,
            startTicks: c.startTicks,
            lengthTicks: c.lengthTicks,
            label: prev?.label ?? "Cue",
          };
        });
      next = { ...next, cue: { clips } };
    }
    newIds.push(id);
  }

  if (!newIds.length) return null;
  return { project: next, newIds };
}

export function deleteClipsOnLane(
  project: Project,
  lane: ClipSelectionLane,
  ids: string[],
): Project {
  if (!ids.length) return project;
  const idSet = new Set(ids);
  if (lane === "forma") {
    let clips = project.forma.clips;
    for (const id of idSet) {
      const target = clips.find((c) => c.id === id);
      if (!target || target.kind === "countdown") continue;
      clips = clips.filter((c) => c.id !== id);
    }
    if (clips === project.forma.clips) return project;
    return { ...project, forma: { clips } };
  }
  if (lane === "tekst") {
    const clips = project.tekst.clips.filter((c) => !idSet.has(c.id));
    if (clips.length === project.tekst.clips.length) return project;
    return { ...project, tekst: { clips } };
  }
  if (lane === "akordy") {
    const clips = project.akordy.clips.filter((c) => !idSet.has(c.id));
    if (clips.length === project.akordy.clips.length) return project;
    return { ...project, akordy: { clips } };
  }
  if (lane === "cue") {
    const clips = project.cue.clips.filter((c) => !idSet.has(c.id));
    if (clips.length === project.cue.clips.length) return project;
    return { ...project, cue: { clips } };
  }
  if (isAudioSelectionLane(lane)) {
    const clips = project.audioClips.filter((c) => !idSet.has(c.id));
    if (clips.length === project.audioClips.length) return project;
    return { ...project, audioClips: clips };
  }
  return project;
}
