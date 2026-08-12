import { describe, it, expect, vi } from "vitest";
import { buildTimelineCanvasViewportProps } from "./buildTimelineCanvasViewportProps.js";

describe("buildTimelineCanvasViewportProps", () => {
  it("builds canvas viewport props correctly from context", () => {
    const ctx = {
      draftProject: { id: "p1", name: "Song 1" },
      projectId: "p1",
      timelineSurface: "lanes",
      touchTier: "desktop",
      isMobilePreview: false,
      tool: "pointer",
      trackVisibility: {},
      songMetaOpen: false,
      audioLaneDropId: null,
      setAudioLaneDropId: vi.fn(),
      audioUploadPending: false,
      displayTicks: 0,
      canvasScrollRef: { current: null },
      markerOverlayRef: { current: null },
      lanesCoordRef: { current: null },
      laneImportTrackIdRef: { current: null },
      laneImportStartTicksRef: { current: null },
      laneAudioFileRef: { current: null },
      draftRef: { current: null },
      rawTicksAtClientX: vi.fn(),
      derivedSelection: {},
      selection: {},
      zoomPan: {},
      gestures: {},
      canvasDerived: {},
      playback: {},
      audioState: {
        buildMasterStripCallbacks: vi.fn().mockReturnValue({}),
      },
      panelState: {},
      floatingMenus: {},
      contextMenus: {},
      modals: {},
      mapEdits: {},
      shortcuts: {},
    };

    const props = buildTimelineCanvasViewportProps(ctx);

    expect(props.projectId).toBe("p1");
    expect(props.timelineSurface).toBe("lanes");
    expect(props.touchTier).toBe("desktop");
    expect(props.isMobilePreview).toBe(false);
  });
});
