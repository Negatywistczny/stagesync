package com.stagesync.console

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * Foreground service for Console local host.
 *
 * Extract host assets → start Node via JNI → probe loopback /api/health →
 * broadcast READY (never without health). Heavy JNI / libnode work stays off
 * the main thread so tap-to-start cannot ANR or hard-crash the process.
 */
class LocalHostService : Service() {
    private val bootStarted = AtomicBoolean(false)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            ensureChannel()
            val notification = buildNotification(getString(R.string.local_host_starting))
            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                notification,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                } else {
                    0
                },
            )
        } catch (err: Throwable) {
            // FGS / notification failures must not kill the launcher.
            broadcastFailed(
                getString(
                    R.string.local_host_start_failed,
                    err.message ?: err.javaClass.simpleName,
                ),
            )
            stopSelf()
            return START_NOT_STICKY
        }

        if (!bootStarted.compareAndSet(false, true)) {
            // Already starting / running — keep service alive.
            return START_STICKY
        }

        thread(name = "stagesync-local-host", isDaemon = false) {
            try {
                val readiness = LocalHostRuntime.probe(this)
                if (!readiness.canStart) {
                    broadcastFailed(LocalHostRuntime.missingMessage(readiness))
                    stopSelf()
                    return@thread
                }
                bootHost()
            } catch (err: Throwable) {
                broadcastFailed(
                    getString(
                        R.string.local_host_start_failed,
                        err.message ?: err.javaClass.simpleName,
                    ),
                )
                stopSelf()
            }
        }

        return START_STICKY
    }

    private fun bootHost() {
        val hostRoot = HostAssetExtractor.extractIfNeeded(this)
        val serverDir = File(hostRoot, "server")
        val entry = File(serverDir, "dist/index.js")
        if (!entry.isFile) {
            throw IllegalStateException("brak server/dist/index.js w assets/host")
        }

        val dataDir = File(filesDir, "stagesync-data").apply { mkdirs() }
        val seedDir = File(hostRoot, "seed")
        val staticDir = File(hostRoot, "web")
        val versionName =
            try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: "0.0.0"
            } catch (_: Exception) {
                "0.0.0"
            }

        fun env(key: String, value: String) {
            if (!LocalHostNative.setEnv(key, value)) {
                val detail = LocalHostNative.lastError()
                throw IllegalStateException(
                    if (detail.isNullOrBlank()) {
                        "setenv failed: $key"
                    } else {
                        "setenv failed: $key ($detail)"
                    },
                )
            }
        }

        env("PORT", LocalHostRuntime.DEFAULT_PORT.toString())
        env("STAGESYNC_BIND_HOST", "0.0.0.0")
        env("STAGESYNC_DATA_DIR", dataDir.absolutePath)
        env("STAGESYNC_SEED_DIR", seedDir.absolutePath)
        env("STAGESYNC_STATIC_DIR", staticDir.absolutePath)
        env("STAGESYNC_SHELL", "console")
        env("STAGESYNC_VERSION", versionName)
        env("npm_package_version", versionName)
        env("NODE_ENV", "production")
        // Multicast mDNS is unreliable in some Android sandboxes; LAN discovery
        // still works when Console is reached by IP. Loopback Admin does not need it.
        env("STAGESYNC_DISABLE_MDNS", "1")
        // Android has no host MIDI ports — force none so easymidi/native cannot
        // dlopen and hard-crash the embedded Node process on start.
        env("STAGESYNC_MIDI_BACKEND", "none")
        // Cap heap for tablet RAM; default V8 can OOM mid-boot on 4 GB devices.
        env("NODE_OPTIONS", "--max-old-space-size=384")
        env("HOME", filesDir.absolutePath)
        env("TMPDIR", cacheDir.absolutePath)

        if (!LocalHostNative.chdir(serverDir.absolutePath)) {
            val detail = LocalHostNative.lastError()
            throw IllegalStateException(
                if (detail.isNullOrBlank()) {
                    "chdir failed: ${serverDir.absolutePath}"
                } else {
                    "chdir failed: ${serverDir.absolutePath} ($detail)"
                },
            )
        }

        val nodeStarted = AtomicBoolean(false)
        thread(name = "stagesync-node", isDaemon = false) {
            nodeStarted.set(true)
            // Relative entry + cwd mirrors desktop sidecar (launcher.rs).
            val code =
                LocalHostNative.startNodeWithArguments(
                    arrayOf(
                        "node",
                        "dist/index.js",
                    ),
                )
            broadcastFailed(
                getString(R.string.local_host_node_exited, code),
            )
            stopSelf()
        }

        // Wait until the Node thread has entered startNode (or health succeeds).
        val deadline = System.currentTimeMillis() + HEALTH_TIMEOUT_MS
        var lastDetail = "timeout"
        while (System.currentTimeMillis() < deadline) {
            if (probeHealth()) {
                val nm = getSystemService(NotificationManager::class.java)
                nm?.notify(
                    NOTIFICATION_ID,
                    buildNotification(getString(R.string.local_host_running)),
                )
                broadcastReady(LocalHostRuntime.LOOPBACK_ORIGIN)
                return
            }
            lastDetail = if (nodeStarted.get()) "waiting for /api/health" else "starting node"
            Thread.sleep(HEALTH_POLL_MS)
        }

        throw IllegalStateException(
            getString(R.string.local_host_health_timeout, lastDetail),
        )
    }

    private fun probeHealth(): Boolean {
        return runCatching {
            val url = URL("${LocalHostRuntime.LOOPBACK_ORIGIN}${LocalHostRuntime.HEALTH_PATH}")
            val conn =
                (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 1_500
                    readTimeout = 1_500
                    requestMethod = "GET"
                    instanceFollowRedirects = true
                }
            try {
                val code = conn.responseCode
                val body = conn.inputStream.bufferedReader().use { it.readText() }
                code in 200..299 && body.contains("\"ok\"")
            } finally {
                conn.disconnect()
            }
        }.getOrDefault(false)
    }

    private fun broadcastFailed(message: String) {
        sendBroadcast(
            Intent(ACTION_FAILED)
                .setPackage(packageName)
                .putExtra(EXTRA_MESSAGE, message),
        )
    }

    private fun broadcastReady(origin: String) {
        sendBroadcast(
            Intent(ACTION_READY)
                .setPackage(packageName)
                .putExtra(EXTRA_ORIGIN, origin)
                .putExtra(EXTRA_MESSAGE, getString(R.string.local_host_running)),
        )
    }

    override fun onDestroy() {
        try {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } catch (_: Throwable) {
            // ignore
        }
        super.onDestroy()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(NotificationManager::class.java) ?: return
        val channel =
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.local_host_channel),
                NotificationManager.IMPORTANCE_LOW,
            )
        mgr.createNotificationChannel(channel)
    }

    private fun buildNotification(text: String): Notification {
        val launch =
            PendingIntent.getActivity(
                this,
                0,
                Intent(this, LauncherActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(getString(R.string.local_host_notification_title))
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(launch)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "stagesync_local_host"
        const val NOTIFICATION_ID = 4000
        const val ACTION_FAILED = "com.stagesync.console.LOCAL_HOST_FAILED"
        const val ACTION_READY = "com.stagesync.console.LOCAL_HOST_READY"
        const val EXTRA_MESSAGE = "message"
        const val EXTRA_ORIGIN = "origin"

        private const val HEALTH_TIMEOUT_MS = 90_000L
        private const val HEALTH_POLL_MS = 400L

        fun start(context: Context) {
            val intent = Intent(context, LocalHostService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
