import { describe, it, expect, vi } from "vitest";
import { buildTimelineHeaderProps } from "./buildTimelineHeaderProps.js";

describe("buildTimelineHeaderProps", () => {
  it("builds props mapping correctly from context", () => {
    const appHeader = { nowName: "Song 1" };
    const transport = { state: { status: "playing" } };
    const modals = { songScreenOpen: false };
    const floatingMenus = { eyeOpen: false };
    const setlistState = { autoAdvance: true };
    const playback = { playheadSec: 10 };
    const mapEdits = { displayTicks: 960 };
    const derivedSelection = { hasSelection: true };
    const selection = { selectedIds: [] };
    const panelState = { inspectorOpen: true };
    const draftProject = { id: "p1", name: "Song 1" };

    const props = buildTimelineHeaderProps({
      appHeader,
      transport,
      modals,
      floatingMenus,
      setlistState,
      playback,
      mapEdits,
      derivedSelection,
      selection,
      panelState,
      draftProject,
      projectId: "p1",
      pathname: "/timeline/p1",
      shouldShowOperatorNav: () => true,
      isMobilePreview: false,
      toolbarVisibleSet: new Set(["pointer", "hand"]),
      tool: "pointer",
      timelineSurface: "lanes",
      setTimelineSurface: vi.fn(),
      loopOn: false,
      onLoopToggle: vi.fn(),
      songMetaOpen: false,
      setSongMetaOpen: vi.fn(),
      setInspectorVisible: vi.fn(),
    });

    expect(props.projectId).toBe("p1");
    expect(props.isMobilePreview).toBe(false);
    expect(props.tool).toBe("pointer");
    expect(props.loopOn).toBe(false);
    expect(props.toolbarVisibleSet.has("pointer")).toBe(true);
  });
});
