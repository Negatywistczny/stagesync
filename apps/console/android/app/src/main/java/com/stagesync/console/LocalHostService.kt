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
import android.system.Os
import android.system.OsConstants
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Foreground service for Console local host.
 *
 * Runs in a **separate process** (`:host`) so a native abort inside libnode /
 * `node::Start` cannot kill the launcher UI process.
 *
 * Extract host assets → start Node via JNI → probe loopback /api/health →
 * broadcast READY (never without health). Heavy JNI / libnode work stays off
 * the main thread of the host process.
 */
class LocalHostService : Service() {
    private val bootStarted = AtomicBoolean(false)

    override fun onBind(intent: Intent?): IBinder? {
        // Binding is used by the UI process only as a death watch — no IPC API.
        Log.i(TAG, "onBind (death-watch)")
        return binder
    }

    private val binder = object : android.os.Binder() {}

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(TAG, "onStartCommand startId=$startId pid=${android.os.Process.myPid()}")
        try {
            ensureChannel()
            // Android 14+: startForeground must run promptly after
            // startForegroundService — do this before any heavy work.
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
            Log.i(TAG, "startForeground OK")
        } catch (err: Throwable) {
            Log.e(TAG, "startForeground failed", err)
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
            Log.i(TAG, "boot already in progress — keep sticky")
            return START_STICKY
        }

        Thread(
            {
                try {
                    logDeviceHints()
                    val readiness = LocalHostRuntime.probe(this)
                    Log.i(
                        TAG,
                        "probe native=${readiness.nativeLibPresent} assets=${readiness.hostAssetsPresent} " +
                            "jni=${readiness.jniBridgeLoaded} detail=${readiness.loadDetail}",
                    )
                    if (!readiness.canStart) {
                        broadcastFailed(LocalHostRuntime.missingMessage(readiness))
                        stopSelf()
                        return@Thread
                    }
                    bootHost()
                } catch (err: Throwable) {
                    Log.e(TAG, "boot failed", err)
                    broadcastFailed(
                        getString(
                            R.string.local_host_start_failed,
                            err.message ?: err.javaClass.simpleName,
                        ),
                    )
                    stopSelf()
                }
            },
            "stagesync-local-host",
        ).apply {
            isDaemon = false
            start()
        }

        return START_STICKY
    }

    private fun logDeviceHints() {
        val pageSize =
            try {
                Os.sysconf(OsConstants._SC_PAGE_SIZE)
            } catch (_: Throwable) {
                -1L
            }
        Log.i(
            TAG,
            "device sdk=${Build.VERSION.SDK_INT} abi=${Build.SUPPORTED_ABIS.joinToString()} " +
                "pageSize=$pageSize nativeDir=${applicationInfo.nativeLibraryDir}",
        )
        if (pageSize >= 16_384L) {
            Log.w(
                TAG,
                "16 KB page size — stock nodejs-mobile libnode (4 KB ELF) may abort on dlopen",
            )
        }
    }

    private fun bootHost() {
        Log.i(TAG, "extract assets…")
        val hostRoot = HostAssetExtractor.extractIfNeeded(this)
        val serverDir = File(hostRoot, "server")
        val entry = File(serverDir, "dist/index.js")
        if (!entry.isFile) {
            throw IllegalStateException("brak server/dist/index.js w assets/host")
        }
        Log.i(TAG, "assets ready root=${hostRoot.absolutePath} entry=${entry.absolutePath}")

        val dataDir = File(filesDir, "stagesync-data").apply { mkdirs() }
        val seedDir = File(hostRoot, "seed")
        val staticDir = File(hostRoot, "web")
        val nodeModules = File(serverDir, "node_modules")
        val versionName =
            try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: "0.0.0"
            } catch (_: Exception) {
                "0.0.0"
            }

        fun env(key: String, value: String) {
            Log.i(TAG, "setenv $key=${value.take(120)}")
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
        env("UV_THREADPOOL_SIZE", "2")
        env("HOME", filesDir.absolutePath)
        env("TMPDIR", cacheDir.absolutePath)
        if (nodeModules.isDirectory) {
            env("NODE_PATH", nodeModules.absolutePath)
        }
        val nativeDir = applicationInfo.nativeLibraryDir
        val existingLd = System.getenv("LD_LIBRARY_PATH")
        env(
            "LD_LIBRARY_PATH",
            if (existingLd.isNullOrBlank()) nativeDir else "$nativeDir:$existingLd",
        )

        Log.i(TAG, "chdir ${serverDir.absolutePath}")
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
        // nodejs-mobile samples use a multi-MB stack — default Kotlin threads are too small for V8.
        Thread(
            null,
            {
                nodeStarted.set(true)
                Log.i(TAG, "node::Start begin argv=[node, ${entry.absolutePath}]")
                val code =
                    LocalHostNative.startNodeWithArguments(
                        arrayOf(
                            "node",
                            entry.absolutePath,
                        ),
                    )
                Log.e(TAG, "node::Start returned code=$code")
                broadcastFailed(
                    getString(R.string.local_host_node_exited, code),
                )
                stopSelf()
            },
            "stagesync-node",
            NODE_STACK_BYTES,
        ).apply {
            isDaemon = false
            uncaughtExceptionHandler =
                Thread.UncaughtExceptionHandler { _, err ->
                    Log.e(TAG, "node thread crashed", err)
                    broadcastFailed(
                        getString(
                            R.string.local_host_start_failed,
                            err.message ?: err.javaClass.simpleName,
                        ),
                    )
                    stopSelf()
                }
            start()
        }

        val deadline = System.currentTimeMillis() + HEALTH_TIMEOUT_MS
        var lastDetail = "timeout"
        while (System.currentTimeMillis() < deadline) {
            if (probeHealth()) {
                Log.i(TAG, "health OK — broadcasting READY")
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

        Log.e(TAG, "health timeout ($lastDetail)")
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
        Log.w(TAG, "ACTION_FAILED: $message")
        sendBroadcast(
            Intent(ACTION_FAILED)
                .setPackage(packageName)
                .putExtra(EXTRA_MESSAGE, message),
        )
    }

    private fun broadcastReady(origin: String) {
        Log.i(TAG, "ACTION_READY origin=$origin")
        sendBroadcast(
            Intent(ACTION_READY)
                .setPackage(packageName)
                .putExtra(EXTRA_ORIGIN, origin)
                .putExtra(EXTRA_MESSAGE, getString(R.string.local_host_running)),
        )
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
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

        private const val TAG = "SsLocalHost"
        private const val HEALTH_TIMEOUT_MS = 90_000L
        private const val HEALTH_POLL_MS = 400L
        private const val NODE_STACK_BYTES = 8L * 1024L * 1024L

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
