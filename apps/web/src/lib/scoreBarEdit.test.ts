import { describe, expect, it } from "vitest";
import { createProjectV5Seed, ticksPerBar } from "@stagesync/shared";
import {
  anchorBarWidthTicks,
  canEditKotwice,
  deleteScoreAnchor,
  insertScoreAnchor,
  logicBarFromTicks,
  moveScoreAnchor,
  scoreAnchors,
  ticksFromLogicBar,
  updateScoreAnchor,
} from "./scoreBarEdit.js";

describe("ticksFromLogicBar / logicBarFromTicks meter walk", () => {
  it("round-trips with constant 4/4", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    for (const bar of [1, 2, 5, 17]) {
      const ticks = ticksFromLogicBar(p, bar);
      expect(logicBarFromTicks(p, ticks)).toBe(bar);
    }
  });

  it("logicBarFromTicks guards non-finite / non-positive", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    expect(logicBarFromTicks(p, NaN)).toBe(1);
    expect(logicBarFromTicks(p, 0)).toBe(1);
    expect(logicBarFromTicks(p, -10)).toBe(1);
  });

  it("accounts for mid-song meter change", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const bar4_4 = ticksPerBar(base.defaultMeter, base.ppq);
    const p = {
      ...base,
      meterMap: [
        {
          id: "m0",
          startTicks: 0,
          numerator: 4,
          denominator: 4,
        },
        {
          id: "m1",
          startTicks: bar4_4 * 2,
          numerator: 5,
          denominator: 8,
        },
      ],
    };
    const bar5_8 = ticksPerBar(
      { numerator: 5, denominator: 8 },
      p.ppq,
    );
    expect(ticksFromLogicBar(p, 3)).toBe(bar4_4 * 2);
    expect(ticksFromLogicBar(p, 4)).toBe(bar4_4 * 2 + bar5_8);
    expect(logicBarFromTicks(p, bar4_4 * 2 + bar5_8)).toBe(4);
  });
});

describe("scoreAnchors / canEditKotwice / CRUD", () => {
  it("scoreAnchors normalizes missing map", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    expect(scoreAnchors({ ...p, scoreBarMap: undefined } as unknown as typeof p)).toEqual([]);
  });

  it("canEditKotwice requires musicxml or existing anchors", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    expect(canEditKotwice(base)).toBe(false);
    expect(
      canEditKotwice({
        ...base,
        scoreBarMap: { anchors: [{ id: "a1", logicBar: 1, scoreBar: 1 }] },
      }),
    ).toBe(true);
    expect(
      canEditKotwice({
        ...base,
        assets: [
          {
            id: "xml",
            storageName: "s.xml",
            originalName: "s.xml",
            kind: "musicxml",
            mimeType: "application/xml",
            sizeBytes: 1,
          },
        ],
      }),
    ).toBe(true);
  });

  it("insertScoreAnchor inserts, skips duplicate bar, no-ops without edit rights", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    expect(insertScoreAnchor(base, 0, 1)).toBe(base);

    const withXml = {
      ...base,
      assets: [
        {
          id: "xml",
          storageName: "s.xml",
          originalName: "s.xml",
          kind: "musicxml" as const,
          mimeType: "application/xml",
          sizeBytes: 1,
        },
      ],
    };
    const inserted = insertScoreAnchor(withXml, 0, 2);
    expect(scoreAnchors(inserted)).toHaveLength(1);
    expect(scoreAnchors(inserted)[0]).toMatchObject({
      logicBar: 1,
      scoreBar: 2,
    });

    const dup = insertScoreAnchor(inserted, 100, 9);
    expect(dup).toBe(inserted);

    const bar2 = insertScoreAnchor(
      inserted,
      ticksFromLogicBar(inserted, 2),
      0.4,
    );
    expect(scoreAnchors(bar2).find((a) => a.logicBar === 2)?.scoreBar).toBe(1);
  });

  it("updateScoreAnchor patches fields and delete removes", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const p = {
      ...base,
      scoreBarMap: {
        anchors: [
          { id: "a1", logicBar: 1, scoreBar: 1 },
          { id: "a2", logicBar: 3, scoreBar: 2 },
        ],
      },
    };
    const patched = updateScoreAnchor(p, "a1", {
      logicBar: 2.9,
      scoreBar: 5.2,
    });
    expect(scoreAnchors(patched).find((a) => a.id === "a1")).toMatchObject({
      logicBar: 2,
      scoreBar: 5,
    });
    const same = updateScoreAnchor(p, "a1", {});
    expect(scoreAnchors(same).find((a) => a.id === "a1")).toMatchObject({
      logicBar: 1,
      scoreBar: 1,
    });
    const deleted = deleteScoreAnchor(p, "a1");
    expect(scoreAnchors(deleted).map((a) => a.id)).toEqual(["a2"]);
  });

  it("anchorBarWidthTicks uses meter at bar start", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    expect(anchorBarWidthTicks(p, 1)).toBe(
      ticksPerBar(p.defaultMeter, p.ppq),
    );
  });
});

describe("moveScoreAnchor (#477)", () => {
  it("moves an anchor to a free logic bar", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const p = {
      ...base,
      scoreBarMap: {
        anchors: [
          { id: "a1", logicBar: 1, scoreBar: 1 },
          { id: "a2", logicBar: 3, scoreBar: 2 },
        ],
      },
    };
    const toBar2 = ticksFromLogicBar(p, 2);
    const next = moveScoreAnchor(p, "a1", toBar2);
    const anchors = scoreAnchors(next);
    expect(anchors.find((a) => a.id === "a1")?.logicBar).toBe(2);
    expect(anchors.find((a) => a.id === "a2")?.logicBar).toBe(3);
    expect(anchors).toHaveLength(2);
  });

  it("no-ops when missing, same bar, or occupied", () => {
    const base = createProjectV5Seed("p", "S", "2026-07-22T00:00:00.000Z");
    const p = {
      ...base,
      scoreBarMap: {
        anchors: [
          { id: "a1", logicBar: 1, scoreBar: 1 },
          { id: "a2", logicBar: 3, scoreBar: 2 },
        ],
      },
    };
    expect(moveScoreAnchor(p, "missing", 0)).toBe(p);
    expect(moveScoreAnchor(p, "a1", ticksFromLogicBar(p, 1))).toBe(p);
    expect(moveScoreAnchor(p, "a1", ticksFromLogicBar(p, 3))).toBe(p);
  });
});
