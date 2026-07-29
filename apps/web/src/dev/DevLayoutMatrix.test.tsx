/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  buildDevPreviewUrl,
  parseDevPreviewSearch,
  resolveDevPreviewPath,
} from "./devPreviewConfig.js";
import { DevLayoutMatrix } from "./DevLayoutMatrix.js";

afterEach(() => {
  cleanup();
});

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

describe("DevLayoutMatrix", () => {
  it("renders preview iframes with fixed viewport dimensions", () => {
    render(<DevLayoutMatrix />);

    const phone = screen.getByTitle("Podgląd 375×667");
    const tablet = screen.getByTitle("Podgląd 768×1024");
    const desktop = screen.getByTitle("Podgląd 1280×800");

    expect(phone.getAttribute("width")).toBe("375");
    expect(phone.getAttribute("height")).toBe("667");
    expect(tablet.getAttribute("width")).toBe("768");
    expect(tablet.getAttribute("height")).toBe("1024");
    expect(desktop.getAttribute("width")).toBe("1280");
    expect(desktop.getAttribute("height")).toBe("800");

    expect(screen.getByText("375×667")).toBeTruthy();
    expect(screen.getByText("768×1024")).toBeTruthy();
    expect(screen.getByText("1280×800")).toBeTruthy();
  });
});
