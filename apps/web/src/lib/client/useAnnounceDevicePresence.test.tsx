/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEVICE_DISPLAY_NAME_CHANGED_EVENT,
  DEVICE_DISPLAY_NAME_STORAGE_KEY,
} from "./deviceNamePrefs.js";
import { useAnnounceDevicePresence } from "./useAnnounceDevicePresence.js";

const announcePresence = vi.fn();

vi.mock("../../transport/useTransport.js", () => ({
  useTransport: () => ({ announcePresence }),
}));

function Probe({ roles }: { roles?: readonly string[] }) {
  useAnnounceDevicePresence(roles);
  return null;
}

describe("useAnnounceDevicePresence", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    announcePresence.mockReset();
    store.clear();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("does not announce when display name is missing", () => {
    render(<Probe roles={["drums"]} />);
    expect(announcePresence).not.toHaveBeenCalled();
  });

  it("announces stored name and roles", () => {
    store.set(DEVICE_DISPLAY_NAME_STORAGE_KEY, "Pad 1");
    render(<Probe roles={["drums", "karaoke"]} />);
    expect(announcePresence).toHaveBeenCalledWith({
      displayName: "Pad 1",
      roles: ["drums", "karaoke"],
    });
  });

  it("re-announces when device name changes via event", () => {
    store.set(DEVICE_DISPLAY_NAME_STORAGE_KEY, "Old");
    render(<Probe />);
    expect(announcePresence).toHaveBeenCalledWith({
      displayName: "Old",
      roles: [],
    });
    announcePresence.mockClear();
    store.set(DEVICE_DISPLAY_NAME_STORAGE_KEY, "New Pad");
    act(() => {
      window.dispatchEvent(new Event(DEVICE_DISPLAY_NAME_CHANGED_EVENT));
    });
    expect(announcePresence).toHaveBeenCalledWith({
      displayName: "New Pad",
      roles: [],
    });
  });
});
