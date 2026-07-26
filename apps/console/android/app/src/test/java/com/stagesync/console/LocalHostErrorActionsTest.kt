package com.stagesync.console

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalHostErrorActionsTest {
    @Test
    fun idle_hidesRowAndDisablesHeader() {
        val v = LocalHostErrorActions.visibility(hasError = false, hasLog = false)
        assertFalse(v.showRow)
        assertFalse(v.showClear)
        assertFalse(v.showDiagnosticDownload)
        assertFalse(v.headerDownloadEnabled)
    }

    @Test
    fun errorWithoutLog_showsClearOnly() {
        val v = LocalHostErrorActions.visibility(hasError = true, hasLog = false)
        assertTrue(v.showRow)
        assertTrue(v.showClear)
        assertFalse(v.showDiagnosticDownload)
        assertFalse(v.headerDownloadEnabled)
    }

    @Test
    fun errorWithLog_showsClearAndDiagnostic() {
        val v = LocalHostErrorActions.visibility(hasError = true, hasLog = true)
        assertTrue(v.showRow)
        assertTrue(v.showClear)
        assertTrue(v.showDiagnosticDownload)
        assertTrue(v.headerDownloadEnabled)
    }

    @Test
    fun logWithoutError_enablesHeaderOnly() {
        val v = LocalHostErrorActions.visibility(hasError = false, hasLog = true)
        assertFalse(v.showRow)
        assertFalse(v.showClear)
        assertFalse(v.showDiagnosticDownload)
        assertTrue(v.headerDownloadEnabled)
    }
}
