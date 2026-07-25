/**
 * Visibility for local-host error actions (ADR 0011: no fake / empty controls).
 * @param {{ hasError: boolean, hasLog: boolean }} state
 * @returns {{ showClear: boolean, showDownload: boolean, showRow: boolean }}
 */
export function localErrorActionsVisibility({ hasError, hasLog }) {
  const showClear = Boolean(hasError);
  const showDownload = Boolean(hasLog);
  return {
    showClear,
    showDownload,
    showRow: showClear || showDownload,
  };
}
