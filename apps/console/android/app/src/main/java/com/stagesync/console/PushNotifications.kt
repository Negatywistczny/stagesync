package com.stagesync.console

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat

/** Product channels for #810 — not the FG local-host channel. */
object PushNotifications {
    const val CHANNEL_CRITICAL = "critical_updates"
    const val CHANNEL_ANNOUNCEMENTS = "announcements"
    private const val LOCAL_ID_BASE = 8200

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = context.getSystemService(NotificationManager::class.java) ?: return
        mgr.createNotificationChannel(
            NotificationChannel(
                CHANNEL_CRITICAL,
                context.getString(R.string.push_channel_critical),
                NotificationManager.IMPORTANCE_HIGH,
            ),
        )
        mgr.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ANNOUNCEMENTS,
                context.getString(R.string.push_channel_announcements),
                NotificationManager.IMPORTANCE_DEFAULT,
            ),
        )
    }

    fun hasPostPermission(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < 33) return true
        return ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    fun permissionStatus(context: Context): String {
        if (Build.VERSION.SDK_INT < 33) return "granted"
        return if (hasPostPermission(context)) "granted" else "default"
    }

    fun showLocal(
        context: Context,
        title: String,
        body: String,
        channel: String = CHANNEL_CRITICAL,
        path: String = "/admin",
    ) {
        if (!hasPostPermission(context)) return
        ensureChannels(context)
        val channelId =
            if (channel == CHANNEL_ANNOUNCEMENTS) CHANNEL_ANNOUNCEMENTS else CHANNEL_CRITICAL
        val intent =
            Intent(context, HostWebActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra(HostWebActivity.EXTRA_PUSH_PATH, path)
            }
        val pi =
            PendingIntent.getActivity(
                context,
                path.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        val notification =
            NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setContentIntent(pi)
                .setAutoCancel(true)
                .build()
        val mgr = context.getSystemService(NotificationManager::class.java) ?: return
        mgr.notify(LOCAL_ID_BASE + channelId.hashCode().and(0xfff), notification)
    }
}
