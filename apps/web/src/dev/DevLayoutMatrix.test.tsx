import { describe, expect, it } from "vitest";
import {
  buildDevPreviewUrl,
  parseDevPreviewSearch,
  resolveDevPreviewPath,
} from "./devPreviewConfig.js";

describe("devPreviewConfig", () => {
  it("parses preview query defaults", () => {
    expect(parseDevPreviewSearch("")).toEqual({
      surface: "web",
      path: "/admin",
      session: true,
      projectId: "dev-preview",
    });
  });

  it("parses surface, path, session and projectId", () => {
    expect(
      parseDevPreviewSearch(
        "?surface=tauri&path=/client&session=0&projectId=abc-123",
      ),
    ).toEqual({
      surface: "tauri",
      path: "/client",
      session: false,
      projectId: "abc-123",
    });
  });

  it("resolves timeline path with project id", () => {
    expect(
      resolveDevPreviewPath({
        surface: "console",
        path: "/timeline",
        session: true,
        projectId: "song-1",
      }),
    ).toBe("/timeline/song-1");
  });

  it("builds preview iframe URL", () => {
    const url = buildDevPreviewUrl(
      {
        surface: "web",
        path: "/admin",
        session: true,
        projectId: "dev-preview",
      },
      "http://localhost:3000",
    );
    expect(url).toBe(
      "http://localhost:3000/_dev/preview?surface=web&path=%2Fadmin&session=1&projectId=dev-preview",
    );
  });
});
