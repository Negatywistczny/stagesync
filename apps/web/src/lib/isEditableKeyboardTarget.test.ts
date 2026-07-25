import { describe, expect, it } from "vitest";
import {
  hasNonCollapsedDomTextSelection,
  isEditableKeyboardTarget,
  shouldAllowNativeTextClipboard,
} from "./isEditableKeyboardTarget.js";

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

describe("hasNonCollapsedDomTextSelection", () => {
  it("is false when selection is missing, collapsed, or empty", () => {
    expect(hasNonCollapsedDomTextSelection(() => null)).toBe(false);
    expect(
      hasNonCollapsedDomTextSelection(
        () =>
          ({
            rangeCount: 0,
            isCollapsed: true,
            toString: () => "",
          }) as unknown as Selection,
      ),
    ).toBe(false);
    expect(
      hasNonCollapsedDomTextSelection(
        () =>
          ({
            rangeCount: 1,
            isCollapsed: true,
            toString: () => "",
          }) as unknown as Selection,
      ),
    ).toBe(false);
    expect(
      hasNonCollapsedDomTextSelection(
        () =>
          ({
            rangeCount: 1,
            isCollapsed: false,
            toString: () => "",
          }) as unknown as Selection,
      ),
    ).toBe(false);
  });

  it("is true for a non-empty range", () => {
    expect(
      hasNonCollapsedDomTextSelection(
        () =>
          ({
            rangeCount: 1,
            isCollapsed: false,
            toString: () => "hello",
          }) as unknown as Selection,
      ),
    ).toBe(true);
  });
});

describe("shouldAllowNativeTextClipboard", () => {
  it("allows editable targets even without a DOM selection", () => {
    expect(
      shouldAllowNativeTextClipboard(fake("INPUT"), () => null),
    ).toBe(true);
  });

  it("allows non-editable targets when text is selected", () => {
    expect(
      shouldAllowNativeTextClipboard(fake("SPAN"), () =>
        ({
          rangeCount: 1,
          isCollapsed: false,
          toString: () => "kopiuł",
        }) as unknown as Selection,
      ),
    ).toBe(true);
  });

  it("denies non-editable targets without a selection", () => {
    expect(
      shouldAllowNativeTextClipboard(fake("DIV"), () => null),
    ).toBe(false);
  });
});
