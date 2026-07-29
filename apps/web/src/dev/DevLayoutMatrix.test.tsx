/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  buildDevPreviewUrl,
  devPreviewShowsOperatorSession,
  normalizeDevPreviewConfig,
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

  it("forces performer surface to client without operator session", () => {
    expect(
      parseDevPreviewSearch(
        "?surface=performer&path=%2Fadmin&session=1&projectId=dev-preview",
      ),
    ).toEqual({
      surface: "performer",
      path: "/client",
      session: false,
      projectId: "dev-preview",
    });
  });

  it("drops session for non-web surfaces", () => {
    expect(
      parseDevPreviewSearch(
        "?surface=console&path=%2Fclient&session=1&projectId=dev-preview",
      ),
    ).toEqual({
      surface: "console",
      path: "/client",
      session: false,
      projectId: "dev-preview",
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

  it("normalizes performer preview URL to client without operator session", () => {
    const url = buildDevPreviewUrl(
      {
        surface: "performer",
        path: "/admin",
        session: true,
        projectId: "dev-preview",
      },
      "http://localhost:3000",
    );
    expect(url).toBe(
      "http://localhost:3000/_dev/preview?surface=performer&path=%2Fclient&session=0&projectId=dev-preview",
    );
  });
});

describe("devPreviewShowsOperatorSession", () => {
  it("is web-only", () => {
    expect(devPreviewShowsOperatorSession("web")).toBe(true);
    expect(devPreviewShowsOperatorSession("tauri")).toBe(false);
    expect(devPreviewShowsOperatorSession("console")).toBe(false);
    expect(devPreviewShowsOperatorSession("performer")).toBe(false);
  });
});

describe("normalizeDevPreviewConfig", () => {
  it("leaves non-performer config unchanged", () => {
    expect(
      normalizeDevPreviewConfig({
        surface: "web",
        path: "/timeline",
        session: true,
        projectId: "dev-preview",
      }),
    ).toEqual({
      surface: "web",
      path: "/timeline",
      session: true,
      projectId: "dev-preview",
    });
  });
  it("drops session for tauri surface", () => {
    expect(
      normalizeDevPreviewConfig({
        surface: "tauri",
        path: "/client",
        session: true,
        projectId: "dev-preview",
      }),
    ).toEqual({
      surface: "tauri",
      path: "/client",
      session: false,
      projectId: "dev-preview",
    });
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

  it("locks performer surface to client-only preview controls", () => {
    render(<DevLayoutMatrix />);

    fireEvent.change(screen.getByLabelText("Powierzchnia"), {
      target: { value: "performer" },
    });

    expect(screen.queryByLabelText("Trasa")).toBeNull();
    expect(screen.queryByText("Sesja operatora")).toBeNull();
    expect(
      screen.getByText(/Podgląd Performer zawsze używa/),
    ).toBeTruthy();

    const iframe = screen.getByTitle("Podgląd 375×667");
    expect(iframe.getAttribute("src")).toContain("surface=performer");
    expect(iframe.getAttribute("src")).toContain("path=%2Fclient");
    expect(iframe.getAttribute("src")).toContain("session=0");
  });

  it("hides operator session toggle for non-web surfaces", () => {
    render(<DevLayoutMatrix />);

    fireEvent.change(screen.getByLabelText("Powierzchnia"), {
      target: { value: "tauri" },
    });

    expect(screen.queryByText("Sesja operatora")).toBeNull();

    const iframe = screen.getByTitle("Podgląd 375×667");
    expect(iframe.getAttribute("src")).toContain("surface=tauri");
    expect(iframe.getAttribute("src")).toContain("session=0");
  });
});
