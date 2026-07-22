import { describe, expect, it } from "vitest";
import { isEditableKeyboardTarget } from "./isEditableKeyboardTarget.js";

function fake(
  tagName: string,
  isContentEditable = false,
): EventTarget {
  return { tagName, isContentEditable } as unknown as EventTarget;
}

describe("isEditableKeyboardTarget", () => {
  it("returns false for null / non-elements", () => {
    expect(isEditableKeyboardTarget(null)).toBe(false);
    expect(isEditableKeyboardTarget({} as EventTarget)).toBe(false);
  });

  it("detects INPUT TEXTAREA SELECT and contentEditable", () => {
    expect(isEditableKeyboardTarget(fake("INPUT"))).toBe(true);
    expect(isEditableKeyboardTarget(fake("TEXTAREA"))).toBe(true);
    expect(isEditableKeyboardTarget(fake("SELECT"))).toBe(true);
    expect(isEditableKeyboardTarget(fake("DIV", true))).toBe(true);
    expect(isEditableKeyboardTarget(fake("DIV"))).toBe(false);
    expect(isEditableKeyboardTarget(fake("BUTTON"))).toBe(false);
  });
});
