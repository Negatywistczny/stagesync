/**
 * @vitest-environment jsdom
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi, afterEach } from "vitest";
import {
  cleanup,
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { CombinedUsUgImportForm } from "./CombinedUsUgImportForm.js";
import { searchUltrastarSongs } from "@lib/shell-operator/ultrastarImportApi.js";

vi.mock("@lib/shell-operator/ultrastarImportApi.js", () => ({
  fetchUltrastarFromServer: vi.fn(),
  searchUltrastarSongs: vi.fn(),
  fetchUltrastarAccount: vi.fn(async () => ({
    configured: false,
    user: "",
  })),
  putUltrastarAccount: vi.fn(async () => ({
    ok: true as const,
    configured: false,
    user: "",
    message: "Usunięto konto USDB z hosta.",
  })),
  testUltrastarAccount: vi.fn(async () => ({
    ok: true as const,
    message: "Połączenie z USDB OK.",
  })),
}));

vi.mock("@lib/shell-operator/ugImportApi.js", () => ({
  fetchUgTabFromServer: vi.fn(),
  searchUgTabs: vi.fn(),
}));

vi.mock("@lib/shell-operator/libraryApi.js", () => ({
  fetchProject: vi.fn(async () => ({
    id: "p1",
    name: "Test Project",
    assets: [
      {
        id: "a1",
        storageName: "test.mp3",
        originalName: "Test Song.mp3",
        kind: "audio",
        mimeType: "audio/mpeg",
        sizeBytes: 3500000,
        durationMs: 180000,
      },
    ],
  })),
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
        applyLabel="Importuj do projektu"
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
        applyLabel="Importuj do projektu"
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    expect(screen.getByText("Krok 1 z 4: Plik UltraStar (.txt)")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tekst UltraStar"), {
      target: { value: us },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    expect(
      screen.getByText("Krok 2 z 4: Tabulatura Ultimate Guitar"),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Tekst Ultimate Guitar"), {
      target: { value: ug },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    expect(screen.getByText("Krok 3 z 4: Ścieżka Audio")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Dalej bez audio" }));

    expect(
      await screen.findByText("Krok 4 z 4: Weryfikacja Siatki i Tempa"),
    ).toBeTruthy();
    expect(await screen.findByText(/Dopasowanie\s+\d+%/i)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Importuj do projektu" }),
    );

    await waitFor(() => {
      expect(onApply).toHaveBeenCalledTimes(1);
    });
    const arg = onApply.mock.calls[0]![0];
    expect(arg.bridge.ok).toBe(true);
    expect(arg.bridge.sections.map((s: { name: string }) => s.name)).toEqual([
      "Verse",
      "Chorus",
    ]);
    // Payload must carry bridged content (not an empty seed / template).
    expect(arg.bridge.formaMusic.clips.length).toBeGreaterThan(0);
    expect(arg.bridge.tekst.clips.length).toBeGreaterThan(0);
    expect(arg.bridge.akordy.clips.length).toBeGreaterThan(0);
    expect(arg.bridge.tempoMap.length).toBeGreaterThan(0);
  });

  it("renders Step 3 project audio assets list, separator, compact dropzone and YouTube inline input", async () => {
    const us = readFileSync(join(FIX, "song.txt"), "utf8");
    const ug = readFileSync(join(FIX, "chords.txt"), "utf8");

    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do projektu"
        projectId="p1"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tekst UltraStar"), {
      target: { value: us },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    fireEvent.change(screen.getByLabelText("Tekst Ultimate Guitar"), {
      target: { value: ug },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    expect(screen.getByText("Krok 3 z 4: Ścieżka Audio")).toBeTruthy();
    expect(await screen.findByText("Test Song.mp3")).toBeTruthy();
    expect(screen.getByText("Plik z dysku")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("https://www.youtube.com/watch?v=…"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Pobierz z YouTube" }),
    ).toBeTruthy();
  });

  it("displays US match percentage in Step 2 preview", async () => {
    const us = readFileSync(join(FIX, "song.txt"), "utf8");
    const ug = readFileSync(join(FIX, "chords.txt"), "utf8");

    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do projektu"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tekst UltraStar"), {
      target: { value: us },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    fireEvent.change(screen.getByLabelText("Tekst Ultimate Guitar"), {
      target: { value: ug },
    });

    expect(await screen.findByText(/Zgodność z UltraStar:/i)).toBeTruthy();
  });

  it("opens Konto USDB when search reports missing credentials", async () => {
    vi.mocked(searchUltrastarSongs).mockRejectedValueOnce(
      new Error("Brak konta USDB. Ustaw je w Import UltraStar → Konfiguracja"),
    );

    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do projektu"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tytuł USDB"), {
      target: { value: "Smoke" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Szukaj w USDB/i }));

    expect(await screen.findByTestId("ultrastar-usdb-account")).toBeTruthy();
    expect(screen.getByText(/Brak konta USDB/i)).toBeTruthy();
  });

  it("sorts UG search hits descending by alignScore", async () => {
    const us = readFileSync(join(FIX, "song.txt"), "utf8");
    const ug = readFileSync(join(FIX, "chords.txt"), "utf8");

    const { searchUgTabs, fetchUgTabFromServer } =
      await import("@lib/shell-operator/ugImportApi.js");
    const searchUgTabsMock = vi.mocked(searchUgTabs);
    const fetchUgTabFromServerMock = vi.mocked(fetchUgTabFromServer);

    searchUgTabsMock.mockResolvedValueOnce({
      results: [
        {
          id: 1,
          title: "Low Match Version",
          artist: "ABBA",
          type: "Chords",
          rating: 4,
          url: "https://ug.com/tab1",
        },
        {
          id: 2,
          title: "High Match Version",
          artist: "ABBA",
          type: "Chords",
          rating: 5,
          url: "https://ug.com/tab2",
        },
      ],
    });

    fetchUgTabFromServerMock.mockImplementation(async (url: string) => {
      if (url === "https://ug.com/tab1") {
        return {
          content: "[Verse]\nRandom unrelated text",
          metadata: { title: "Low Match Version" },
        } as any;
      }
      return { content: ug, metadata: { title: "High Match Version" } } as any;
    });

    render(
      <CombinedUsUgImportForm
        applyLabel="Importuj do projektu"
        initialTitle="The Winner Takes It All"
        initialArtist="ABBA"
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Tekst UltraStar"), {
      target: { value: us },
    });
    fireEvent.click(screen.getByRole("button", { name: "Dalej" }));

    fireEvent.click(screen.getByRole("button", { name: "Szukaj w UG" }));

    const cards = await screen.findAllByRole("button", { name: /UG:/i });
    expect(cards[0]?.textContent).toContain("High Match Version");
    expect(cards[1]?.textContent).toContain("Low Match Version");
  });
});
