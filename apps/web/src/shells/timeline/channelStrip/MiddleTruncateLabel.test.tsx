/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiddleTruncateLabel } from "./MiddleTruncateLabel.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("MiddleTruncateLabel", () => {
  it("renders text and defaults title to full string", () => {
    // jsdom lacks ResizeObserver — stub so layout effect can run.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    render(<MiddleTruncateLabel text="Backing Vox 1" />);
    const el = screen.getByText("Backing Vox 1");
    expect(el.getAttribute("title")).toBe("Backing Vox 1");
  });

  it("honors an explicit title override", () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
    render(<MiddleTruncateLabel text="Short" title="Full name" />);
    expect(screen.getByText("Short").getAttribute("title")).toBe("Full name");
  });
});
