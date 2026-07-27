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
});

describe("operatorSession", () => {
  it("marks and reads session flag", () => {
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
});
