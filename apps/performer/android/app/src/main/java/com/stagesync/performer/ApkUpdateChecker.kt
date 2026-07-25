package com.stagesync.performer

import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * After connect: compare shell [versionName] with host `/api/health` and probe APK availability.
 * Never installs — only reports whether to show an explicit dialog (ADR 0015).
 */
object ApkUpdateChecker {
    private val executor = Executors.newCachedThreadPool()
    private val versionRegex = Regex("\"version\"\\s*:\\s*\"([^\"]+)\"")

    data class Offer(
        val hostVersion: String,
        val shellVersion: String,
        val apkUrl: String,
    )

    fun check(
        origin: String,
        shellVersion: String,
        apkFilename: String,
        callback: (Offer?) -> Unit,
    ) {
        executor.execute {
            callback(runCatching { checkSync(origin, shellVersion, apkFilename) }.getOrNull())
        }
    }

    internal fun checkSync(
        origin: String,
        shellVersion: String,
        apkFilename: String,
    ): Offer? {
        val base = origin.trimEnd('/')
        val hostVersion = fetchHealthVersion(base) ?: return null
        if (!SemVer.hostIsNewer(hostVersion, shellVersion)) return null
        val apkUrl = "$base/downloads/$apkFilename"
        if (!apkAvailable(apkUrl)) return null
        return Offer(hostVersion = hostVersion, shellVersion = shellVersion, apkUrl = apkUrl)
    }

    private fun fetchHealthVersion(origin: String): String? {
        val url = URL("$origin/api/health")
        val conn =
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                requestMethod = "GET"
                instanceFollowRedirects = true
            }
        try {
            if (conn.responseCode !in 200..299) return null
            val body = conn.inputStream.bufferedReader().use { it.readText() }
            return versionRegex.find(body)?.groupValues?.get(1)
        } finally {
            conn.disconnect()
        }
    }

    private fun apkAvailable(apkUrl: String): Boolean {
        val url = URL(apkUrl)
        val conn =
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                requestMethod = "HEAD"
                instanceFollowRedirects = true
            }
        try {
            val code = conn.responseCode
            if (code in 200..299) return true
            // Some stacks reject HEAD — fall back to ranged GET.
            if (code == HttpURLConnection.HTTP_BAD_METHOD || code == 405) {
                return apkAvailableGet(apkUrl)
            }
            return false
        } finally {
            conn.disconnect()
        }
    }

    private fun apkAvailableGet(apkUrl: String): Boolean {
        val url = URL(apkUrl)
        val conn =
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 3000
                readTimeout = 3000
                requestMethod = "GET"
                setRequestProperty("Range", "bytes=0-0")
                instanceFollowRedirects = true
            }
        try {
            return conn.responseCode in 200..299
        } finally {
            conn.disconnect()
        }
    }
}
