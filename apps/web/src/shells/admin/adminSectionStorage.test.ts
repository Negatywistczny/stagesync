// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  errMessage,
  readStoredAdminSection,
  ADMIN_LAST_SECTION_KEY,
} from "./adminSectionStorage.js";

describe("adminSectionStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("errMessage extracts message from Error or returns default", () => {
    expect(errMessage(new Error("Custom error"))).toBe("Custom error");
    expect(errMessage("string error")).toBe("Operacja nie powiodła się");
    expect(errMessage(null)).toBe("Operacja nie powiodła się");
  });

  it("readStoredAdminSection returns stored valid section or default songs", () => {
    expect(readStoredAdminSection()).toBe("songs");

    localStorage.setItem(ADMIN_LAST_SECTION_KEY, "set");
    expect(readStoredAdminSection()).toBe("set");

    localStorage.setItem(ADMIN_LAST_SECTION_KEY, "invalid_section");
    expect(readStoredAdminSection()).toBe("songs");
  });
});
