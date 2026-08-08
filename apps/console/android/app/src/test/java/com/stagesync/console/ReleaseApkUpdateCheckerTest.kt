package com.stagesync.console

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
          "consoleUrl": "https://github.com/Negatywistczny/stagesync/releases/download/v5.2.7/StageSync-Console-v5.2.7.apk",
          "performerUrl": "https://github.com/Negatywistczny/stagesync/releases/download/v5.2.7/StageSync-Performer-v5.2.7.apk"
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
    fun parseOffersConsoleWhenNewer() {
        val offer =
            ReleaseApkUpdateChecker.parseManifest(
                sample,
                ReleaseApkUpdateChecker.AppKind.CONSOLE,
                "5.2.5",
            )
        assertEquals("5.2.7", offer?.latestVersion)
        assertEquals(
            "https://github.com/Negatywistczny/stagesync/releases/download/v5.2.7/StageSync-Console-v5.2.7.apk",
            offer?.apkUrl,
        )
    }

    @Test
    fun parseNullWhenAlreadyCurrent() {
        assertNull(
            ReleaseApkUpdateChecker.parseManifest(
                sample,
                ReleaseApkUpdateChecker.AppKind.CONSOLE,
                "5.2.7",
            ),
        )
    }

    @Test
    fun parseNullWhenEmptyBody() {
        assertNull(
            ReleaseApkUpdateChecker.parseManifest(
                "{}",
                ReleaseApkUpdateChecker.AppKind.PERFORMER,
                "5.0.0",
            ),
        )
    }

    @Test
    fun parseNullWhenUrlNotOnAllowlist() {
        assertNull(
            ReleaseApkUpdateChecker.parseManifest(
                evilSample,
                ReleaseApkUpdateChecker.AppKind.CONSOLE,
                "5.2.5",
            ),
        )
    }

    @Test
    fun allowlistAcceptsGithubReleaseAndHostDownloads() {
        assertTrue(
            ApkInstaller.isAllowedApkUrl(
                "https://github.com/Negatywistczny/stagesync/releases/download/v5.2.7/StageSync-Console-v5.2.7.apk",
            ),
        )
        assertTrue(
            ApkInstaller.isAllowedApkUrl(
                "https://objects.githubusercontent.com/github-production-release-asset/123/StageSync-Console.apk",
            ),
        )
        // Real GitHub Releases 302 Location: UUID path, .apk only in query Disposition.
        assertTrue(
            ApkInstaller.isAllowedApkUrl(
                "https://release-assets.githubusercontent.com/github-production-release-asset/1305704415/" +
                    "1f9c2c28-ab8e-4ddd-9fa8-3f04894aa507" +
                    "?sp=r&response-content-disposition=attachment%3B%20filename%3DStageSync-Console-v5.4.8.apk",
            ),
        )
        assertTrue(
            ApkInstaller.isAllowedApkUrl("http://192.168.1.10:4100/downloads/stagesync-console.apk"),
        )
        assertTrue(
            ApkInstaller.isAllowedApkUrl("https://host.local/downloads/stagesync-performer.apk"),
        )
    }

    @Test
    fun allowlistRejectsForeignHostsAndWrongPaths() {
        assertFalse(ApkInstaller.isAllowedApkUrl("https://example.com/evil.apk"))
        assertFalse(
            ApkInstaller.isAllowedApkUrl(
                "https://github.com/other/repo/releases/download/v1/x.apk",
            ),
        )
        assertFalse(ApkInstaller.isAllowedApkUrl("http://192.168.1.10:4100/other/stagesync-console.apk"))
        assertFalse(ApkInstaller.isAllowedApkUrl("http://192.168.1.10:4100/downloads/other.apk"))
    }
}
