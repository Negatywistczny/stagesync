package com.stagesync.performer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ReleaseApkUpdateCheckerTest {
    private val sample =
        """
        {
          "version": "5.2.7",
          "consoleUrl": "https://github.com/kacperczeczot/stagesync/releases/download/v5.2.7/StageSync-Console-v5.2.7.apk",
          "performerUrl": "https://github.com/kacperczeczot/stagesync/releases/download/v5.2.7/StageSync-Performer-v5.2.7.apk"
        }
        """.trimIndent()

    private val evilSample =
        """
        {
          "version": "5.2.7",
          "consoleUrl": "https://example.com/StageSync-Console-v5.2.7.apk",
          "performerUrl": "https://evil.example/malware.apk"
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
            "https://github.com/kacperczeczot/stagesync/releases/download/v5.2.7/StageSync-Performer-v5.2.7.apk",
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

    @Test
    fun parseNullWhenUrlNotOnAllowlist() {
        assertNull(
            ReleaseApkUpdateChecker.parseManifest(
                evilSample,
                ReleaseApkUpdateChecker.AppKind.PERFORMER,
                "5.2.5",
            ),
        )
    }

    @Test
    fun allowlistAcceptsGithubReleaseAndHostDownloads() {
        assertTrue(
            ApkInstaller.isAllowedApkUrl(
                "https://github.com/kacperczeczot/stagesync/releases/download/v5.2.7/StageSync-Performer-v5.2.7.apk",
            ),
        )
        // Real GitHub Releases 302 Location: UUID path, .apk only in query Disposition.
        assertTrue(
            ApkInstaller.isAllowedApkUrl(
                "https://release-assets.githubusercontent.com/github-production-release-asset/1305704415/" +
                    "3b863453-713c-4ae3-b10a-13962ae0847c" +
                    "?sp=r&response-content-disposition=attachment%3B%20filename%3DStageSync-Performer-v5.4.8.apk",
            ),
        )
        assertTrue(
            ApkInstaller.isAllowedApkUrl("http://192.168.1.10:4100/downloads/stagesync-performer.apk"),
        )
    }

    @Test
    fun allowlistRejectsForeignHosts() {
        assertFalse(ApkInstaller.isAllowedApkUrl("https://example.com/evil.apk"))
        assertFalse(
            ApkInstaller.isAllowedApkUrl(
                "https://github.com/other/repo/releases/download/v1/x.apk",
            ),
        )
    }
}
