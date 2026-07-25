package com.stagesync.console

import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Health gate for Offline-First UI (#692).
 * Never installs APK; never wipes local UI cache on protocol mismatch.
 */
object UiSyncChecker {
    private val executor = Executors.newCachedThreadPool()

    data class Health(
        val version: String,
        val protocolVersion: Int,
        val uiHash: String,
    )

    sealed class Gate {
        /** Stay on local intercept (or remote if no local). */
        data object Ok : Gate()

        /** Hard protocol mismatch → Remote Mode; keep local assets. */
        data class ProtocolMismatch(val host: Int, val local: Int) : Gate()

        /** Host UI differs → explicit dialog (never silent). */
        data class UiUpdateAvailable(val hostUiHash: String, val localUiHash: String) : Gate()
    }

    fun fetchHealth(origin: String): Health? {
        val url = URL("${origin.trimEnd('/')}/api/health")
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
            val version =
                Regex("\"version\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                    ?: return null
            val protocol =
                Regex("\"protocolVersion\"\\s*:\\s*(\\d+)")
                    .find(body)
                    ?.groupValues
                    ?.get(1)
                    ?.toIntOrNull() ?: return null
            val uiHash =
                Regex("\"uiHash\"\\s*:\\s*\"([^\"]+)\"").find(body)?.groupValues?.get(1)
                    ?: return null
            return Health(version = version, protocolVersion = protocol, uiHash = uiHash)
        } finally {
            conn.disconnect()
        }
    }

    fun evaluate(origin: String, localUiHash: String?): Gate {
        val health = fetchHealth(origin) ?: return Gate.Ok
        if (health.protocolVersion != ShellConfig.PROTOCOL_VERSION) {
            return Gate.ProtocolMismatch(
                host = health.protocolVersion,
                local = ShellConfig.PROTOCOL_VERSION,
            )
        }
        if (
            localUiHash != null &&
            health.uiHash.isNotBlank() &&
            health.uiHash != "none" &&
            health.uiHash != localUiHash
        ) {
            return Gate.UiUpdateAvailable(
                hostUiHash = health.uiHash,
                localUiHash = localUiHash,
            )
        }
        return Gate.Ok
    }

    fun checkAsync(origin: String, localUiHash: String?, callback: (Gate) -> Unit) {
        executor.execute {
            callback(runCatching { evaluate(origin, localUiHash) }.getOrDefault(Gate.Ok))
        }
    }

    fun downloadUiBundle(origin: String, dest: File) {
        val url = URL("${origin.trimEnd('/')}/downloads/ui-bundle.zip")
        val conn =
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 15_000
                readTimeout = 120_000
                requestMethod = "GET"
                instanceFollowRedirects = true
            }
        try {
            if (conn.responseCode !in 200..299) {
                throw IllegalStateException("HTTP ${conn.responseCode}")
            }
            dest.parentFile?.mkdirs()
            FileOutputStream(dest).use { out ->
                conn.inputStream.use { it.copyTo(out) }
            }
            if (dest.length() <= 4L) {
                dest.delete()
                throw IllegalStateException("pusta paczka UI")
            }
        } finally {
            conn.disconnect()
        }
    }

    fun downloadAndApplyAsync(
        context: android.content.Context,
        origin: String,
        onError: (String) -> Unit,
        onDone: () -> Unit,
    ) {
        executor.execute {
            try {
                val zip = File(context.cacheDir, "ui-bundle-download.zip")
                downloadUiBundle(origin, zip)
                LocalUiStore.applyBundleZip(context, zip)
                zip.delete()
                onDone()
            } catch (e: Exception) {
                onError(e.message ?: e.javaClass.simpleName)
            }
        }
    }
}
