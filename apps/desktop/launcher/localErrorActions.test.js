import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { localErrorActionsVisibility } from "./localErrorActions.js";

describe("localErrorActionsVisibility", () => {
  it("hides error row and disables header download when idle", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: false, hasLog: false }), {
      showClear: false,
      showDiagnosticDownload: false,
      headerDownloadEnabled: false,
      showRow: false,
    });
  });

  it("shows only clear when there is an error but no log", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: true, hasLog: false }), {
      showClear: true,
      showDiagnosticDownload: false,
      headerDownloadEnabled: false,
      showRow: true,
    });
  });

  it("shows clear and diagnostic download when error and log are present", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: true, hasLog: true }), {
      showClear: true,
      showDiagnosticDownload: true,
      headerDownloadEnabled: true,
      showRow: true,
    });
  });

  it("enables header download only when a log exists without an error", () => {
    assert.deepEqual(localErrorActionsVisibility({ hasError: false, hasLog: true }), {
      showClear: false,
      showDiagnosticDownload: false,
      headerDownloadEnabled: true,
      showRow: false,
    });
  });
});
