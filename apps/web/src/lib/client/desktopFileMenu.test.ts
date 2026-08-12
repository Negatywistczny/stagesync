/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSongAndOpen,
  createSongWithContent,
  currentTimelineProjectId,
  downloadLibraryExport,
  importLibraryFile,
  listTemplateIds,
  saveProjectAs,
} from "./desktopFileMenu.js";
import * as libraryApi from "@lib/shell-operator/libraryApi.js";
import * as lastTimeline from "./lastTimelineProject.js";
import { createProjectSeed, createProjectV6Seed } from "@stagesync/shared";

vi.mock("@lib/shell-operator/libraryApi.js");
vi.mock("./lastTimelineProject.js");

describe("desktopFileMenu", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("currentTimelineProjectId parses timeline path", () => {
    expect(currentTimelineProjectId("/timeline/abc")).toBe("abc");
    expect(currentTimelineProjectId("/admin")).toBeNull();
    expect(currentTimelineProjectId("/timeline/")).toBeNull();
  });

  it("createSongAndOpen pushes recent project", async () => {
    vi.mocked(libraryApi.createProject).mockResolvedValue({
      id: "p1",
      name: "Song",
    } as Awaited<ReturnType<typeof libraryApi.createProject>>);
    const push = vi.spyOn(lastTimeline, "pushRecentTimelineProject");

    const out = await createSongAndOpen("Song");
    expect(out).toEqual({ id: "p1", name: "Song" });
    expect(push).toHaveBeenCalledWith("p1", "Song");
  });

  it("createSongWithContent creates, merges, puts with OCC, pushes recent", async () => {
    const shell = createProjectV6Seed(
      "new",
      "Shell",
      "2026-02-01T00:00:00.000Z",
    );
    shell.midiProgramId = 11;
    vi.mocked(libraryApi.createProject).mockResolvedValue(shell);
    vi.mocked(libraryApi.putProject).mockImplementation(async (id, body) => ({
      ...body,
      id,
    }));
    const push = vi.spyOn(lastTimeline, "pushRecentTimelineProject");

    const out = await createSongWithContent("From UG", (p) => ({
      ...p,
      name: "Renamed by import",
      defaultBpm: 90,
    }));

    expect(libraryApi.createProject).toHaveBeenCalledWith("From UG");
    expect(libraryApi.putProject).toHaveBeenCalledWith(
      "new",
      expect.objectContaining({
        name: "Renamed by import",
        defaultBpm: 90,
        updatedAt: shell.updatedAt,
        midiProgramId: 11,
      }),
    );
    expect(out.name).toBe("Renamed by import");
    expect(push).toHaveBeenCalledWith("new", "Renamed by import");
  });

  it("saveProjectAs clones with optimistic updatedAt and new midiProgramId", async () => {
    const source = createProjectSeed("src", "Old", "2026-01-01T00:00:00.000Z");
    source.midiProgramId = 7;
    const shell = createProjectSeed("new", "New", "2026-02-01T00:00:00.000Z");
    shell.midiProgramId = 9;

    vi.mocked(libraryApi.fetchProject).mockResolvedValue(source);
    vi.mocked(libraryApi.createProject).mockResolvedValue(shell);
    vi.mocked(libraryApi.putProject).mockImplementation(async (id, body) => ({
      ...body,
      id,
    }));

    const out = await saveProjectAs("src", "Renamed");
    expect(libraryApi.putProject).toHaveBeenCalledWith(
      "new",
      expect.objectContaining({
        name: "Renamed",
        updatedAt: shell.updatedAt,
        midiProgramId: 9,
      }),
    );
    expect(out).toEqual({ id: "new", name: "Renamed" });
  });

  it("saveProjectAs rejects empty name", async () => {
    vi.mocked(libraryApi.fetchProject).mockResolvedValue(
      createProjectSeed("src", "Old", "2026-01-01T00:00:00.000Z"),
    );
    await expect(saveProjectAs("src", "   ")).rejects.toThrow(/wymagana/i);
  });

  it("listTemplateIds filters isTemplate", async () => {
    vi.mocked(libraryApi.fetchLibrary).mockResolvedValue({
      version: 1,
      projects: [
        { id: "t1", name: "Tpl", isTemplate: true },
        { id: "s1", name: "Song" },
      ],
    } as Awaited<ReturnType<typeof libraryApi.fetchLibrary>>);

    expect(await listTemplateIds()).toEqual([{ id: "t1", name: "Tpl" }]);
  });

  it("importLibraryFile rejects oversize, zip, and invalid json", async () => {
    const big = new File([new Uint8Array(17 * 1024 * 1024)], "big.json");
    await expect(importLibraryFile(big)).rejects.toThrow(/za duży/i);

    const zip = new File(
      [new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])],
      "x.json",
    );
    await expect(importLibraryFile(zip)).rejects.toThrow(/ZIP/i);

    const bad = new File(["not-json"], "x.json");
    await expect(importLibraryFile(bad)).rejects.toThrow(/JSON/i);
  });

  it("importLibraryFile delegates valid pack to libraryApi", async () => {
    vi.mocked(libraryApi.importLibraryPack).mockResolvedValue({
      created: [{ id: "p1" }],
      format: "v5",
    } as unknown as Awaited<ReturnType<typeof libraryApi.importLibraryPack>>);

    const file = new File(['{"version":1,"projects":[]}'], "lib.json");
    const out = await importLibraryFile(file);
    expect(out.createdCount).toBe(1);
    expect(out.format).toBe("v5");
  });

  it("downloadLibraryExport triggers anchor download", async () => {
    const blob = new Blob(["{}"], { type: "application/json" });
    vi.mocked(libraryApi.exportLibraryPack).mockResolvedValue(blob);
    const createUrl = vi.fn().mockReturnValue("blob:mock");
    const revoke = vi.fn();
    Object.defineProperty(globalThis, "URL", {
      value: {
        createObjectURL: createUrl,
        revokeObjectURL: revoke,
      },
      configurable: true,
    });
    const click = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      click,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement);

    await downloadLibraryExport();
    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalled();
    expect(revoke).toHaveBeenCalledWith("blob:mock");
  });
});
