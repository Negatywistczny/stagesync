/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  clearOperatorSession,
  hasOperatorSession,
  markOperatorSession,
  OPERATOR_SESSION_KEY,
} from "./operatorSession.js";

afterEach(() => {
  clearOperatorSession();
  delete (globalThis as { __STAGESYNC_UI_TARGET__?: string })
    .__STAGESYNC_UI_TARGET__;
  window.StageSyncNative = undefined;
});

describe("operatorSession", () => {
  it("marks and reads session flag on web browser", () => {
    expect(hasOperatorSession()).toBe(false);
    markOperatorSession();
    expect(hasOperatorSession()).toBe(true);
    expect(sessionStorage.getItem(OPERATOR_SESSION_KEY)).toBe("1");
  });

  it("clears session flag", () => {
    markOperatorSession();
    clearOperatorSession();
    expect(hasOperatorSession()).toBe(false);
  });

  it("does not persist session on console shell", () => {
    (
      globalThis as { __STAGESYNC_UI_TARGET__?: string }
    ).__STAGESYNC_UI_TARGET__ = "console";
    markOperatorSession();
    expect(hasOperatorSession()).toBe(false);
    expect(sessionStorage.getItem(OPERATOR_SESSION_KEY)).toBeNull();
  });
});
