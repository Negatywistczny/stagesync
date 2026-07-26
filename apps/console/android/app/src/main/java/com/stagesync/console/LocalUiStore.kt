package com.stagesync.console

import android.content.Context
import android.os.Build
import android.webkit.MimeTypeMap
import android.webkit.WebResourceResponse
import androidx.webkit.WebViewAssetLoader
import java.io.File
import java.io.FileInputStream
import java.io.InputStream
import java.util.zip.ZipInputStream

/**
 * Bundled + downloaded UI tree for Offline-First hybrid (#692).
 *
 * Priority: filesDir/ui-cache (after „Zastosuj”) → APK assets/www (build-time web dist).
 * Protocol mismatch switches to Remote Mode without deleting this cache.
 */
object LocalUiStore {
    const val ASSET_WWW = "www"
    const val CACHE_DIR = "ui-cache"

    fun cacheRoot(context: Context): File = File(context.filesDir, CACHE_DIR)

    fun hasBundledWww(context: Context): Boolean =
        try {
            context.assets.open("$ASSET_WWW/index.html").close()
            true
        } catch (_: Exception) {
            false
        }

    fun hasCache(context: Context): Boolean =
        File(cacheRoot(context), "index.html").isFile

    fun hasLocalUi(context: Context): Boolean = hasCache(context) || hasBundledWww(context)

    fun readLocalUiHash(context: Context): String? {
        readHashFile(File(cacheRoot(context), "ui-hash.json"))?.let { return it }
        return try {
            context.assets.open("$ASSET_WWW/ui-hash.json").bufferedReader().use { reader ->
                parseUiHash(reader.readText())
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun readHashFile(file: File): String? {
        if (!file.isFile) return null
        return runCatching { parseUiHash(file.readText()) }.getOrNull()
    }

    internal fun parseUiHash(json: String): String? {
        val m = Regex("\"uiHash\"\\s*:\\s*\"([^\"]+)\"").find(json) ?: return null
        return m.groupValues[1]
    }

    /** Extract host ui-bundle.zip into cache. Does not touch APK assets. */
    fun applyBundleZip(context: Context, zipFile: File) {
        val target = cacheRoot(context)
        val staging = File(context.filesDir, "$CACHE_DIR-staging")
        if (staging.exists()) staging.deleteRecursively()
        staging.mkdirs()
        ZipInputStream(FileInputStream(zipFile)).use { zis ->
            var entry = zis.nextEntry
            while (entry != null) {
                val name = entry.name.trimStart('/').replace('\\', '/')
                if (name.isEmpty() || name.contains("..")) {
                    zis.closeEntry()
                    entry = zis.nextEntry
                    continue
                }
                val out = File(staging, name)
                if (entry.isDirectory) {
                    out.mkdirs()
                } else {
                    out.parentFile?.mkdirs()
                    out.outputStream().use { zis.copyTo(it) }
                }
                zis.closeEntry()
                entry = zis.nextEntry
            }
        }
        if (!File(staging, "index.html").isFile) {
            staging.deleteRecursively()
            throw IllegalStateException("ui-bundle.zip bez index.html")
        }
        if (target.exists()) target.deleteRecursively()
        if (!staging.renameTo(target)) {
            staging.copyRecursively(target, overwrite = true)
            staging.deleteRecursively()
        }
    }

    fun pathHandler(context: Context): WebViewAssetLoader.PathHandler =
        object : WebViewAssetLoader.PathHandler {
            override fun handle(path: String): WebResourceResponse? {
                val rel = path.trimStart('/')
                if (
                    rel.startsWith("api/") ||
                    rel.startsWith("ws/") ||
                    rel.startsWith("downloads/")
                ) {
                    return null
                }
                openLocal(context, rel)?.let { return it }
                if (!rel.contains('.') || rel.endsWith('/')) {
                    return openLocal(context, "index.html")
                }
                return null
            }
        }

    private fun openLocal(context: Context, rel: String): WebResourceResponse? {
        val cacheFile = File(cacheRoot(context), rel)
        if (cacheFile.isFile) {
            return streamResponse(FileInputStream(cacheFile), mimeFor(rel))
        }
        return try {
            val stream = context.assets.open("$ASSET_WWW/$rel")
            streamResponse(stream, mimeFor(rel))
        } catch (_: Exception) {
            null
        }
    }

    private fun streamResponse(stream: InputStream, mime: String): WebResourceResponse {
        val headers =
            mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Cache-Control" to "no-store",
            )
        return if (Build.VERSION.SDK_INT >= 21) {
            WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream)
        } else {
            @Suppress("DEPRECATION")
            WebResourceResponse(mime, "UTF-8", stream)
        }
    }

    private fun mimeFor(path: String): String {
        val ext = path.substringAfterLast('.', "").lowercase()
        if (ext.isEmpty()) return "text/html"
        return MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
            ?: when (ext) {
                "js", "mjs" -> "application/javascript"
                "css" -> "text/css"
                "json", "webmanifest" -> "application/json"
                "svg" -> "image/svg+xml"
                "html", "htm" -> "text/html"
                "wasm" -> "application/wasm"
                "map" -> "application/json"
                else -> "application/octet-stream"
            }
    }
}
