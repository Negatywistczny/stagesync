/**
 * Tempo / Metrum / Tonacja map lane edit — pencil insert + scissors split + value upsert.
 * Parity with v4 SongMaps insert / splitMapAt (ticks instead of absBeat).
 */

import {
  resolveKeyAt,
  resolveMeterAt,
  resolveTempoAt,
  type KeySignature,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";
import { contentSnapModeFromModifiers } from "./timelineGesture.js";

export type MapLaneId = "tempo" | "metrum" | "tonacja";

export function isMapLaneId(id: string): id is MapLaneId {
  return id === "tempo" || id === "metrum" || id === "tonacja";
}

function snapMapTicks(
  project: Project,
  atTicks: number,
  mode: SnapMode,
): number {
  const floor = contentFloorTicks(project.forma.clips);
  return Math.max(floor, snapEditTicks(project, atTicks, mode));
}

/** Insert (or no-op if event already at ticks) a map change inheriting current value. */
export function insertMapEventAt(
  project: Project,
  lane: MapLaneId,
  atTicks: number,
  mode: SnapMode = "beat",
): Project {
  const startTicks = snapMapTicks(project, atTicks, mode);
  if (lane === "tempo") {
    const map = [...project.tempoMap].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    if (map.some((e) => e.startTicks === startTicks)) return project;
    const bpm = resolveTempoAt(project, startTicks);
    return {
      ...project,
      tempoMap: [
        ...map,
        { id: `tempo-${crypto.randomUUID()}`, startTicks, bpm },
      ].sort((a, b) => a.startTicks - b.startTicks),
    };
  }
  if (lane === "metrum") {
    const map = [...project.meterMap].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    if (map.some((e) => e.startTicks === startTicks)) return project;
    const meter = resolveMeterAt(project, startTicks);
    return {
      ...project,
      meterMap: [
        ...map,
        {
          id: `meter-${crypto.randomUUID()}`,
          startTicks,
          numerator: meter.numerator,
          denominator: meter.denominator,
        },
      ].sort((a, b) => a.startTicks - b.startTicks),
    };
  }
  const map = [...(project.keyMap ?? [])].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  if (map.some((e) => e.startTicks === startTicks)) return project;
  const key = resolveKeyAt(project, startTicks) ?? {
    tonic: "C" as const,
    mode: "major" as const,
  };
  return {
    ...project,
    keyMap: [
      ...map,
      { id: `key-${crypto.randomUUID()}`, startTicks, key },
    ].sort((a, b) => a.startTicks - b.startTicks),
  };
}

/** Scissors on map lane = insert change at cut (v4 splitMapAt). */
export function splitMapAt(
  project: Project,
  lane: MapLaneId,
  atTicks: number,
  mode: SnapMode = "beat",
): Project {
  return insertMapEventAt(project, lane, atTicks, mode);
}

export function upsertTempoAt(
  project: Project,
  startTicks: number,
  bpm: number,
): Project {
  if (!(bpm > 0) || !Number.isFinite(bpm)) return project;
  const map = [...project.tempoMap].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  const existing = map.find((e) => e.startTicks === startTicks);
  const nextMap = existing
    ? map.map((e) => (e.startTicks === startTicks ? { ...e, bpm } : e))
    : [...map, { id: `tempo-${crypto.randomUUID()}`, startTicks, bpm }];
  return { ...project, tempoMap: nextMap };
}

export function upsertMeterAt(
  project: Project,
  startTicks: number,
  numerator: number,
  denominator: number,
): Project {
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    numerator < 1 ||
    denominator < 1
  ) {
    return project;
  }
  const map = [...project.meterMap].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  const existing = map.find((e) => e.startTicks === startTicks);
  const nextMap = existing
    ? map.map((e) =>
        e.startTicks === startTicks
          ? { ...e, numerator, denominator }
          : e,
      )
    : [
        ...map,
        {
          id: `meter-${crypto.randomUUID()}`,
          startTicks,
          numerator,
          denominator,
        },
      ];
  return { ...project, meterMap: nextMap };
}

export function upsertKeyAt(
  project: Project,
  startTicks: number,
  key: KeySignature,
): Project {
  const map = [...(project.keyMap ?? [])].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  const existing = map.find((e) => e.startTicks === startTicks);
  const nextMap = existing
    ? map.map((e) =>
        e.startTicks === startTicks ? { ...e, key } : e,
      )
    : [
        ...map,
        { id: `key-${crypto.randomUUID()}`, startTicks, key },
      ];
  return { ...project, keyMap: nextMap };
}

/** Eraser: remove map event by id. Seed @ 0 and last remaining event are protected. */
export function deleteMapEvent(
  project: Project,
  lane: MapLaneId,
  eventId: string,
): Project {
  if (lane === "tempo") {
    const target = project.tempoMap.find((e) => e.id === eventId);
    if (!target || target.startTicks === 0) return project;
    const map = project.tempoMap.filter((e) => e.id !== eventId);
    if (map.length === 0) return project;
    return { ...project, tempoMap: map };
  }
  if (lane === "metrum") {
    const target = project.meterMap.find((e) => e.id === eventId);
    if (!target || target.startTicks === 0) return project;
    const map = project.meterMap.filter((e) => e.id !== eventId);
    if (map.length === 0) return project;
    return { ...project, meterMap: map };
  }
  const target = (project.keyMap ?? []).find((e) => e.id === eventId);
  if (!target || target.startTicks === 0) return project;
  const map = (project.keyMap ?? []).filter((e) => e.id !== eventId);
  if (map.length === 0) return project;
  return { ...project, keyMap: map };
}

/**
 * Drag-move a map event onset (v4 moveMapEventsSilent for tempo/meter/key).
 * Event at startTicks === 0 stays pinned. Collides with existing onset → no-op.
 */
export function moveMapEvent(
  project: Project,
  lane: MapLaneId,
  eventId: string,
  newStartTicks: number,
  mode: SnapMode = "beat",
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  let startTicks = snapMapTicks(project, newStartTicks, mode);

  if (lane === "tempo") {
    const map = [...project.tempoMap].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    const ev = map.find((e) => e.id === eventId);
    if (!ev) return project;
    if (ev.startTicks === 0) return project;
    if (startTicks < floor) startTicks = floor;
    if (startTicks === ev.startTicks) return project;
    if (map.some((e) => e.id !== eventId && e.startTicks === startTicks)) {
      return project;
    }
    return {
      ...project,
      tempoMap: map
        .map((e) => (e.id === eventId ? { ...e, startTicks } : e))
        .sort((a, b) => a.startTicks - b.startTicks),
    };
  }

  if (lane === "metrum") {
    const map = [...project.meterMap].sort(
      (a, b) => a.startTicks - b.startTicks,
    );
    const ev = map.find((e) => e.id === eventId);
    if (!ev) return project;
    if (ev.startTicks === 0) return project;
    if (startTicks < floor) startTicks = floor;
    if (startTicks === ev.startTicks) return project;
    if (map.some((e) => e.id !== eventId && e.startTicks === startTicks)) {
      return project;
    }
    return {
      ...project,
      meterMap: map
        .map((e) => (e.id === eventId ? { ...e, startTicks } : e))
        .sort((a, b) => a.startTicks - b.startTicks),
    };
  }

  const map = [...(project.keyMap ?? [])].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  const ev = map.find((e) => e.id === eventId);
  if (!ev) return project;
  if (ev.startTicks === 0) return project;
  if (startTicks < floor) startTicks = floor;
  if (startTicks === ev.startTicks) return project;
  if (map.some((e) => e.id !== eventId && e.startTicks === startTicks)) {
    return project;
  }
  return {
    ...project,
    keyMap: map
      .map((e) => (e.id === eventId ? { ...e, startTicks } : e))
      .sort((a, b) => a.startTicks - b.startTicks),
  };
}

export function findMapEventAtTicks(
  project: Project,
  lane: MapLaneId,
  atTicks: number,
): { id: string; startTicks: number } | null {
  const list =
    lane === "tempo"
      ? project.tempoMap
      : lane === "metrum"
        ? project.meterMap
        : (project.keyMap ?? []);
  const hit = list.find((e) => e.startTicks === atTicks);
  return hit ? { id: hit.id, startTicks: hit.startTicks } : null;
}

export function mapSnapMode(
  metaKey: boolean,
  ctrlKey: boolean,
): SnapMode {
  return contentSnapModeFromModifiers(metaKey, ctrlKey);
}

/** Ordered real map event ids on a lane (excludes synthetic *-default). */
export function mapEventIds(
  project: Project,
  lane: MapLaneId,
): string[] {
  const list =
    lane === "tempo"
      ? project.tempoMap
      : lane === "metrum"
        ? project.meterMap
        : (project.keyMap ?? []);
  return [...list]
    .sort((a, b) => a.startTicks - b.startTicks)
    .map((e) => e.id);
}

/**
 * Move several map events by the same tick delta (v4 moveMapEventsSilent).
 * Seed @ 0 stays pinned. Colliding onsets are skipped per-event.
 */
export function moveMapEventsByDelta(
  project: Project,
  lane: MapLaneId,
  eventIds: readonly string[],
  deltaTicks: number,
  mode: SnapMode = "beat",
): Project {
  if (!eventIds.length || deltaTicks === 0) return project;
  const idSet = new Set(eventIds);
  let next = project;
  // Move from high→low when delta>0 (and reverse when delta<0) to reduce collisions.
  const ordered = mapEventIds(project, lane)
    .filter((id) => idSet.has(id))
    .map((id) => {
      const list =
        lane === "tempo"
          ? project.tempoMap
          : lane === "metrum"
            ? project.meterMap
            : (project.keyMap ?? []);
      const ev = list.find((e) => e.id === id)!;
      return ev;
    })
    .sort((a, b) =>
      deltaTicks > 0
        ? b.startTicks - a.startTicks
        : a.startTicks - b.startTicks,
    );

  for (const ev of ordered) {
    if (ev.startTicks === 0) continue;
    const target = ev.startTicks + deltaTicks;
    const moved = moveMapEvent(next, lane, ev.id, target, mode);
    next = moved;
  }
  return next;
}

/** Eraser / Delete on multi-selection — drop all listed ids (keep ≥1 event). */
export function deleteMapEvents(
  project: Project,
  lane: MapLaneId,
  eventIds: readonly string[],
): Project {
  let next = project;
  for (const id of eventIds) {
    if (id.endsWith("-default")) continue;
    next = deleteMapEvent(next, lane, id);
  }
  return next;
}
