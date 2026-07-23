import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  batchMidiProgramIds,
  createProject,
  deleteProject,
  exportLibraryPack,
  fetchLibrary,
  fetchProject,
  importLibraryPack,
  putProject,
  toPutBody,
  updateProject,
} from "./libraryApi.js";

const project = createProjectV5Seed(
  "00000000-0000-4000-8000-000000000001",
  "Demo",
  "2026-07-19T12:00:00.000Z",
);

const library = {
  version: 1 as const,
  projects: [
    {
      id: project.id,
      name: "Demo",
      updatedAt: project.updatedAt,
    },
  ],
};

function okJson(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    blob: async () => new Blob(["zip"]),
  };
}

function errRes(status: number, body?: unknown) {
  return {
    ok: false,
    status,
    json: async () => body ?? { error: `fail-${status}` },
  };
}

describe("libraryApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("fetchLibrary parses catalog and surfaces errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(library));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchLibrary()).resolves.toEqual(library);
    expect(fetchMock).toHaveBeenCalledWith("/api/library");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(500, { error: "down" })));
    await expect(fetchLibrary()).rejects.toThrow("down");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error("no json");
        },
      }),
    );
    await expect(fetchLibrary()).rejects.toThrow("HTTP 503");
  });

  it("fetchProject validates id and parses body", async () => {
    await expect(fetchProject("  ")).rejects.toThrow(
      "Brak identyfikatora projektu",
    );

    const fetchMock = vi.fn().mockResolvedValue(okJson(project));
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchProject(project.id)).resolves.toMatchObject({
      id: project.id,
      name: "Demo",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/projects/${project.id}`,
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(404, { error: "gone" })));
    await expect(fetchProject(project.id)).rejects.toThrow("gone");
  });

  it("createProject parses body options and errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(project));
    vi.stubGlobal("fetch", fetchMock);

    await createProject("  Demo  ", {
      fromTemplateId: project.id,
      isTemplate: true,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      name: "Demo",
      fromTemplateId: project.id,
      isTemplate: true,
    });

    await expect(createProject("   ")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledOnce();

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(400, { error: "bad" })));
    await expect(createProject("X")).rejects.toThrow("bad");
  });

  it("batchMidiProgramIds POSTs assignments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okJson(library));
    vi.stubGlobal("fetch", fetchMock);
    const assignments = [{ id: project.id, midiProgramId: 12 }];
    await expect(batchMidiProgramIds(assignments)).resolves.toEqual(library);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ assignments });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(422, {})));
    await expect(batchMidiProgramIds([])).rejects.toThrow("HTTP 422");
  });

  it("exportLibraryPack returns blob", async () => {
    const blob = new Blob(["pack"]);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => blob,
    });
    vi.stubGlobal("fetch", fetchMock);
    await expect(exportLibraryPack([project.id])).resolves.toBe(blob);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      projectIds: [project.id],
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(500, { error: "nope" })));
    await expect(exportLibraryPack()).rejects.toThrow("nope");
  });

  it("importLibraryPack normalizes created/format/warnings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      okJson({
        library,
        created: [project.id, 1, null],
        format: "v5",
        warnings: ["w1", 2],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(importLibraryPack({ projects: [] })).resolves.toEqual({
      library,
      created: [project.id],
      format: "v5",
      warnings: ["w1"],
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okJson({
          library,
          created: "x",
          format: 1,
          warnings: null,
        }),
      ),
    );
    await expect(importLibraryPack({})).resolves.toEqual({
      library,
      created: [],
      format: undefined,
      warnings: [],
    });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(400, { error: "bad pack" })));
    await expect(importLibraryPack({})).rejects.toThrow("bad pack");
  });

  it("putProject / toPutBody strip id and reject empty id", async () => {
    const body = toPutBody(project);
    expect(body).not.toHaveProperty("id");
    expect(body.name).toBe("Demo");

    await expect(putProject("  ", project)).rejects.toThrow(
      "Brak identyfikatora projektu",
    );

    const fetchMock = vi.fn().mockResolvedValue(okJson(project));
    vi.stubGlobal("fetch", fetchMock);
    await putProject(project.id, project);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/projects/${project.id}`);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).not.toHaveProperty("id");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(409, { error: "conflict" })));
    await expect(putProject(project.id, project)).rejects.toThrow("conflict");
  });

  it("updateProject fetches then PUTs full document", async () => {
    const renamed = { ...project, name: "Renamed" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okJson(project))
      .mockResolvedValueOnce(okJson(renamed));
    vi.stubGlobal("fetch", fetchMock);

    const result = await updateProject(project.id, { name: "  Renamed  " });
    expect(result.name).toBe("Renamed");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(updateProject("p1", { name: "" })).rejects.toThrow();
  });

  it("deleteProject DELETEs and surfaces errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    await deleteProject(project.id);
    expect(fetchMock).toHaveBeenCalledWith(`/api/projects/${project.id}`, {
      method: "DELETE",
    });

    await expect(deleteProject("  ")).rejects.toThrow(
      "Brak identyfikatora projektu",
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(errRes(403, { error: "denied" })));
    await expect(deleteProject(project.id)).rejects.toThrow("denied");
  });
});
