package com.stagesync.console

/**
 * Visibility for local-host error actions (parity with desktop
 * `localErrorActions.js` / ADR 0011: no fake empty controls).
 */
object LocalHostErrorActions {
    data class Visibility(
        val showClear: Boolean,
        val showDownload: Boolean,
        val showRow: Boolean,
    )

    fun visibility(hasError: Boolean, hasLog: Boolean): Visibility {
        val showClear = hasError
        val showDownload = hasLog
        return Visibility(
            showClear = showClear,
            showDownload = showDownload,
            showRow = showClear || showDownload,
        )
    }
}
