import { describe, expect, it, vi } from "vitest";
import {
  buildAudioTrackContextMenuItems,
  buildClipContextMenuItems,
  buildEmptyLaneContextMenuItems,
  clipboardMatchesEmptyLane,
  clipContextMenuLabel,
  mapSegmentSelectionAriaLabel,
} from "./timelineContextMenus.js";

function actionIds(
  items: ReturnType<typeof buildClipContextMenuItems>,
): string[] {
  return items
    .filter((i): i is { id: string; label: string; onSelect: () => void } =>
      !("type" in i && i.type === "separator"),
    )
    .map((i) => i.id);
}

describe("timelineContextMenus", () => {
  it("buildAudioTrackContextMenuItems disables duplicate when at limit", () => {
    const onDuplicate = vi.fn();
    const items = buildAudioTrackContextMenuItems({
      canDuplicate: false,
      onRename: vi.fn(),
      onDuplicate,
      onRemove: vi.fn(),
    });
    const dup = items.find(
      (i) => "id" in i && i.id === "duplicate",
    ) as { disabled?: boolean; onSelect: () => void };
    expect(dup.disabled).toBe(true);
    expect(actionIds(items)).toEqual(["rename", "duplicate", "remove"]);
  });

  it("buildClipContextMenuItems omits split/mute unless offered", () => {
    const base = buildClipContextMenuItems({
      lane: "forma",
      canPaste: true,
      canSplit: false,
      onCopy: vi.fn(),
      onCut: vi.fn(),
      onPaste: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onFocusInspector: vi.fn(),
    });
    expect(actionIds(base)).toEqual([
      "cut",
      "copy",
      "paste",
      "duplicate",
      "inspector",
      "delete",
    ]);

    const withSplit = buildClipContextMenuItems({
      lane: "forma",
      canPaste: false,
      canSplit: true,
      onCopy: vi.fn(),
      onCut: vi.fn(),
      onPaste: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onFocusInspector: vi.fn(),
      onSplit: vi.fn(),
    });
    expect(actionIds(withSplit)).toContain("split");

    const audio = buildClipContextMenuItems({
      lane: "audio",
      canPaste: true,
      canSplit: false,
      clipMuted: true,
      onCopy: vi.fn(),
      onCut: vi.fn(),
      onPaste: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      onMuteToggle: vi.fn(),
      onFocusInspector: vi.fn(),
    });
    expect(actionIds(audio)).toContain("mute");
    const mute = audio.find(
      (i) => "id" in i && i.id === "mute",
    ) as { label: string };
    expect(mute.label).toMatch(/Unmute/);
  });

  it("buildEmptyLaneContextMenuItems is lane-aware", () => {
    const forma = buildEmptyLaneContextMenuItems({
      lane: "forma",
      canPaste: true,
      onPaste: vi.fn(),
      onAddClip: vi.fn(),
    });
    expect(actionIds(forma)).toEqual(["paste", "add-clip"]);

    const audio = buildEmptyLaneContextMenuItems({
      lane: "audio",
      canPaste: false,
      onPaste: vi.fn(),
      onImportAudio: vi.fn(),
    });
    expect(actionIds(audio)).toEqual(["paste", "import-audio"]);
    const paste = audio.find(
      (i) => "id" in i && i.id === "paste",
    ) as { disabled?: boolean };
    expect(paste.disabled).toBe(true);
  });

  it("clipboardMatchesEmptyLane handles audio lane ids", () => {
    expect(clipboardMatchesEmptyLane("audio:t1", "audio")).toBe(true);
    expect(clipboardMatchesEmptyLane("forma", "forma")).toBe(true);
    expect(clipboardMatchesEmptyLane("cue", "forma")).toBe(false);
    expect(clipboardMatchesEmptyLane(null, "audio")).toBe(false);
  });

  it("clipContextMenuLabel announces multi-select count", () => {
    expect(clipContextMenuLabel(1)).toBe("Menu klipu");
    expect(clipContextMenuLabel(3)).toBe("Menu klipu (3 zaznaczone)");
    expect(clipContextMenuLabel(0)).toBe("Menu klipu");
    expect(clipContextMenuLabel(Number.NaN)).toBe("Menu klipu");
  });

  it("mapSegmentSelectionAriaLabel includes selection / group size", () => {
    expect(
      mapSegmentSelectionAriaLabel("120 BPM", { selected: false }),
    ).toBe("120 BPM — ⌘/⇧ zaznaczanie · przeciągnij lub kliknij");
    expect(
      mapSegmentSelectionAriaLabel("120 BPM", { selected: true }),
    ).toBe("120 BPM, zaznaczony — ⌘/⇧ zaznaczanie · przeciągnij lub kliknij");
    expect(
      mapSegmentSelectionAriaLabel("4/4", {
        selected: true,
        groupSize: 3,
      }),
    ).toBe(
      "4/4, zaznaczony, w grupie 3 — ⌘/⇧ zaznaczanie · przeciągnij lub kliknij",
    );
  });
});
