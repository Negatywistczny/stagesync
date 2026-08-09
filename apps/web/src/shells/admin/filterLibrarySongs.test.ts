import { describe, expect, it } from "vitest";
import type { LibraryProjectEntry } from "@stagesync/shared";
import { filterAndSortLibrarySongs } from "./filterLibrarySongs.js";

function song(
  partial: Partial<LibraryProjectEntry> &
    Pick<LibraryProjectEntry, "id" | "name">,
): LibraryProjectEntry {
  return partial as LibraryProjectEntry;
}

describe("filterAndSortLibrarySongs", () => {
  const catalog = [
    song({ id: "t1", name: "Wzór", isTemplate: true, midiProgramId: 1 }),
    song({
      id: "a",
      name: "Zebra",
      artist: "Alpha",
      genre: "Jazz",
      midiProgramId: 20,
    }),
    song({
      id: "b",
      name: "Alpha Song",
      artist: "Beta",
      midiProgramId: 5,
    }),
  ];

  it("excludes templates and keeps library order", () => {
    expect(
      filterAndSortLibrarySongs(catalog, "", "library").map((p) => p.id),
    ).toEqual(["a", "b"]);
  });

  it("filters by name, artist, genre, and PC string", () => {
    expect(
      filterAndSortLibrarySongs(catalog, "zebra", "library").map((p) => p.id),
    ).toEqual(["a"]);
    expect(
      filterAndSortLibrarySongs(catalog, "beta", "library").map((p) => p.id),
    ).toEqual(["b"]);
    expect(
      filterAndSortLibrarySongs(catalog, "jazz", "library").map((p) => p.id),
    ).toEqual(["a"]);
    expect(
      filterAndSortLibrarySongs(catalog, "20", "library").map((p) => p.id),
    ).toEqual(["a"]);
  });

  it("sorts by title and program change", () => {
    expect(
      filterAndSortLibrarySongs(catalog, "", "title").map((p) => p.id),
    ).toEqual(["b", "a"]);
    expect(
      filterAndSortLibrarySongs(catalog, "", "pc").map((p) => p.id),
    ).toEqual(["b", "a"]);
  });

  it("returns empty when filter matches nothing", () => {
    expect(filterAndSortLibrarySongs(catalog, "brak-takiego", "title")).toEqual(
      [],
    );
  });
});
