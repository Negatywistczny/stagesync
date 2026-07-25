import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localErrorActionsVisibility } from "./localErrorActions.js";

describe("localErrorActionsVisibility", () => {
  it("hides both controls and the row when idle", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: false, hasLog: false }), {
      showClear: false,
      showDownload: false,
      showRow: false,
    });
  });

  it("shows only clear when there is an error but no log", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: true, hasLog: false }), {
      showClear: true,
      showDownload: false,
      showRow: true,
    });
  });

  it("shows clear and download when error and log are present", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: true, hasLog: true }), {
      showClear: true,
      showDownload: true,
      showRow: true,
    });
  });

  it("shows only download when a log exists without an error", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: false, hasLog: true }), {
      showClear: false,
      showDownload: true,
      showRow: true,
    });
  });
});
