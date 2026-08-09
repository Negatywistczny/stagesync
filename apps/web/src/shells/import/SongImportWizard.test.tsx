/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { SongImportWizard } from "./SongImportWizard.js";

vi.mock("@lib/shell-operator/ultrastarImportApi.js", () => ({
  fetchUltrastarAccount: vi.fn(async () => ({ configured: false, user: "" })),
  putUltrastarAccount: vi.fn(),
  testUltrastarAccount: vi.fn(),
  searchUltrastarSongs: vi.fn(async () => ({ results: [] })),
  fetchUltrastarFromServer: vi.fn(),
}));

vi.mock("@lib/shell-operator/ugImportApi.js", () => ({
  fetchUgTabFromServer: vi.fn(),
  searchUgTabs: vi.fn(async () => ({ results: [] })),
}));

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchProject: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("SongImportWizard", () => {
  it("starts on source chips and opens US+UG form by default", () => {
    render(
      <SongImportWizard
        applyLabel="Importuj"
        onCancel={() => {}}
        onApplyUsUg={() => {}}
        onApplyUltrastar={() => {}}
        onApplyUg={() => {}}
      />,
    );
    expect(screen.getByText("Źródła importu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText("Krok 1 z 4: Plik UltraStar (.txt)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Konto USDB$/i })).toBeTruthy();
  });

  it("routes to UltraStar-only when UG chip is off", () => {
    render(
      <SongImportWizard
        applyLabel="Importuj"
        onCancel={() => {}}
        onApplyUsUg={() => {}}
        onApplyUltrastar={() => {}}
        onApplyUg={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ultimate Guitar" }));
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText(/Szukaj na USDB, wklej link/i)).toBeTruthy();
  });

  it("routes to UG-only when UltraStar chip is off", () => {
    render(
      <SongImportWizard
        applyLabel="Importuj"
        onCancel={() => {}}
        onApplyUsUg={() => {}}
        onApplyUltrastar={() => {}}
        onApplyUg={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "UltraStar / USDB" }));
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByLabelText("Tytuł do wyszukiwania UG")).toBeTruthy();
  });

  it("skips audio step in US+UG when Audio chip is off", () => {
    render(
      <SongImportWizard
        applyLabel="Importuj"
        onCancel={() => {}}
        onApplyUsUg={() => {}}
        onApplyUltrastar={() => {}}
        onApplyUg={() => {}}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Audio (Smart Tempo)" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText("Krok 1 z 3: Plik UltraStar (.txt)")).toBeTruthy();
  });
});
