package com.stagesync.console

import android.content.Context
import java.io.File
import java.io.FileOutputStream

/**
 * Extracts packed `assets/host` into app filesDir so Node can open real paths.
 */
object HostAssetExtractor {
    private const val ASSET_ROOT = "host"
    private const val MARKER = "READY"

    fun extractIfNeeded(context: Context): File {
        val destRoot = File(context.filesDir, "host")
        val destMarker = File(destRoot, MARKER)
        val assetMarker =
            try {
                context.assets.open("$ASSET_ROOT/$MARKER").bufferedReader().use { it.readText() }
            } catch (_: Exception) {
                throw IllegalStateException("brak assets/host/READY — przebuduj APK z prepare-local-host")
            }

        if (destMarker.isFile && destMarker.readText() == assetMarker) {
            val entry = File(destRoot, "server/dist/index.js")
            if (entry.isFile) return destRoot
        }

        if (destRoot.exists()) {
            destRoot.deleteRecursively()
        }
        destRoot.mkdirs()
        copyAssetDir(context, ASSET_ROOT, destRoot)
        return destRoot
    }

    private fun copyAssetDir(context: Context, assetPath: String, destDir: File) {
        val children = context.assets.list(assetPath) ?: emptyArray()
        if (children.isEmpty()) {
            // Leaf file
            context.assets.open(assetPath).use { input ->
                FileOutputStream(destDir).use { output -> input.copyTo(output) }
            }
            return
        }
        destDir.mkdirs()
        for (child in children) {
            val childAsset = "$assetPath/$child"
            val childDest = File(destDir, child)
            val grand = context.assets.list(childAsset)
            if (grand != null && grand.isNotEmpty()) {
                copyAssetDir(context, childAsset, childDest)
            } else {
                childDest.parentFile?.mkdirs()
                context.assets.open(childAsset).use { input ->
                    FileOutputStream(childDest).use { output -> input.copyTo(output) }
                }
            }
        }
    }
}
