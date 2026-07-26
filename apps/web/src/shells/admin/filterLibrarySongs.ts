import type { LibraryProjectEntry } from "@stagesync/shared";

export type LibrarySongSort = "library" | "title" | "pc";

/**
 * Catalog list (non-templates): optional text filter + title/PC sort.
 * `library` keeps catalog order.
 */
export function filterAndSortLibrarySongs(
  projects: readonly LibraryProjectEntry[],
  filter: string,
  sort: LibrarySongSort,
): LibraryProjectEntry[] {
  const songs = projects.filter((p) => p.isTemplate !== true);
  const q = filter.trim().toLowerCase();
  let list = q
    ? songs.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.artist ?? "").toLowerCase().includes(q) ||
          (p.genre ?? "").toLowerCase().includes(q) ||
          String(p.midiProgramId ?? "").includes(q),
      )
    : [...songs];
  if (sort === "title") {
    list = [...list].sort((a, b) =>
      a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
    );
  } else if (sort === "pc") {
    list = [...list].sort(
      (a, b) =>
        (a.midiProgramId ?? 0) - (b.midiProgramId ?? 0) ||
        a.name.localeCompare(b.name, "pl", { sensitivity: "base" }),
    );
  }
  return list;
}
