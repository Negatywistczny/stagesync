/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { applyDevSurfaceMocks } from "./applyDevSurfaceMocks.js";
import { getDevPreviewConfig } from "./devPreviewConfig.js";
import { getActiveDevSurface } from "./devSurfaceState.js";
import {
  isConsoleShell,
  isPerformerShell,
  shouldShowOperatorNav,
} from "../lib/operatorSurface.js";
import { clearOperatorSession } from "../lib/operatorSession.js";
import { isDesktopShell } from "../lib/desktopBridge.js";

function setPreviewSearch(search: string): void {
  window.history.replaceState({}, "", `/_dev/preview${search}`);
}

afterEach(() => {
  clearOperatorSession();
  applyDevSurfaceMocks({
    surface: "web",
    path: "/admin",
    session: false,
    projectId: "dev-preview",
  })();
  window.StageSyncNative = undefined;
});

describe("applyDevSurfaceMocks", () => {
  it("maps performer surface to client-only preview without operator nav", () => {
    setPreviewSearch("?surface=performer&path=%2Fadmin&session=1&projectId=dev-preview");
    const config = getDevPreviewConfig();
    expect(config).toEqual({
      surface: "performer",
      path: "/client",
      session: false,
      projectId: "dev-preview",
    });
    const cleanup = applyDevSurfaceMocks(config!);

    expect(getActiveDevSurface()).toBe("performer");
    expect(isPerformerShell()).toBe(true);
    expect(shouldShowOperatorNav("/client")).toBe(false);

    cleanup();
  });

  it("maps console surface to operator nav on admin routes", () => {
    setPreviewSearch("?surface=console&path=%2Fadmin&session=0&projectId=dev-preview");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("console");
    expect(isConsoleShell()).toBe(true);
    expect(shouldShowOperatorNav("/admin")).toBe(true);

    cleanup();
  });

  it("maps tauri surface to desktop shell without operator nav", () => {
    setPreviewSearch("?surface=tauri&path=%2Ftimeline&session=0&projectId=dev-preview");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("tauri");
    expect(isDesktopShell()).toBe(true);
    expect(shouldShowOperatorNav("/timeline/dev-preview")).toBe(false);

    cleanup();
  });

  it("maps web surface to operator nav on admin", () => {
    setPreviewSearch("?surface=web&path=%2Fadmin&session=0&projectId=dev-preview");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("web");
    expect(isPerformerShell()).toBe(false);
    expect(isConsoleShell()).toBe(false);
    expect(shouldShowOperatorNav("/admin")).toBe(true);

    cleanup();
  });
});
