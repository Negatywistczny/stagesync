package com.stagesync.console

/**
 * Visibility for local-host error / log actions (parity with desktop
 * `localErrorActions.js` / ADR 0011: no fake empty CTAs).
 *
 * Header icon = discreet log access; diagnostic download = crash path under banner.
 */
object LocalHostErrorActions {
    data class Visibility(
        val showClear: Boolean,
        val showDiagnosticDownload: Boolean,
        val headerDownloadEnabled: Boolean,
        val showRow: Boolean,
    )

    fun visibility(hasError: Boolean, hasLog: Boolean): Visibility {
        val showClear = hasError
        val showDiagnosticDownload = hasError && hasLog
        val headerDownloadEnabled = hasLog
        return Visibility(
            showClear = showClear,
            showDiagnosticDownload = showDiagnosticDownload,
            headerDownloadEnabled = headerDownloadEnabled,
            showRow = showClear || showDiagnosticDownload,
        )
    }
}
