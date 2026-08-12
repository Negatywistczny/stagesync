// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImportProgress } from "./ImportProgress.js";

describe("ImportProgress", () => {
  it("renders label and clamps percentage in progressbar", () => {
    const { rerender } = render(
      <ImportProgress label="Pobieranie audio YouTube" value={45.6} />,
    );

    expect(screen.getByText("Pobieranie audio YouTube")).toBeTruthy();
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar.getAttribute("aria-valuenow")).toBe("46");

    rerender(<ImportProgress label="Przetwarzanie" value={150} />);
    expect(progressbar.getAttribute("aria-valuenow")).toBe("100");

    rerender(<ImportProgress label="Przetwarzanie" value={-20} />);
    expect(progressbar.getAttribute("aria-valuenow")).toBe("0");
  });
});
