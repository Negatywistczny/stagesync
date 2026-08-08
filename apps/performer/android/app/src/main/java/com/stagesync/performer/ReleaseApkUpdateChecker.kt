package com.stagesync.performer

import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Cold-start / online check: compare shell [versionName] with GitHub Releases
 * `android-latest.json` (same channel as Desktop `latest.json`). Explicit dialog only
 * (ADR 0015) — never silent install.
 */
object ReleaseApkUpdateChecker {
    private val executor = Executors.newCachedThreadPool()

    const val MANIFEST_URL =
        "https://github.com/Negatywistczny/stagesync/releases/latest/download/android-latest.json"

    private val versionRegex = Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")
    private val consoleUrlRegex = Regex("\"consoleUrl\"\\s*:\\s*\"([^\"]+)\"")
    private val performerUrlRegex = Regex("\"performerUrl\"\\s*:\\s*\"([^\"]+)\"")

    enum class AppKind {
        CONSOLE,
        PERFORMER,
    }

    data class Offer(
        val latestVersion: String,
        val shellVersion: String,
        val apkUrl: String,
    )

    fun check(
        shellVersion: String,
        kind: AppKind,
        callback: (Offer?) -> Unit,
    ) {
        executor.execute {
            callback(runCatching { checkSync(shellVersion, kind) }.getOrNull())
        }
    }

    internal fun checkSync(
        shellVersion: String,
        kind: AppKind,
        fetchBody: () -> String? = { fetchManifest() },
    ): Offer? {
        val body = fetchBody() ?: return null
        return parseManifest(body, kind, shellVersion)
    }

    /** Parse `android-latest.json` body; null when no newer APK URL. */
    internal fun parseManifest(
        body: String,
        kind: AppKind,
        shellVersion: String,
    ): Offer? {
        val latest = versionRegex.find(body)?.groupValues?.get(1)?.trim().orEmpty()
        if (latest.isEmpty()) return null
        if (!SemVer.hostIsNewer(latest, shellVersion)) return null
        val url =
            when (kind) {
                AppKind.CONSOLE -> consoleUrlRegex.find(body)?.groupValues?.get(1)
                AppKind.PERFORMER -> performerUrlRegex.find(body)?.groupValues?.get(1)
            }?.trim().orEmpty()
        if (url.isEmpty()) return null
        // Reject non-GitHub / non-StageSync release assets (CodeQL arbitrary-apk).
        if (!ApkInstaller.isAllowedApkUrl(url)) return null
        return Offer(latestVersion = latest, shellVersion = shellVersion.trim(), apkUrl = url)
    }

    private fun fetchManifest(): String? {
        val conn =
            (URL(MANIFEST_URL).openConnection() as HttpURLConnection).apply {
                connectTimeout = 8_000
                readTimeout = 8_000
                requestMethod = "GET"
                instanceFollowRedirects = true
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "StageSync-Android-UpdateCheck")
            }
        try {
            if (conn.responseCode !in 200..299) return null
            return conn.inputStream.bufferedReader().use { it.readText() }
        } finally {
            conn.disconnect()
        }
    }
}
