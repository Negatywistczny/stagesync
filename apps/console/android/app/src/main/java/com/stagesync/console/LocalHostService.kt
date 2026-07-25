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

/**
 * Foreground service for Console local host (Faza 4).
 *
 * Starts honest probe → either boots Node (when packaged) or broadcasts failure.
 * Never reports success without loopback /api/health.
 */
class LocalHostService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
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

        val readiness = LocalHostRuntime.probe(this)
        if (!readiness.canStart) {
            broadcast(
                ACTION_FAILED,
                LocalHostRuntime.missingMessage(readiness),
            )
            stopSelf()
            return START_NOT_STICKY
        }

        // Real path (when JNI + assets land): extract host → startNode → probe health.
        broadcast(
            ACTION_FAILED,
            getString(R.string.local_host_bridge_incomplete),
        )
        stopSelf()
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        stopForeground(STOP_FOREGROUND_REMOVE)
        super.onDestroy()
    }

    private fun broadcast(action: String, message: String) {
        sendBroadcast(
            Intent(action)
                .setPackage(packageName)
                .putExtra(EXTRA_MESSAGE, message),
        )
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
