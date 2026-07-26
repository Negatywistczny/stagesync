package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ApkHealthVersionParseTest {
    @Test
    fun parseHealthVersion_readsQuotedSemver() {
        assertEquals(
            "5.2.3",
            ApkUpdateChecker.parseHealthVersion("""{"ok":true,"version":"5.2.3"}"""),
        )
        assertEquals(
            "5.2.0-alpha.1",
            ApkUpdateChecker.parseHealthVersion("""{ "version" : "5.2.0-alpha.1" }"""),
        )
    }

    @Test
    fun parseHealthVersion_rejectsMissingOrGarbage() {
        assertNull(ApkUpdateChecker.parseHealthVersion(""))
        assertNull(ApkUpdateChecker.parseHealthVersion("{}"))
        assertNull(ApkUpdateChecker.parseHealthVersion("""{"version":}"""))
        assertNull(ApkUpdateChecker.parseHealthVersion("not-json"))
    }
}
