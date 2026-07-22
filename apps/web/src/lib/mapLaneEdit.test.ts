import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteMapEvent,
  deleteMapEvents,
  insertMapEventAt,
  moveMapEvent,
  moveMapEventsByDelta,
  splitMapAt,
  upsertKeyAt,
  upsertMeterAt,
  upsertTempoAt,
} from "./mapLaneEdit.js";

function seed() {
  return createProjectV5Seed("p1", "Song", "2026-07-20T12:00:00.000Z");
}

describe("mapLaneEdit", () => {
  it("insertMapEventAt tempo inherits bpm and snaps to bar", () => {
    const p = seed();
    const next = insertMapEventAt(p, "tempo", 7680, "bar");
    const novel = next.tempoMap.filter(
      (e) => !p.tempoMap.some((o) => o.id === e.id),
    );
    expect(novel).toHaveLength(1);
    expect(novel[0]!.startTicks).toBe(7680);
    expect(novel[0]!.bpm).toBe(p.defaultBpm);
  });

  it("upsertMeterAt @ 0 resyncs countdown length for new meter (2 bars 4/4→3/4)", () => {
    const p = seed();
    const cd = p.forma.clips.find((c) => c.kind === "countdown")!;
    expect(cd.lengthTicks).toBe(7680); // 2 × 4/4
    const next = upsertMeterAt(p, 0, 3, 4);
    expect(next.defaultMeter).toEqual({ numerator: 3, denominator: 4 });
    const cdNext = next.forma.clips.find((c) => c.kind === "countdown")!;
    expect(cdNext.lengthTicks).toBe(5760); // 2 × 3/4 @ PPQ 960
    expect(cdNext.startTicks + cdNext.lengthTicks).toBe(0);
  });

  it("splitMapAt equals insert for map lanes", () => {
    const p = seed();
    const a = splitMapAt(p, "tonacja", 7680, "bar");
    const b = insertMapEventAt(p, "tonacja", 7680, "bar");
    expect(a.keyMap?.length).toBe(b.keyMap?.length);
  });

  it("upsertTempoAt updates existing / inserts", () => {
    const p = seed();
    const at0 = upsertTempoAt(p, 0, 140);
    expect(at0.tempoMap.find((e) => e.startTicks === 0)?.bpm).toBe(140);
    const atBar = upsertTempoAt(at0, 7680, 100);
    expect(atBar.tempoMap.find((e) => e.startTicks === 7680)?.bpm).toBe(100);
  });

  it("upsertMeterAt and upsertKeyAt write maps", () => {
    const p = seed();
    const m = upsertMeterAt(p, 7680, 3, 4);
    expect(m.meterMap.find((e) => e.startTicks === 7680)).toMatchObject({
      numerator: 3,
      denominator: 4,
    });
    const k = upsertKeyAt(p, 7680, { tonic: "G", mode: "major" });
    expect(k.keyMap?.find((e) => e.startTicks === 7680)?.key).toEqual({
      tonic: "G",
      mode: "major",
    });
  });

  it("deleteMapEvent refuses emptying the map and protects seed @ 0", () => {
    const p = seed();
    const only = p.tempoMap[0]!;
    expect(deleteMapEvent(p, "tempo", only.id)).toBe(p);
    const withExtra = insertMapEventAt(p, "tempo", 7680, "bar");
    const seedEv = withExtra.tempoMap.find((e) => e.startTicks === 0)!;
    const extra = withExtra.tempoMap.find((e) => e.startTicks !== 0)!;
    expect(deleteMapEvent(withExtra, "tempo", seedEv.id)).toBe(withExtra);
    const next = deleteMapEvent(withExtra, "tempo", extra.id);
    expect(next.tempoMap).toHaveLength(withExtra.tempoMap.length - 1);
  });

  it("insertMapEventAt default snaps to beat grid", () => {
    const p = seed();
    const next = insertMapEventAt(p, "tempo", 500);
    const novel = next.tempoMap.find((e) => e.startTicks === 960);
    expect(novel?.bpm).toBe(p.defaultBpm);
  });

  it("moveMapEvent relocates non-zero onset; pins tick 0", () => {
    const p = seed();
    const withExtra = insertMapEventAt(p, "tempo", 7680, "bar");
    const extra = withExtra.tempoMap.find((e) => e.startTicks === 7680)!;
    const moved = moveMapEvent(withExtra, "tempo", extra.id, 15360, "bar");
    expect(moved.tempoMap.find((e) => e.id === extra.id)?.startTicks).toBe(
      15360,
    );
    const seedEv = withExtra.tempoMap.find((e) => e.startTicks === 0)!;
    expect(moveMapEvent(withExtra, "tempo", seedEv.id, 7680, "bar")).toBe(
      withExtra,
    );
  });

  it("moveMapEventsByDelta moves multi-selection; pins seed @ 0", () => {
    const p = seed();
    let next = insertMapEventAt(p, "tempo", 7680, "bar");
    next = insertMapEventAt(next, "tempo", 15360, "bar");
    const a = next.tempoMap.find((e) => e.startTicks === 7680)!;
    const b = next.tempoMap.find((e) => e.startTicks === 15360)!;
    const seedEv = next.tempoMap.find((e) => e.startTicks === 0)!;
    const moved = moveMapEventsByDelta(
      next,
      "tempo",
      [seedEv.id, a.id, b.id],
      7680,
      "bar",
    );
    expect(moved.tempoMap.find((e) => e.id === seedEv.id)?.startTicks).toBe(0);
    expect(moved.tempoMap.find((e) => e.id === a.id)?.startTicks).toBe(15360);
    expect(moved.tempoMap.find((e) => e.id === b.id)?.startTicks).toBe(23040);
  });

  it("deleteMapEvents removes several without emptying", () => {
    let p = seed();
    p = insertMapEventAt(p, "tempo", 7680, "bar");
    p = insertMapEventAt(p, "tempo", 15360, "bar");
    const extras = p.tempoMap.filter((e) => e.startTicks !== 0).map((e) => e.id);
    const next = deleteMapEvents(p, "tempo", extras);
    expect(next.tempoMap).toHaveLength(1);
    expect(next.tempoMap[0]!.startTicks).toBe(0);
  });
});
