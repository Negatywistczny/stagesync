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
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
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

    /** Origin published after health-ok; used to re-assert READY on a duplicate start. */
    @Volatile
    private var publishedOrigin: String? = null

    /** Android NSD advertise (`_stagesync._tcp`) — Node bonjour stays disabled. */
    @Volatile
    private var nsdAdvertiser: LocalHostNsdAdvertiser? = null

    @Volatile
    private var advertisedVersion: String? = null

    override fun onBind(intent: Intent?): IBinder? {
        // Binding is used by the UI process only as a death watch — no IPC API.
        Log.i(TAG, "onBind (death-watch)")
        return binder
    }

    private val binder = object : android.os.Binder() {}

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.i(
            TAG,
            "onStartCommand action=${intent?.action} startId=$startId pid=${android.os.Process.myPid()}",
        )
        if (intent?.action == ACTION_STOP) {
            stopHostCleanly()
            return START_NOT_STICKY
        }

        // Already booted / booting: keep FG sticky. Launcher may have cleared the
        // status file before a duplicate start — re-assert READY when health is up
        // so the UI never hangs forever on „Uruchamianie…”.
        if (bootStarted.get()) {
            try {
                ensureChannel()
                ServiceCompat.startForeground(
                    this,
                    NOTIFICATION_ID,
                    buildNotification(getString(R.string.local_host_running)),
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                    } else {
                        0
                    },
                )
            } catch (err: Throwable) {
                Log.e(TAG, "startForeground (re-entry) failed", err)
            }
            Thread(
                {
                    if (probeHealth()) {
                        val origin = publishedOrigin ?: LocalHostRuntime.LOOPBACK_ORIGIN
                        Log.i(TAG, "re-entry — health OK, re-broadcasting READY origin=$origin")
                        startNsdAdvertise()
                        broadcastReady(origin)
                    } else {
                        Log.w(TAG, "re-entry — health not OK yet (boot may still be in flight)")
                    }
                },
                "stagesync-local-host-reassert",
            ).start()
            return START_STICKY
        }

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
            // Lost the race with another onStartCommand — re-assert off the main thread.
            Log.i(TAG, "boot race — treating as re-entry")
            Thread(
                {
                    if (probeHealth()) {
                        startNsdAdvertise()
                        broadcastReady(publishedOrigin ?: LocalHostRuntime.LOOPBACK_ORIGIN)
                    }
                },
                "stagesync-local-host-reassert-race",
            ).start()
            return START_STICKY
        }

        Thread(
            {
                try {
                    HostProcessLog.clear(this)
                    LocalHostStatus.clear(this)
                    HostProcessLog.writePhase(this, "probe")
                    logDeviceHints()
                    val readiness = LocalHostRuntime.probe(this)
                    Log.i(
                        TAG,
                        "probe native=${readiness.nativeLibPresent} assets=${readiness.hostAssetsPresent} " +
                            "jni=${readiness.jniBridgeLoaded} detail=${readiness.loadDetail}",
                    )
                    if (!readiness.canStart) {
                        HostProcessLog.writePhase(this, "probe-failed")
                        val base = LocalHostRuntime.missingMessage(readiness, this)
                        Log.e(TAG, HostProcessLog.appendDiagnostics(this, base))
                        broadcastFailed(base)
                        stopSelf()
                        return@Thread
                    }
                    HostProcessLog.writePhase(this, "probe-ok")
                    bootHost()
                } catch (err: Throwable) {
                    Log.e(TAG, "boot failed", err)
                    HostProcessLog.writePhase(this@LocalHostService, "boot-failed")
                    val base =
                        getString(
                            R.string.local_host_start_failed,
                            err.message ?: err.javaClass.simpleName,
                        )
                    Log.e(TAG, HostProcessLog.appendDiagnostics(this@LocalHostService, base))
                    broadcastFailed(base)
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
        val pageSize = LocalHostRuntime.devicePageSize()
        val libAlign = LocalHostRuntime.libnodePtLoadAlign(this)
        Log.i(
            TAG,
            "device sdk=${Build.VERSION.SDK_INT} abi=${Build.SUPPORTED_ABIS.joinToString()} " +
                "pageSize=$pageSize libnodePtLoadAlign=$libAlign " +
                "nativeDir=${applicationInfo.nativeLibraryDir}",
        )
        if (LocalHostRuntime.isPageAlignMismatch(this)) {
            Log.e(
                TAG,
                "PAGE_ALIGN_MISMATCH: kernel pageSize=$pageSize but libnode.so PT_LOAD " +
                    "align=$libAlign (<16384) — dlopen will abort on this device. " +
                    "Rebuild with digidem 16 KB nodejs-mobile zip (prepare-local-host default).",
            )
        } else if (pageSize >= ElfLoadAlign.ALIGN_16K) {
            Log.i(TAG, "16 KB page size with libnode align=$libAlign (OK or unknown)")
        }
    }

    private fun bootHost() {
        HostProcessLog.writePhase(this, "extract")
        Log.i(TAG, "extract assets…")
        val hostRoot = HostAssetExtractor.extractIfNeeded(this)
        val serverDir = File(hostRoot, "server")
        val bootEntry = File(serverDir, "android-boot.mjs")
        val distEntry = File(serverDir, "dist/index.js")
        val entry =
            when {
                bootEntry.isFile -> bootEntry
                distEntry.isFile -> distEntry
                else -> throw IllegalStateException("brak server/android-boot.mjs ani dist/index.js")
            }
        HostProcessLog.writePhase(this, "assets-ready entry=${entry.name}")
        Log.i(TAG, "assets ready root=${hostRoot.absolutePath} entry=${entry.absolutePath}")

        val dataDir = File(filesDir, "stagesync-data").apply { mkdirs() }
        val seedDir = File(hostRoot, "seed")
        val staticDir = File(hostRoot, "web")
        val nodeModules = File(serverDir, "node_modules")
        val versionName = packageVersionName()
        advertisedVersion = versionName

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

        HostProcessLog.writePhase(this, "setenv")
        env("PORT", LocalHostRuntime.DEFAULT_PORT.toString())
        env("STAGESYNC_BIND_HOST", "0.0.0.0")
        env("STAGESYNC_DATA_DIR", dataDir.absolutePath)
        env("STAGESYNC_SEED_DIR", seedDir.absolutePath)
        env("STAGESYNC_STATIC_DIR", staticDir.absolutePath)
        env("STAGESYNC_SHELL", "console")
        env("STAGESYNC_VERSION", versionName)
        env("npm_package_version", versionName)
        env("NODE_ENV", "production")
        // Node bonjour-service is unreliable under nodejs-mobile (multicast /
        // sandbox). Keep it off; LocalHostNsdAdvertiser registers `_stagesync._tcp`
        // via Android NsdManager once health is OK (same type launchers browse).
        env("STAGESYNC_DISABLE_MDNS", "1")
        env("STAGESYNC_MDNS_PLATFORM", "1")
        val deviceHost = LocalHostNsdAdvertiser.resolveDeviceHostname(this)
        env("HOSTNAME", deviceHost)
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

        HostProcessLog.writePhase(this, "chdir")
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

        val logPath = HostProcessLog.logFile(this).absolutePath
        HostProcessLog.writePhase(this, "redirect-stdio")
        if (!LocalHostNative.redirectStdio(logPath)) {
            val detail = LocalHostNative.lastError()
            Log.w(TAG, "redirectStdio failed ($detail) — continuing without file log")
            HostProcessLog.writePhase(this, "redirect-stdio-failed")
        }

        val nodeStarted = AtomicBoolean(false)
        // nodejs-mobile samples use a multi-MB stack — default Kotlin threads are too small for V8.
        Thread(
            null,
            {
                nodeStarted.set(true)
                HostProcessLog.writePhase(this@LocalHostService, "node-start")
                Log.i(TAG, "node::Start begin argv=[node, ${entry.absolutePath}]")
                val code =
                    LocalHostNative.startNodeWithArguments(
                        arrayOf(
                            "node",
                            entry.absolutePath,
                        ),
                    )
                Log.e(TAG, "node::Start returned code=$code")
                HostProcessLog.writePhase(this@LocalHostService, "node-exit code=$code")
                val base = getString(R.string.local_host_node_exited, code)
                Log.e(TAG, HostProcessLog.appendDiagnostics(this@LocalHostService, base))
                broadcastFailed(base)
                stopSelf()
            },
            "stagesync-node",
            NODE_STACK_BYTES,
        ).apply {
            isDaemon = false
            uncaughtExceptionHandler =
                Thread.UncaughtExceptionHandler { _, err ->
                    Log.e(TAG, "node thread crashed", err)
                    HostProcessLog.writePhase(this@LocalHostService, "node-thread-crash")
                    val base =
                        getString(
                            R.string.local_host_start_failed,
                            err.message ?: err.javaClass.simpleName,
                        )
                    Log.e(TAG, HostProcessLog.appendDiagnostics(this@LocalHostService, base))
                    broadcastFailed(base)
                    stopSelf()
                }
            start()
        }

        val deadline = System.currentTimeMillis() + HEALTH_TIMEOUT_MS
        var lastDetail = "timeout"
        while (System.currentTimeMillis() < deadline) {
            if (probeHealth()) {
                Log.i(TAG, "health OK — broadcasting READY")
                HostProcessLog.writePhase(this, "health-ok")
                val nm = getSystemService(NotificationManager::class.java)
                nm?.notify(
                    NOTIFICATION_ID,
                    buildNotification(getString(R.string.local_host_running)),
                )
                startNsdAdvertise()
                broadcastReady(LocalHostRuntime.LOOPBACK_ORIGIN)
                return
            }
            lastDetail = if (nodeStarted.get()) "waiting for /api/health" else "starting node"
            Thread.sleep(HEALTH_POLL_MS)
        }

        Log.e(TAG, "health timeout ($lastDetail)")
        HostProcessLog.writePhase(this, "health-timeout")
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

    private fun packageVersionName(): String =
        try {
            packageManager.getPackageInfo(packageName, 0).versionName ?: "0.0.0"
        } catch (_: Exception) {
            "0.0.0"
        }

    private fun startNsdAdvertise() {
        val version = advertisedVersion ?: packageVersionName().also { advertisedVersion = it }
        val advertiser =
            nsdAdvertiser ?: LocalHostNsdAdvertiser(this).also { nsdAdvertiser = it }
        advertiser.start(
            port = LocalHostRuntime.DEFAULT_PORT,
            version = version,
        )
    }

    private fun stopNsdAdvertise() {
        nsdAdvertiser?.stop()
        nsdAdvertiser = null
    }

    private fun broadcastFailed(message: String) {
        Log.w(TAG, "ACTION_FAILED: $message")
        stopNsdAdvertise()
        // File first: UI process polls this when cross-process broadcast is dropped.
        LocalHostStatus.writeFailed(this, message)
        sendBroadcast(
            Intent(ACTION_FAILED)
                .setPackage(packageName)
                .putExtra(EXTRA_MESSAGE, message),
        )
    }

    private fun broadcastReady(origin: String) {
        Log.i(TAG, "ACTION_READY origin=$origin")
        publishedOrigin = origin
        // File first: UI process polls this when cross-process broadcast is dropped.
        LocalHostStatus.writeReady(this, origin)
        sendBroadcast(
            Intent(ACTION_READY)
                .setPackage(packageName)
                .putExtra(EXTRA_ORIGIN, origin)
                .putExtra(EXTRA_MESSAGE, getString(R.string.local_host_running)),
        )
    }

    override fun onDestroy() {
        Log.i(TAG, "onDestroy")
        stopNsdAdvertise()
        try {
            stopForeground(Service.STOP_FOREGROUND_REMOVE)
        } catch (_: Throwable) {
            // ignore
        }
        super.onDestroy()
    }

    /**
     * Stop from notification **Zatrzymaj Host**: tear down advertise / status,
     * notify UI, then remove the ongoing FGS notification and exit `:host`.
     * Embedded `node::Start` has no stop JNI — killing this process frees the
     * port without taking down the launcher UI process.
     */
    private fun stopHostCleanly() {
        Log.i(TAG, "ACTION_STOP — shutting down local host")
        stopNsdAdvertise()
        publishedOrigin = null
        LocalHostStatus.clear(this)
        sendBroadcast(
            Intent(ACTION_STOPPED)
                .setPackage(packageName)
                .putExtra(EXTRA_MESSAGE, getString(R.string.local_host_stopped)),
        )
        stopSelf()
        // Remove ongoing notification only after shutdown broadcast — swipe
        // dismiss is blocked while FGS is active; this is the sole clear path.
        try {
            stopForeground(Service.STOP_FOREGROUND_REMOVE)
        } catch (_: Throwable) {
            // ignore
        }
        // Do not sleep on the main thread — give the UI process a moment to
        // receive ACTION_STOPPED, then exit so embedded Node frees the port.
        Thread(
            {
                try {
                    Thread.sleep(STOP_BROADCAST_GRACE_MS)
                } catch (_: InterruptedException) {
                    // ignore
                }
                android.os.Process.killProcess(android.os.Process.myPid())
            },
            "stagesync-host-stop",
        ).start()
    }

    private fun ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = getSystemService(NotificationManager::class.java) ?: return
        val channel =
            NotificationChannel(
                CHANNEL_ID,
                getString(R.string.local_host_channel),
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = getString(R.string.local_host_channel)
                setShowBadge(false)
            }
        mgr.createNotificationChannel(channel)
    }

    private fun openAppPendingIntent(): PendingIntent {
        val launch =
            Intent(this, LauncherActivity::class.java).apply {
                action = Intent.ACTION_MAIN
                addCategory(Intent.CATEGORY_LAUNCHER)
                flags =
                    Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
            }
        return PendingIntent.getActivity(
            this,
            REQUEST_OPEN,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun stopHostPendingIntent(): PendingIntent {
        val stop =
            Intent(this, LocalHostService::class.java).apply {
                action = ACTION_STOP
            }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        // Prefer getForegroundService so the stop action reliably reaches the FGS.
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(this, REQUEST_STOP, stop, flags)
        } else {
            PendingIntent.getService(this, REQUEST_STOP, stop, flags)
        }
    }

    /**
     * Persistent FGS notification — must not be swipe-dismissible while the host
     * runs (otherwise OEMs may stop the `:host` process). Cleared only via
     * [stopHostCleanly] → [stopForeground](STOP_FOREGROUND_REMOVE).
     */
    private fun buildNotification(text: String): Notification {
        val openApp = openAppPendingIntent()
        val stopTitle =
            SpannableString(getString(R.string.local_host_action_stop)).apply {
                setSpan(
                    ForegroundColorSpan(ContextCompat.getColor(this@LocalHostService, R.color.ss_danger)),
                    0,
                    length,
                    Spanned.SPAN_EXCLUSIVE_EXCLUSIVE,
                )
            }
        val stopAction =
            NotificationCompat.Action.Builder(
                0,
                stopTitle,
                stopHostPendingIntent(),
            ).setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_DELETE)
                .build()
        val notification =
            NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.local_host_notification_title))
                .setContentText(text)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(openApp)
                .setOngoing(true)
                .setAutoCancel(false)
                .setOnlyAlertOnce(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .addAction(
                    0,
                    getString(R.string.local_host_action_open),
                    openApp,
                )
                .addAction(stopAction)
                .build()
        // Belt-and-suspenders: some OEM skins ignore setOngoing alone.
        notification.flags = notification.flags or
            Notification.FLAG_ONGOING_EVENT or
            Notification.FLAG_NO_CLEAR
        return notification
    }

    companion object {
        const val CHANNEL_ID = "stagesync_local_host"
        const val NOTIFICATION_ID = 4000
        const val ACTION_FAILED = "com.stagesync.console.LOCAL_HOST_FAILED"
        const val ACTION_READY = "com.stagesync.console.LOCAL_HOST_READY"
        const val ACTION_STOPPED = "com.stagesync.console.LOCAL_HOST_STOPPED"
        const val ACTION_STOP = "com.stagesync.console.LOCAL_HOST_STOP"
        const val EXTRA_MESSAGE = "message"
        const val EXTRA_ORIGIN = "origin"

        private const val TAG = "SsLocalHost"
        private const val HEALTH_TIMEOUT_MS = 90_000L
        private const val HEALTH_POLL_MS = 400L
        private const val NODE_STACK_BYTES = 8L * 1024L * 1024L
        private const val STOP_BROADCAST_GRACE_MS = 200L
        private const val REQUEST_OPEN = 1
        private const val REQUEST_STOP = 2

        fun start(context: Context) {
            val intent = Intent(context, LocalHostService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.startService(
                Intent(context, LocalHostService::class.java).setAction(ACTION_STOP),
            )
        }
    }
}
