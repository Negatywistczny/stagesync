/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { UltrastarImportForm } from "./UltrastarImportForm.js";

const SAMPLE = `#TITLE:Smoke
#BPM:400
#GAP:0
: 0 4 0 Hi
: 4 4 2 ya
E
`;

vi.mock("@lib/shell-operator/ultrastarImportApi.js", () => ({
  fetchUltrastarAccount: vi.fn(async () => ({
    configured: false,
    user: "",
  })),
  putUltrastarAccount: vi.fn(async (user: string) => ({
    ok: true as const,
    configured: Boolean(user.trim()),
    user: user.trim(),
    message: user.trim()
      ? "Zapisano konto USDB na hoście."
      : "Usunięto konto USDB z hosta.",
  })),
  testUltrastarAccount: vi.fn(async () => ({
    ok: true as const,
    message: "Połączenie z USDB OK — dane logowania działają.",
  })),
  searchUltrastarSongs: vi.fn(async () => ({
    results: [
      {
        id: 42,
        title: "Smoke",
        artist: "Test",
        language: "English",
        edition: null,
        rating: 4,
        url: "https://usdb.animux.de/?link=detail&id=42",
      },
    ],
  })),
  fetchUltrastarFromServer: vi.fn(async () => ({
    content: SAMPLE,
    metadata: {
      title: "Smoke",
      artist: "Test",
      language: "English",
      songId: 42,
      url: "https://usdb.animux.de/?link=detail&id=42",
    },
  })),
}));

import {
  fetchUltrastarAccount,
  fetchUltrastarFromServer,
  putUltrastarAccount,
  searchUltrastarSongs,
} from "@lib/shell-operator/ultrastarImportApi.js";

describe("UltrastarImportForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows preview and applies import from paste", async () => {
    const onApply = vi.fn();
    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    // Paste / file is visible by default
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

  it("searches USDB and fetches selected hit into preview", async () => {
    const onApply = vi.fn();
    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Tytuł do wyszukiwania UltraStar/i),
      {
        target: { value: "Smoke" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Szukaj na USDB/i }));

    await vi.waitFor(() => {
      expect(searchUltrastarSongs).toHaveBeenCalledWith("Smoke", "");
    });

    const option = await screen.findByRole("option", { name: /Smoke/i });
    fireEvent.click(option);

    await vi.waitFor(() => {
      expect(fetchUltrastarFromServer).toHaveBeenCalledWith(
        "https://usdb.animux.de/?link=detail&id=42",
      );
    });

    const preview = await screen.findByTestId("ultrastar-import-preview");
    expect(preview.textContent).toMatch(/Smoke/);
  });

  it("saves USDB account from Konto USDB panel", async () => {
    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    await vi.waitFor(() => {
      expect(fetchUltrastarAccount).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole("button", { name: /^Konto USDB$/i }));
    expect(screen.getByTestId("ultrastar-usdb-account")).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Użytkownik USDB/i), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText(/Hasło USDB/i), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Zapisz$/i }));

    await vi.waitFor(() => {
      expect(putUltrastarAccount).toHaveBeenCalledWith("alice", "secret");
    });

    expect(await screen.findByText(/Zapisano konto USDB/i)).toBeTruthy();
  });

  it("opens Konto USDB when search reports missing credentials", async () => {
    vi.mocked(searchUltrastarSongs).mockRejectedValueOnce(
      new Error(
        "Brak konta USDB. Ustaw je w Import UltraStar → Konto USDB albo w Ustawieniach serwera.",
      ),
    );

    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Tytuł do wyszukiwania UltraStar/i),
      {
        target: { value: "Smoke" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Szukaj na USDB/i }));

    expect(await screen.findByTestId("ultrastar-usdb-account")).toBeTruthy();
    expect(screen.getByText(/Brak konta USDB/i)).toBeTruthy();
  });

  it("opens Konto USDB when session renew fails", async () => {
    vi.mocked(searchUltrastarSongs).mockRejectedValueOnce(
      new Error(
        "Nie udało się odnowić sesji USDB — sprawdź dane konta (Import UltraStar → Konto USDB).",
      ),
    );

    render(
      <UltrastarImportForm
        applyLabel="Importuj"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/Tytuł do wyszukiwania UltraStar/i),
      {
        target: { value: "Smoke" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: /Szukaj na USDB/i }));

    expect(await screen.findByTestId("ultrastar-usdb-account")).toBeTruthy();
    expect(screen.getByText(/odnowić sesji USDB/i)).toBeTruthy();
  });
});
