/**
 * @vitest-environment jsdom
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OperatorPinFields } from "./OperatorPinFields.js";

const fetchRequired = vi.fn(async () => true);
const getStored = vi.fn(() => null as string | null);
const unlock = vi.fn(async () => undefined);
const clearStored = vi.fn();

vi.mock("@lib/shell-operator/operatorPin.js", () => ({
  fetchOperatorPinRequired: () => fetchRequired(),
  getStoredOperatorPin: () => getStored(),
  unlockOperatorPin: (pin: string) => unlock(pin),
  clearStoredOperatorPin: () => clearStored(),
}));

afterEach(() => {
  cleanup();
  fetchRequired.mockReset();
  getStored.mockReset();
  unlock.mockReset();
  clearStored.mockReset();
  fetchRequired.mockResolvedValue(true);
  getStored.mockReturnValue(null);
  unlock.mockResolvedValue(undefined);
});

describe("OperatorPinFields", () => {
  it("renders nothing when PIN is not required", async () => {
    fetchRequired.mockResolvedValueOnce(false);
    const { container } = render(<OperatorPinFields />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it("labels PIN field and unlocks then locks session", async () => {
    render(<OperatorPinFields />);
    const input = await screen.findByPlaceholderText("PIN");
    expect(input.getAttribute("aria-label")).toBe("PIN operatora");

    fireEvent.change(input, { target: { value: "1234" } });
    fireEvent.submit(input.closest("form")!);
    await waitFor(() => {
      expect(unlock).toHaveBeenCalledWith("1234");
    });
    expect(screen.getByText("Sesja odblokowana")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", { name: "Zablokuj sesję PIN operatora" }),
    );
    expect(clearStored).toHaveBeenCalled();
    expect(await screen.findByPlaceholderText("PIN")).toBeTruthy();
  });
});
