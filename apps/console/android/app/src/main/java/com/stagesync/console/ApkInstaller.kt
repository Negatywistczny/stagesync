package com.stagesync.console

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import java.util.concurrent.Executors

/**
 * Manual sideload only: download APK from host or GitHub Releases, then install via
 * [PackageInstaller] (user confirmation). Never silent / background update (ADR 0015).
 *
 * Hardening: URL allowlist (host `/downloads/{apk}` or StageSync GitHub release assets)
 * + package name / signing-cert verify before install (CodeQL arbitrary-apk).
 */
object ApkInstaller {
    private val executor = Executors.newSingleThreadExecutor()

    private val ALLOWED_RELEASE_HOSTS =
        setOf(
            "github.com",
            "objects.githubusercontent.com",
            "release-assets.githubusercontent.com",
        )

    private val ALLOWED_APK_FILENAMES =
        setOf("stagesync-console.apk", "stagesync-performer.apk")

    private const val MAX_REDIRECTS = 5

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

    /**
     * True when [apkUrl] is a host download (`/downloads/stagesync-*.apk`) or a HTTPS
     * GitHub release asset for `Negatywistczny/stagesync`.
     */
    internal fun isAllowedApkUrl(apkUrl: String): Boolean {
        val url =
            runCatching { URL(apkUrl.trim()) }.getOrNull() ?: return false
        val host = url.host?.lowercase() ?: return false
        val path = url.path ?: return false
        val scheme = url.protocol?.lowercase() ?: return false

        // Host path: http(s)://{origin}/downloads/{stagesync-console|performer}.apk
        val filename = path.substringAfterLast('/').lowercase()
        if (filename in ALLOWED_APK_FILENAMES &&
            path.equals("/downloads/$filename", ignoreCase = true) &&
            (scheme == "http" || scheme == "https")
        ) {
            return true
        }

        // Release path: HTTPS GitHub only
        if (scheme != "https") return false
        if (host !in ALLOWED_RELEASE_HOSTS) return false
        if (!path.lowercase().endsWith(".apk")) return false
        if (host == "github.com") {
            return path.contains("/Negatywistczny/stagesync/", ignoreCase = true)
        }
        // objects / release-assets: CDN for GitHub Releases (redirect target)
        return true
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
                    if (!isAllowedApkUrl(apkUrl)) {
                        error("Niedozwolony URL APK")
                    }
                    onProgress?.invoke("Pobieranie…")
                    val dest = File(context.cacheDir, "stagesync-update.apk")
                    downloadTo(apkUrl, dest)
                    onProgress?.invoke("Weryfikacja…")
                    verifyApkOrThrow(context, dest)
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

    /**
     * Stream [apkFile] into a [PackageInstaller] session and commit (system prompts user).
     * Avoids Intent + package-archive MIME / ACTION_INSTALL_PACKAGE sinks (CodeQL).
     */
    fun install(context: Context, apkFile: File) {
        val installer = context.packageManager.packageInstaller
        val params =
            PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
        params.setAppPackageName(context.packageName)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_REQUIRED)
        }
        val sessionId = installer.createSession(params)
        installer.openSession(sessionId).use { session ->
            session.openWrite("base.apk", 0, apkFile.length()).use { out ->
                apkFile.inputStream().use { input -> input.copyTo(out) }
                session.fsync(out)
            }
            // Explicit package — not an implicit PendingIntent (CodeQL).
            val status =
                Intent(INSTALL_STATUS_ACTION).setPackage(context.packageName)
            val flags =
                PendingIntent.FLAG_UPDATE_CURRENT or
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        PendingIntent.FLAG_MUTABLE
                    } else {
                        0
                    }
            val pi =
                PendingIntent.getBroadcast(context, sessionId, status, flags)
            session.commit(pi.intentSender)
        }
    }

    private const val INSTALL_STATUS_ACTION =
        "com.stagesync.console.APK_INSTALL_STATUS"

    /**
     * Reject APK whose package name or signing certs do not match this app.
     */
    internal fun verifyApkOrThrow(context: Context, apkFile: File) {
        val pm = context.packageManager
        val archiveFlags =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }
        val archive =
            pm.getPackageArchiveInfo(apkFile.absolutePath, archiveFlags)
                ?: error("Nieprawidłowy plik APK")
        if (archive.packageName != context.packageName) {
            error("APK ma niewłaściwy package (${archive.packageName})")
        }

        val installedFlags =
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageManager.GET_SIGNING_CERTIFICATES
            } else {
                @Suppress("DEPRECATION")
                PackageManager.GET_SIGNATURES
            }
        val installed =
            runCatching {
                pm.getPackageInfo(context.packageName, installedFlags)
            }.getOrNull() ?: return // first install edge — package name already matched

        val archiveDigests = signingCertDigests(archive)
        val installedDigests = signingCertDigests(installed)
        if (archiveDigests.isEmpty() || installedDigests.isEmpty()) {
            error("Brak certyfikatu podpisu APK")
        }
        if (archiveDigests.none { it in installedDigests }) {
            error("APK podpisany innym kluczem")
        }
    }

    @Suppress("DEPRECATION")
    private fun signingCertDigests(info: android.content.pm.PackageInfo): Set<String> {
        val digests = linkedSetOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signingInfo = info.signingInfo ?: return emptySet()
            val signers =
                if (signingInfo.hasMultipleSigners()) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo.signingCertificateHistory
                }
            for (sig in signers) {
                digests += sha256Hex(sig.toByteArray())
            }
        } else {
            val sigs = info.signatures ?: return emptySet()
            for (sig in sigs) {
                digests += sha256Hex(sig.toByteArray())
            }
        }
        return digests
    }

    private fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        return digest.joinToString("") { b -> "%02x".format(b) }
    }

    private fun downloadTo(apkUrl: String, dest: File) {
        var current = apkUrl.trim()
        var redirects = 0
        while (true) {
            if (!isAllowedApkUrl(current)) {
                error("Niedozwolony URL APK (redirect)")
            }
            val url = URL(current)
            val conn =
                (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 15_000
                    readTimeout = 120_000
                    requestMethod = "GET"
                    // Manual redirects so each hop stays on the allowlist.
                    instanceFollowRedirects = false
                }
            try {
                val code = conn.responseCode
                if (code in 300..399) {
                    val location = conn.getHeaderField("Location")
                        ?: error("Redirect bez Location")
                    redirects += 1
                    if (redirects > MAX_REDIRECTS) error("Za dużo przekierowań")
                    current =
                        if (location.startsWith("http://") || location.startsWith("https://")) {
                            location
                        } else {
                            URL(url, location).toString()
                        }
                    continue
                }
                if (code !in 200..299) {
                    error("HTTP $code")
                }
                conn.inputStream.use { input ->
                    dest.outputStream().use { output -> input.copyTo(output) }
                }
                if (dest.length() <= 0L) error("Pusty plik APK")
                return
            } finally {
                conn.disconnect()
            }
        }
    }
}
