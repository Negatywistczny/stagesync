// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimelineShellState } from "./useTimelineShellState.js";

const mockUseTransport = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useParams: () => ({ projectId: "p1" }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: "/project/p1" }),
    useBlocker: () => ({ state: "unblocked" }),
  };
});

vi.mock("@stagesync/ui", () => ({
  useContextMenu: () => ({
    openAt: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock("@lib/client/useAnnounceDevicePresence.js", () => ({
  useAnnounceDevicePresence: vi.fn(),
}));

vi.mock("@lib/shell-operator/operatorSession.js", () => ({
  markOperatorSession: vi.fn(),
}));

vi.mock("../../../transport/useTransport.js", () => ({
  useTransport: () => mockUseTransport(),
}));

describe("useTimelineShellState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockUseTransport.mockReturnValue({
      state: {
        bpm: 120,
        timeSignature: { numerator: 4, denominator: 4 },
        ppq: 960,
        playing: false,
        positionTicks: 0,
      },
      displayTicks: 0,
      wsStatus: "connected",
      commandPending: false,
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      seek: vi.fn(),
      setLoop: vi.fn(),
      setSoftClockTempoMaps: vi.fn(),
      setlistSnapshot: {
        projectIds: ["p1"],
        enabled: false,
        autoAdvanceEnabled: false,
      },
    });
  });

  it("initializes shell state with projectId, snapMode, zoom and container props", () => {
    const { result } = renderHook(() => useTimelineShellState());

    expect(result.current.projectId).toBe("p1");
    expect(result.current.rootClassName).toBeDefined();
    expect(result.current.snapMode).toBeDefined();
    expect(result.current.headerContainerProps).toBeDefined();
    expect(result.current.canvasViewportProps).toBeDefined();
    expect(result.current.dialogsContainerProps).toBeDefined();
  });
});
