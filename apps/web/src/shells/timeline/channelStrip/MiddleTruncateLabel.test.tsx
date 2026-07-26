/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MiddleTruncateLabel } from "./MiddleTruncateLabel.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubResizeObserver() {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
}

describe("MiddleTruncateLabel", () => {
  it("renders text and defaults title to full string", () => {
    stubResizeObserver();
    render(<MiddleTruncateLabel text="Backing Vox 1" />);
    const el = screen.getByText("Backing Vox 1");
    expect(el.getAttribute("title")).toBe("Backing Vox 1");
  });

  it("honors an explicit title override", () => {
    stubResizeObserver();
    render(<MiddleTruncateLabel text="Short" title="Full name" />);
    expect(screen.getByText("Short").getAttribute("title")).toBe("Full name");
  });

  it("forwards double-click and context-menu handlers", () => {
    stubResizeObserver();
    const onDoubleClick = vi.fn();
    const onContextMenu = vi.fn();
    render(
      <MiddleTruncateLabel
        text="Lead"
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      />,
    );
    const el = screen.getByText("Lead");
    fireEvent.doubleClick(el);
    fireEvent.contextMenu(el);
    expect(onDoubleClick).toHaveBeenCalledOnce();
    expect(onContextMenu).toHaveBeenCalledOnce();
  });
});
