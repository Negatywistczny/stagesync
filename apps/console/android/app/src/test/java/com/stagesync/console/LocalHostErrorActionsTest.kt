package com.stagesync.console

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalHostErrorActionsTest {
    @Test
    fun idle_hidesRow() {
        val v = LocalHostErrorActions.visibility(hasError = false, hasLog = false)
        assertFalse(v.showRow)
        assertFalse(v.showClear)
        assertFalse(v.showDownload)
    }

    @Test
    fun errorWithoutLog_showsClearOnly() {
        val v = LocalHostErrorActions.visibility(hasError = true, hasLog = false)
        assertTrue(v.showRow)
        assertTrue(v.showClear)
        assertFalse(v.showDownload)
    }

    @Test
    fun errorWithLog_showsClearAndDownload() {
        val v = LocalHostErrorActions.visibility(hasError = true, hasLog = true)
        assertTrue(v.showRow)
        assertTrue(v.showClear)
        assertTrue(v.showDownload)
    }

    @Test
    fun logWithoutError_showsDownloadOnly() {
        val v = LocalHostErrorActions.visibility(hasError = false, hasLog = true)
        assertTrue(v.showRow)
        assertFalse(v.showClear)
        assertTrue(v.showDownload)
    }
}
