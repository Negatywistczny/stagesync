/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CombinedUsUgImportForm } from "./CombinedUsUgImportForm.js";

vi.mock("../lib/ultrastarImportApi.js", () => ({
  fetchUltrastarFromServer: vi.fn(),
  searchUltrastarSongs: vi.fn(),
}));

vi.mock("../lib/ugImportApi.js", () => ({
  fetchUgTabFromServer: vi.fn(),
  searchUgTabs: vi.fn(),
}));

const FIX = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../packages/shared/src/fixtures/us-ug/demo-simple",
);

afterEach(() => {
  cleanup();
});

describe("CombinedUsUgImportForm", () => {
  it("prefills search fields from initialTitle / initialArtist", () => {
    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do draftu"
        initialTitle="The Winner Takes It All"
        initialArtist="ABBA"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );
    expect(
      (screen.getByLabelText("Tytuł USDB") as HTMLInputElement).value,
    ).toBe("The Winner Takes It All");
    expect(
      (screen.getByLabelText("Artysta USDB") as HTMLInputElement).value,
    ).toBe("ABBA");
  });

  it("walks US → UG → preview and applies bridge", async () => {
    const us = readFileSync(join(FIX, "song.txt"), "utf8");
    const ug = readFileSync(join(FIX, "chords.txt"), "utf8");
    const onApply = vi.fn();

    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do draftu"
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tekst UltraStar"), {
      target: { value: us },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej — UG" }));

    fireEvent.change(screen.getByLabelText("Tekst Ultimate Guitar"), {
      target: { value: ug },
    });
    fireEvent.click(screen.getByRole("button", { name: "Podgląd mostka" }));

    expect(await screen.findByText(/Dopasowanie słów/i)).toBeTruthy();
    expect(
      screen.getByLabelText("Tempo siatki (sugerowane)"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Importuj do draftu" }));

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const arg = onApply.mock.calls[0]![0];
    expect(arg.ok).toBe(true);
    expect(arg.sections.map((s: { name: string }) => s.name)).toEqual([
      "Verse",
      "Chorus",
    ]);
  });
});
