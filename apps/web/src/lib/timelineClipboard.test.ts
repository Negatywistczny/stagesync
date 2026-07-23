import { describe, expect, it } from "vitest";
import { createProjectV5Seed, type Project } from "@stagesync/shared";
import {
  buildClipboardFromClips,
  deleteClipsOnLane,
  pasteClipboardAt,
  pasteClipboardWithDelta,
  selectionMaxEndTicks,
  type TimelineClipboard,
} from "./timelineClipboard.js";
import { audioLaneId } from "./timelineTracks.js";

const TS = "2026-07-22T00:00:00.000Z";

function seedWithAudio(): Project {
  const base = createProjectV5Seed("p1", "Song", TS);
  return {
    ...base,
    audioTracks: [{ id: "track-a", name: "A" }],
    assets: [
      {
        id: "asset-a",
        storageName: "a.wav",
        originalName: "a.wav",
        kind: "audio" as const,
        mimeType: "audio/wav",
        sizeBytes: 10,
      },
    ],
    audioClips: [
      {
        id: "clip-1",
        trackId: "track-a",
        assetId: "asset-a",
        startTicks: 0,
        lengthTicks: 3840,
        trimInMs: 10,
        trimOutMs: 20,
        muted: true,
        gainDb: -3,
      },
    ],
  };
}

describe("timelineClipboard", () => {
  it("returns null for empty clip lists and audio without asset/track", () => {
    expect(buildClipboardFromClips("forma", [])).toBeNull();
    expect(
      buildClipboardFromClips(audioLaneId("track-a"), [
        { id: "x", startTicks: 0, lengthTicks: 100 },
      ]),
    ).toBeNull();
  });

  it("builds clipboard for forma, tekst, akordy, cue, and audio lanes", () => {
    const forma = buildClipboardFromClips("forma", [
      {
        id: "f2",
        startTicks: 3840,
        lengthTicks: 1920,
        name: "Verse",
        note: "n",
        subsections: [1, 2],
      },
      { id: "f1", startTicks: 0, lengthTicks: 3840 },
    ]);
    expect(forma?.items.map((i) => i.startTicks)).toEqual([0, 3840]);
    expect(forma?.items[0]!.payload.name).toBe("Sekcja");
    expect(forma?.items[1]!.payload).toMatchObject({
      name: "Verse",
      note: "n",
      subsections: [1, 2],
    });

    expect(
      buildClipboardFromClips("tekst", [
        { id: "t", startTicks: 0, lengthTicks: 100, text: "hi" },
      ])?.items[0]!.payload.text,
    ).toBe("hi");
    expect(
      buildClipboardFromClips("tekst", [
        { id: "t", startTicks: 0, lengthTicks: 100 },
      ])?.items[0]!.payload.text,
    ).toBe("");

    expect(
      buildClipboardFromClips("akordy", [
        { id: "a", startTicks: 0, lengthTicks: 100 },
      ])?.items[0]!.payload.symbol,
    ).toBe("C");
    expect(
      buildClipboardFromClips("akordy", [
        { id: "a", startTicks: 0, lengthTicks: 100, symbol: "G" },
      ])?.items[0]!.payload.symbol,
    ).toBe("G");

    const cue = buildClipboardFromClips("cue", [
      {
        id: "c",
        startTicks: 0,
        lengthTicks: 100,
        roles: ["karaoke"],
        priority: "alert",
      },
      { id: "c2", startTicks: 200, lengthTicks: 50, label: "Go" },
    ]);
    expect(cue?.items[0]!.payload).toMatchObject({
      label: "Cue",
      roles: ["karaoke"],
      priority: "alert",
    });
    expect(cue?.items[1]!.payload).toEqual({ label: "Go" });

    const lane = audioLaneId("track-a");
    const audio = buildClipboardFromClips(lane, [
      {
        id: "clip-1",
        startTicks: 0,
        lengthTicks: 100,
        trackId: "track-a",
        assetId: "asset-a",
        trimInMs: 1,
        trimOutMs: 2,
        muted: false,
        gainDb: 1,
      },
    ]);
    expect(audio?.items[0]!.payload).toMatchObject({
      trackId: "track-a",
      assetId: "asset-a",
      trimInMs: 1,
      trimOutMs: 2,
      muted: false,
      gainDb: 1,
    });
  });

  it("selectionMaxEndTicks returns max clip end", () => {
    expect(selectionMaxEndTicks([])).toBe(0);
    expect(
      selectionMaxEndTicks([
        { id: "a", startTicks: 0, lengthTicks: 100 },
        { id: "b", startTicks: 50, lengthTicks: 200 },
      ]),
    ).toBe(250);
  });

  it("pasteClipboardWithDelta returns null on empty or zero delta", () => {
    const p = createProjectV5Seed("p", "S", TS);
    const empty: TimelineClipboard = { lane: "forma", items: [] };
    expect(pasteClipboardWithDelta(p, empty, 100)).toBeNull();
    const board = buildClipboardFromClips("forma", [
      { id: "f", startTicks: 0, lengthTicks: 3840, name: "A" },
    ])!;
    expect(pasteClipboardWithDelta(p, board, 0)).toBeNull();
  });

  it("pastes forma with note/subsections and shifts by delta", () => {
    const p = createProjectV5Seed("p", "S", TS);
    const board = buildClipboardFromClips("forma", [
      {
        id: "f",
        startTicks: 0,
        lengthTicks: 3840,
        name: "Verse",
        note: "n",
        subsections: [1],
      },
    ])!;
    const withDelta = pasteClipboardWithDelta(p, board, 7680);
    expect(withDelta?.newIds).toHaveLength(1);
    const clip = withDelta!.project.forma.clips.find(
      (c) => c.id === withDelta!.newIds[0],
    )!;
    expect(clip).toMatchObject({
      startTicks: 7680,
      name: "Verse",
      note: "n",
      subsections: [1],
    });

    const bare = buildClipboardFromClips("forma", [
      { id: "f2", startTicks: 0, lengthTicks: 1920 },
    ])!;
    const at = pasteClipboardAt(p, bare, 3840);
    const pasted = at!.project.forma.clips.find((c) => c.id === at!.newIds[0])!;
    expect(pasted.name).toBe("Sekcja");
    expect(pasted.note).toBeUndefined();
  });

  it("pastes audio and skips missing track/asset; returns null when nothing pasted", () => {
    const project = seedWithAudio();
    const lane = audioLaneId("track-a");
    const board = buildClipboardFromClips(lane, project.audioClips)!;
    const ok = pasteClipboardAt(project, board, 7680);
    expect(ok?.project.audioClips).toHaveLength(2);
    expect(ok?.project.audioClips.find((c) => c.id === ok!.newIds[0])).toMatchObject({
      trimInMs: 10,
      trimOutMs: 20,
      muted: true,
      gainDb: -3,
    });

    const noAsset: TimelineClipboard = {
      lane,
      items: [
        {
          lane,
          startTicks: 0,
          lengthTicks: 100,
          payload: { trackId: "track-a" },
        },
      ],
    };
    expect(pasteClipboardAt(project, noAsset, 100)).toBeNull();

    const badTrack: TimelineClipboard = {
      lane,
      items: [
        {
          lane,
          startTicks: 0,
          lengthTicks: 100,
          payload: { assetId: "asset-a", trackId: "missing" },
        },
      ],
    };
    expect(pasteClipboardAt(project, badTrack, 100)).toBeNull();

    const badAsset: TimelineClipboard = {
      lane,
      items: [
        {
          lane,
          startTicks: 0,
          lengthTicks: 100,
          payload: { assetId: "nope", trackId: "track-a" },
        },
      ],
    };
    expect(pasteClipboardAt(project, badAsset, 100)).toBeNull();

    // falls back to lane track id when payload omits trackId
    const laneOnly: TimelineClipboard = {
      lane,
      items: [
        {
          lane,
          startTicks: 0,
          lengthTicks: 100,
          payload: { assetId: "asset-a" },
        },
      ],
    };
    expect(pasteClipboardAt(project, laneOnly, 200)?.newIds).toHaveLength(1);

    // minimal payload without optional audio fields
    const minimal = buildClipboardFromClips(lane, [
      {
        id: "c",
        startTicks: 0,
        lengthTicks: 50,
        trackId: "track-a",
        assetId: "asset-a",
      },
    ])!;
    const minPaste = pasteClipboardAt(project, minimal, 300);
    const minClip = minPaste!.project.audioClips.find(
      (c) => c.id === minPaste!.newIds[0],
    )!;
    expect(minClip.trimInMs).toBeUndefined();
    expect(minClip.muted).toBeUndefined();
  });

  it("pastes tekst/akordy/cue preserving neighbor fields and cue extras", () => {
    let p = createProjectV5Seed("p", "S", TS);
    p = {
      ...p,
      tekst: {
        clips: [
          { id: "t-old", startTicks: 0, lengthTicks: 3840, text: "old" },
        ],
      },
      akordy: {
        clips: [
          { id: "a-old", startTicks: 0, lengthTicks: 3840, symbol: "Dm" },
        ],
      },
      cue: {
        clips: [
          {
            id: "c-old",
            startTicks: 0,
            lengthTicks: 3840,
            label: "Old",
            roles: ["grid"],
            priority: "alert",
          },
        ],
      },
    };

    const tekstBoard = buildClipboardFromClips("tekst", [
      { id: "t", startTicks: 0, lengthTicks: 1920, text: "new" },
    ])!;
    const tekstPaste = pasteClipboardAt(p, tekstBoard, 7680)!;
    expect(
      tekstPaste.project.tekst.clips.find((c) => c.id === tekstPaste.newIds[0])
        ?.text,
    ).toBe("new");
    expect(
      tekstPaste.project.tekst.clips.find((c) => c.id === "t-old")?.text,
    ).toBe("old");

    const emptyTekst = buildClipboardFromClips("tekst", [
      { id: "t2", startTicks: 0, lengthTicks: 100 },
    ])!;
    const emptyTekstPaste = pasteClipboardAt(p, emptyTekst, 9600)!;
    expect(
      emptyTekstPaste.project.tekst.clips.find(
        (c) => c.id === emptyTekstPaste.newIds[0],
      )?.text,
    ).toBe("");

    const akordyBoard = buildClipboardFromClips("akordy", [
      { id: "a", startTicks: 0, lengthTicks: 1920, symbol: "G" },
    ])!;
    const akordyPaste = pasteClipboardAt(p, akordyBoard, 7680)!;
    expect(
      akordyPaste.project.akordy.clips.find(
        (c) => c.id === akordyPaste.newIds[0],
      )?.symbol,
    ).toBe("G");
    expect(
      akordyPaste.project.akordy.clips.find((c) => c.id === "a-old")?.symbol,
    ).toBe("Dm");

    const defaultAkord = buildClipboardFromClips("akordy", [
      { id: "a2", startTicks: 0, lengthTicks: 100 },
    ])!;
    expect(
      pasteClipboardAt(p, defaultAkord, 10000)!.project.akordy.clips.find(
        (c) => true,
      ),
    ).toBeTruthy();

    const cueBoard = buildClipboardFromClips("cue", [
      {
        id: "c",
        startTicks: 0,
        lengthTicks: 1920,
        label: "Go",
        roles: ["score"],
        priority: "alert",
      },
    ])!;
    const cuePaste = pasteClipboardAt(p, cueBoard, 7680)!;
    const newCue = cuePaste.project.cue.clips.find(
      (c) => c.id === cuePaste.newIds[0],
    )!;
    expect(newCue).toMatchObject({
      label: "Go",
      roles: ["score"],
      priority: "alert",
    });
    const oldCue = cuePaste.project.cue.clips.find((c) => c.id === "c-old")!;
    expect(oldCue).toMatchObject({
      label: "Old",
      roles: ["grid"],
      priority: "alert",
    });

    const plainCue = buildClipboardFromClips("cue", [
      { id: "c2", startTicks: 0, lengthTicks: 100 },
    ])!;
    const plainPaste = pasteClipboardAt(p, plainCue, 11000)!;
    const plain = plainPaste.project.cue.clips.find(
      (c) => c.id === plainPaste.newIds[0],
    )!;
    expect(plain.label).toBe("Cue");
    expect(plain.roles).toBeUndefined();

    // existing neighbor without roles/alert → empty spread branches
    const withNormal = {
      ...p,
      cue: {
        clips: [
          {
            id: "c-normal",
            startTicks: 0,
            lengthTicks: 3840,
            label: "N",
          },
        ],
      },
    };
    const normalPaste = pasteClipboardAt(withNormal, plainCue, 7680)!;
    expect(
      normalPaste.project.cue.clips.find((c) => c.id === "c-normal"),
    ).toMatchObject({ label: "N" });
  });

  it("pasteClipboardAt returns null for empty clipboard", () => {
    const p = createProjectV5Seed("p", "S", TS);
    expect(pasteClipboardAt(p, { lane: "forma", items: [] }, 0)).toBeNull();
  });

  it("deleteClipsOnLane covers all lanes and no-op cases", () => {
    let p = seedWithAudio();
    p = {
      ...p,
      forma: {
        clips: [
          ...p.forma.clips,
          {
            id: "forma-v",
            name: "Verse",
            kind: "section",
            startTicks: 7680,
            lengthTicks: 3840,
          },
        ],
      },
      tekst: {
        clips: [{ id: "t1", startTicks: 0, lengthTicks: 100, text: "a" }],
      },
      akordy: {
        clips: [{ id: "a1", startTicks: 0, lengthTicks: 100, symbol: "C" }],
      },
      cue: {
        clips: [{ id: "c1", startTicks: 0, lengthTicks: 100, label: "Go" }],
      },
    };

    expect(deleteClipsOnLane(p, "forma", [])).toBe(p);

    const afterCd = deleteClipsOnLane(p, "forma", ["forma-cd"]);
    expect(afterCd).toBe(p);
    expect(afterCd.forma.clips.some((c) => c.kind === "countdown")).toBe(true);

    const afterMissing = deleteClipsOnLane(p, "forma", ["nope"]);
    expect(afterMissing).toBe(p);

    const afterForma = deleteClipsOnLane(p, "forma", ["forma-v"]);
    expect(afterForma.forma.clips.find((c) => c.id === "forma-v")).toBeUndefined();

    expect(deleteClipsOnLane(p, "tekst", ["nope"])).toBe(p);
    expect(
      deleteClipsOnLane(p, "tekst", ["t1"]).tekst.clips,
    ).toHaveLength(0);

    expect(deleteClipsOnLane(p, "akordy", ["nope"])).toBe(p);
    expect(
      deleteClipsOnLane(p, "akordy", ["a1"]).akordy.clips,
    ).toHaveLength(0);

    expect(deleteClipsOnLane(p, "cue", ["nope"])).toBe(p);
    expect(deleteClipsOnLane(p, "cue", ["c1"]).cue.clips).toHaveLength(0);

    const lane = audioLaneId("track-a");
    expect(deleteClipsOnLane(p, lane, ["nope"])).toBe(p);
    expect(
      deleteClipsOnLane(p, lane, ["clip-1"]).audioClips,
    ).toHaveLength(0);

    // unknown lane falls through (defensive)
    expect(
      deleteClipsOnLane(p, "mapa" as "cue", ["x"]),
    ).toBe(p);
  });
});
