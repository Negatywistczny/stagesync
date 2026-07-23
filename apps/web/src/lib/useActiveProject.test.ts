import { afterEach, describe, expect, it, vi } from "vitest";

describe("useActiveProject", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("react");
    vi.doUnmock("./libraryApi.js");
    vi.restoreAllMocks();
  });

  it("clears project when id is null", async () => {
    const fetchProject = vi.fn();
    vi.doMock("./libraryApi.js", () => ({ fetchProject }));
    vi.doMock("react", () => {
      const slots: unknown[] = [];
      let i = 0;
      return {
        useState: <T,>(init: T) => {
          const idx = i++;
          if (slots[idx] === undefined) slots[idx] = init;
          return [
            slots[idx] as T,
            (v: T | ((prev: T) => T)) => {
              slots[idx] =
                typeof v === "function"
                  ? (v as (prev: T) => T)(slots[idx] as T)
                  : v;
            },
          ] as const;
        },
        useRef: <T,>(v: T) => ({ current: v }),
        useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
        useEffect: (effect: () => void | (() => void)) => {
          effect();
        },
      };
    });

    const { useActiveProject } = await import("./useActiveProject.js");
    const result = useActiveProject(null);
    expect(result.activeProject).toBeNull();
    expect(result.loading).toBe(false);
    expect(fetchProject).not.toHaveBeenCalled();
  });

  it("loads project for a given id", async () => {
    const project = { id: "p1", name: "Demo" };
    const fetchProject = vi.fn().mockResolvedValue(project);
    vi.doMock("./libraryApi.js", () => ({ fetchProject }));

    type Slot = { value: unknown; set: (v: unknown) => void };
    const slots: Slot[] = [];
    vi.doMock("react", () => ({
      useState: <T,>(init: T) => {
        const slot: Slot = {
          value: init,
          set: (v) => {
            slot.value =
              typeof v === "function"
                ? (v as (prev: T) => T)(slot.value as T)
                : v;
          },
        };
        slots.push(slot);
        return [slot.value as T, slot.set] as const;
      },
      useRef: <T,>(v: T) => ({ current: v }),
      useCallback: <T extends (...args: never[]) => unknown>(fn: T) => fn,
      useEffect: (effect: () => void | (() => void)) => {
        void Promise.resolve().then(() => effect());
      },
    }));

    const { useActiveProject } = await import("./useActiveProject.js");
    useActiveProject("p1");
    await vi.waitFor(() => {
      expect(fetchProject).toHaveBeenCalledWith("p1");
    });
    await vi.waitFor(() => {
      const projectSlot = slots.find((s) => s.value && typeof s.value === "object");
      expect(projectSlot?.value).toEqual(project);
    });
  });
});
