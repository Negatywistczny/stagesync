/**
 * @vitest-environment jsdom
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeServerControl } from "./ChangeServerControl.js";

vi.mock("@lib/client/nativeShell.js", () => ({
  canChangeServer: () => false,
  requestNativeChangeServer: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ChangeServerControl", () => {
  it("labels connect submit and validates empty URL", () => {
    render(<ChangeServerControl />);
    fireEvent.click(screen.getByRole("button", { name: "Dodaj serwer…" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Połącz z hostem StageSync" }),
    );
    expect(screen.getByRole("alert").textContent).toMatch(/Podaj adres hosta/);
  });

  it("rejects invalid host URL", () => {
    render(<ChangeServerControl />);
    fireEvent.click(screen.getByRole("button", { name: "Dodaj serwer…" }));
    fireEvent.change(screen.getByLabelText("Adres serwera StageSync"), {
      target: { value: "http://" },
    });
    fireEvent.submit(
      screen.getByLabelText("Adres serwera StageSync").closest("form")!,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/Niepoprawny adres/);
  });

  it("accepts scheme-less LAN URL into entryPath", () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      assign,
    } as Location);

    render(<ChangeServerControl entryPath="/admin" />);
    fireEvent.click(screen.getByRole("button", { name: "Dodaj serwer…" }));
    fireEvent.change(screen.getByLabelText("Adres serwera StageSync"), {
      target: { value: "192.168.1.10:4000" },
    });
    fireEvent.submit(
      screen.getByLabelText("Adres serwera StageSync").closest("form")!,
    );
    expect(assign).toHaveBeenCalledWith("http://192.168.1.10:4000/admin");
  });
});
