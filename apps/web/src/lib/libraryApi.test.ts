import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProject,
  deleteProject,
  updateProject,
} from "./libraryApi.js";

describe("libraryApi mutations", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("createProject parses CreateProjectBodySchema before fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "p1",
        name: "Demo",
        formatVersion: 1,
        updatedAt: "2026-07-19T12:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await createProject("  Demo  ");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ name: "Demo" });
  });

  it("createProject does not fetch when name is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(createProject("   ")).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updateProject parses UpdateProjectBodySchema before fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "p1",
        name: "Renamed",
        formatVersion: 1,
        updatedAt: "2026-07-19T12:00:00.000Z",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await updateProject("p1", { name: "  Renamed  " });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/projects/p1");
    expect(JSON.parse(String(init.body))).toEqual({ name: "Renamed" });
  });

  it("updateProject does not fetch when name is empty", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateProject("p1", { name: "" })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deleteProject calls DELETE", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await deleteProject("p1");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/p1", {
      method: "DELETE",
    });
  });
});
