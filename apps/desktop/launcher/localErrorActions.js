/**
 * Visibility for local-host error / log actions (ADR 0011: no fake empty CTAs).
 * Header icon stays for discreet log access; diagnostic download is crash-path only.
 * @param {{ hasError: boolean, hasLog: boolean }} state
 * @returns {{
 *   showClear: boolean,
 *   showDiagnosticDownload: boolean,
 *   headerDownloadEnabled: boolean,
 *   showRow: boolean,
 * }}
 */
export function localErrorActionsVisibility({ hasError, hasLog }) {
  const showClear = Boolean(hasError);
  const showDiagnosticDownload = Boolean(hasError && hasLog);
  const headerDownloadEnabled = Boolean(hasLog);
  return {
    showClear,
    showDiagnosticDownload,
    headerDownloadEnabled,
    showRow: showClear || showDiagnosticDownload,
  };
}
