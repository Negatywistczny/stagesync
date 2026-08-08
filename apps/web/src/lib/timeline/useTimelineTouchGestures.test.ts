import { afterEach, describe, expect, it, vi } from "vitest";

type Listener = (e: TouchEvent) => void;

function createScrollEl() {
  const listeners = new Map<string, Set<Listener>>();
  return {
    style: { touchAction: "auto" as string },
    getBoundingClientRect: () => ({
      left: 10,
      top: 0,
      width: 200,
      height: 100,
      right: 210,
      bottom: 100,
      x: 10,
      y: 0,
      toJSON: () => ({}),
    }),
    addEventListener: (type: string, fn: Listener) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Listener) => {
      listeners.get(type)?.delete(fn);
    },
    emit(
      type: string,
      event: {
        touches: Touch[];
        changedTouches?: Touch[];
      },
    ) {
      const payload = {
        preventDefault: vi.fn(),
        touches: event.touches,
        changedTouches: event.changedTouches ?? event.touches,
      } as unknown as TouchEvent;
      for (const fn of listeners.get(type) ?? []) fn(payload);
      return payload;
    },
    listenerCount(type: string) {
      return listeners.get(type)?.size ?? 0;
    },
  };
}

function touch(clientX: number, clientY: number): Touch {
  return { clientX, clientY } as Touch;
}

describe("useTimelineTouchGestures", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("react");
    vi.restoreAllMocks();
  });

  it("attaches pinch zoom and double-tap handlers when enabled", async () => {
    const cleanups: Array<() => void> = [];
    vi.doMock("react", () => ({
      useRef: <T,>(value: T) => ({ current: value }),
      useEffect: (effect: () => void | (() => void)) => {
        const cleanup = effect();
        if (typeof cleanup === "function") cleanups.push(cleanup);
      },
    }));

    const { useTimelineTouchGestures } = await import(
      "./useTimelineTouchGestures.js"
    );

    const scrollEl = createScrollEl();
    const applyZoomH = vi.fn();
    const onDoubleTap = vi.fn();
    const scrollRef = { current: scrollEl as unknown as HTMLElement };

    useTimelineTouchGestures({
      enabled: true,
      scrollRef,
      getZoomH: () => 20,
      applyZoomH,
      onDoubleTap,
      zoomMin: 10,
      zoomMax: 80,
    });

    expect(scrollEl.style.touchAction).toBe("pan-x pan-y");
    expect(scrollEl.listenerCount("touchstart")).toBe(1);

    scrollEl.emit("touchstart", {
      touches: [touch(0, 0), touch(20, 0)],
    });
    scrollEl.emit("touchmove", {
      touches: [touch(0, 0), touch(40, 0)],
    });
    expect(applyZoomH).toHaveBeenCalled();
    expect(applyZoomH.mock.calls[0]![0]).toBe(40);

    const now = Date.now();
    vi.spyOn(Date, "now").mockReturnValue(now);
    scrollEl.emit("touchstart", { touches: [touch(50, 50)] });
    scrollEl.emit("touchend", {
      touches: [],
      changedTouches: [touch(50, 50)],
    });
    vi.spyOn(Date, "now").mockReturnValue(now + 100);
    const second = scrollEl.emit("touchstart", { touches: [touch(52, 50)] });
    scrollEl.emit("touchend", {
      touches: [],
      changedTouches: [touch(52, 50)],
    });
    expect(onDoubleTap).toHaveBeenCalledOnce();
    expect(second.preventDefault).not.toHaveBeenCalled();

    for (const cleanup of cleanups) cleanup();
    expect(scrollEl.style.touchAction).toBe("auto");
    expect(scrollEl.listenerCount("touchstart")).toBe(0);
  });

  it("no-ops when disabled or scrollRef empty", async () => {
    vi.doMock("react", () => ({
      useRef: <T,>(value: T) => ({ current: value }),
      useEffect: (effect: () => void | (() => void)) => {
        effect();
      },
    }));
    const { useTimelineTouchGestures } = await import(
      "./useTimelineTouchGestures.js"
    );
    const applyZoomH = vi.fn();
    useTimelineTouchGestures({
      enabled: false,
      scrollRef: { current: null },
      getZoomH: () => 20,
      applyZoomH,
      onDoubleTap: vi.fn(),
      zoomMin: 10,
      zoomMax: 80,
    });
    expect(applyZoomH).not.toHaveBeenCalled();
  });
});
