package com.stagesync.performer

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Manual sideload only: download APK from host, then open the system package installer.
 * Never silent / background update (ADR 0015).
 */
object ApkInstaller {
    private val executor = Executors.newSingleThreadExecutor()

    fun canInstallPackages(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun unknownSourcesSettingsIntent(context: Context): Intent {
        return Intent(
            Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
            Uri.parse("package:${context.packageName}"),
        )
    }

    fun downloadThenInstall(
        context: Context,
        apkUrl: String,
        onProgress: ((message: String) -> Unit)? = null,
        onError: (String) -> Unit,
        onReadyToInstall: (File) -> Unit,
    ) {
        executor.execute {
            val result =
                runCatching {
                    onProgress?.invoke("Pobieranie…")
                    val dest = File(context.cacheDir, "stagesync-update.apk")
                    downloadTo(apkUrl, dest)
                    dest
                }
            val file = result.getOrNull()
            if (file == null) {
                onError(result.exceptionOrNull()?.message ?: "Pobieranie nie powiodło się")
                return@execute
            }
            onReadyToInstall(file)
        }
    }

    fun installIntent(context: Context, apkFile: File): Intent {
        val uri =
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                apkFile,
            )
        return Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    private fun downloadTo(apkUrl: String, dest: File) {
        val url = URL(apkUrl)
        val conn =
            (url.openConnection() as HttpURLConnection).apply {
                connectTimeout = 15_000
                readTimeout = 120_000
                requestMethod = "GET"
                instanceFollowRedirects = true
            }
        try {
            if (conn.responseCode !in 200..299) {
                error("HTTP ${conn.responseCode}")
            }
            conn.inputStream.use { input ->
                dest.outputStream().use { output -> input.copyTo(output) }
            }
            if (dest.length() <= 0L) error("Pusty plik APK")
        } finally {
            conn.disconnect()
        }
    }
}
