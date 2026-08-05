/**
 * @vitest-environment jsdom
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEAP_WARN_BYTES,
  noteMemoryCheckpoint,
  resetMemoryPressureForTests,
} from "@lib/client/memoryPressure.js";
import { MemoryPressureBanner } from "./MemoryPressureBanner.js";

function stubHeap(used: number, limit = 4 * 1024 * 1024 * 1024) {
  Object.defineProperty(performance, "memory", {
    configurable: true,
    value: {
      usedJSHeapSize: used,
      totalJSHeapSize: used,
      jsHeapSizeLimit: limit,
    },
  });
}

beforeEach(() => {
  resetMemoryPressureForTests();
  Reflect.deleteProperty(performance, "memory");
});

afterEach(() => {
  cleanup();
  resetMemoryPressureForTests();
  Reflect.deleteProperty(performance, "memory");
  vi.restoreAllMocks();
});

describe("MemoryPressureBanner", () => {
  it("renders nothing when memory is fine", () => {
    stubHeap(100 * 1024 * 1024);
    const { container } = render(<MemoryPressureBanner />);
    expect(container.querySelector("[role='alert']")).toBeNull();
  });

  it("shows an alert with console hint when heap is high", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stubHeap(HEAP_WARN_BYTES + 1);
    render(<MemoryPressureBanner />);
    act(() => {
      noteMemoryCheckpoint("poll");
    });
    const alert = screen.getByRole("alert");
    expect(alert.textContent ?? "").toMatch(/Wysokie użycie pamięci/);
    expect(alert.textContent ?? "").toMatch(/stagesync-mem/);
  });

  it("can be dismissed", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    stubHeap(HEAP_WARN_BYTES + 1);
    render(<MemoryPressureBanner />);
    act(() => {
      noteMemoryCheckpoint("poll");
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Ukryj ostrzeżenie o pamięci" }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
