/* @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";

afterEach(() => {
  cleanup();
});

describe("DevLayoutMatrix", () => {
  it("renders preview iframes with fixed viewport dimensions", () => {
    render(<DevLayoutMatrix />);

    const phone = screen.getByTitle("Phone 375x667");
    const tablet = screen.getByTitle("Tablet 768x1024");
    const laptop = screen.getByTitle("Laptop 1280x800");

    expect(phone.getAttribute("width")).toBe("375");
    expect(phone.getAttribute("height")).toBe("667");
    expect(tablet.getAttribute("width")).toBe("768");
    expect(tablet.getAttribute("height")).toBe("1024");
    expect(laptop.getAttribute("width")).toBe("1280");
    expect(laptop.getAttribute("height")).toBe("800");

    expect(screen.getByText("frame: 375x667")).toBeTruthy();
    expect(screen.getByText("frame: 768x1024")).toBeTruthy();
    expect(screen.getByText("frame: 1280x800")).toBeTruthy();
  });
});
