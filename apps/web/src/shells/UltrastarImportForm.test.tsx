/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UltrastarImportForm } from "./UltrastarImportForm.js";

const SAMPLE = `#TITLE:Smoke
#BPM:400
#GAP:0
: 0 4 0 Hi
: 4 4 2 ya
E
`;

describe("UltrastarImportForm", () => {
  it("shows preview and applies import", async () => {
    const onApply = vi.fn();
    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/#TITLE/i), {
      target: { value: SAMPLE },
    });

    const preview = await screen.findByTestId("ultrastar-import-preview");
    expect(preview.textContent).toMatch(/Smoke/);
    expect(preview.textContent).toMatch(/2 sylab/);

    fireEvent.click(screen.getByRole("button", { name: "Importuj" }));
    await vi.waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const arg = onApply.mock.calls[0]![0];
    expect(arg.ok).toBe(true);
    expect(arg.syllableCount).toBe(2);
  });
});
