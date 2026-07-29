/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { applyDevSurfaceMocks } from "./applyDevSurfaceMocks.js";
import { getDevPreviewConfig } from "./devLayoutConfig.js";
import { getActiveDevSurface } from "./devSurfaceState.js";
import {
  isConsoleShell,
  isPerformerShell,
  shouldShowOperatorNav,
} from "../lib/operatorSurface.js";
import { clearOperatorSession } from "../lib/operatorSession.js";

function setPreviewSearch(search: string): void {
  window.history.replaceState({}, "", `/_dev/preview${search}`);
}

afterEach(() => {
  clearOperatorSession();
  applyDevSurfaceMocks({
    surface: "web",
    route: "admin",
    session: false,
  })();
  window.StageSyncNative = undefined;
});

describe("applyDevSurfaceMocks", () => {
  it("maps performer surface to hidden operator nav on admin", () => {
    setPreviewSearch("?surface=performer&route=admin");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("performer");
    expect(isPerformerShell()).toBe(true);
    expect(shouldShowOperatorNav("/admin")).toBe(false);

    cleanup();
  });

  it("maps console surface to operator nav on mobile admin routes", () => {
    setPreviewSearch("?surface=console&route=admin");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("console");
    expect(isConsoleShell()).toBe(true);
    expect(shouldShowOperatorNav("/admin")).toBe(true);

    cleanup();
  });

  it("maps tauri surface to desktop shell without operator nav", () => {
    setPreviewSearch("?surface=tauri&route=timeline");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("tauri");
    expect(shouldShowOperatorNav("/timeline/dev-preview")).toBe(false);
    expect((window as Window & { __STAGESYNC_TAURI_SHELL__?: boolean }).__STAGESYNC_TAURI_SHELL__).toBe(
      true,
    );

    cleanup();
  });

  it("maps web surface to operator nav on admin", () => {
    setPreviewSearch("?surface=web&route=admin");
    const cleanup = applyDevSurfaceMocks(getDevPreviewConfig()!);

    expect(getActiveDevSurface()).toBe("web");
    expect(isPerformerShell()).toBe(false);
    expect(isConsoleShell()).toBe(false);
    expect(shouldShowOperatorNav("/admin")).toBe(true);

    cleanup();
  });
});
