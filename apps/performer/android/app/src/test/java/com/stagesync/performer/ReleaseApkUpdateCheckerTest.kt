package com.stagesync.performer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class ReleaseApkUpdateCheckerTest {
    private val sample =
        """
        {
          "version": "5.2.7",
          "consoleUrl": "https://example.com/StageSync-Console-v5.2.7.apk",
          "performerUrl": "https://example.com/StageSync-Performer-v5.2.7.apk"
        }
        """.trimIndent()

    @Test
    fun parseOffersPerformerWhenNewer() {
        val offer =
            ReleaseApkUpdateChecker.parseManifest(
                sample,
                ReleaseApkUpdateChecker.AppKind.PERFORMER,
                "5.2.5",
            )
        assertEquals("5.2.7", offer?.latestVersion)
        assertEquals(
            "https://example.com/StageSync-Performer-v5.2.7.apk",
            offer?.apkUrl,
        )
    }

    @Test
    fun parseNullWhenAlreadyCurrent() {
        assertNull(
            ReleaseApkUpdateChecker.parseManifest(
                sample,
                ReleaseApkUpdateChecker.AppKind.PERFORMER,
                "5.2.7",
            ),
        )
    }
}
