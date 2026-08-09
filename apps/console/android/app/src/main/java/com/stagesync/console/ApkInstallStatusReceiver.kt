package com.stagesync.console

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInstaller
import android.os.Build
import android.widget.Toast

/**
 * Handles [PackageInstaller] session status. Without launching
 * [PackageInstaller.STATUS_PENDING_USER_ACTION]'s confirm Intent, download
 * finishes and the install UI never appears.
 */
class ApkInstallStatusReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ApkInstaller.INSTALL_STATUS_ACTION) return
        val status =
            intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        when (status) {
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                val confirm = pendingUserActionIntent(intent) ?: return
                confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(confirm)
            }
            PackageInstaller.STATUS_SUCCESS -> {
                // System finishes the update; no toast needed.
            }
            else -> {
                val detail =
                    intent.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)
                        ?.takeIf { it.isNotBlank() }
                Toast.makeText(
                    context,
                    if (detail != null) {
                        context.getString(R.string.update_install_failed, detail)
                    } else {
                        context.getString(R.string.update_install_failed_generic)
                    },
                    Toast.LENGTH_LONG,
                ).show()
            }
        }
    }

    private fun pendingUserActionIntent(intent: Intent): Intent? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra(Intent.EXTRA_INTENT)
        }
    }
}
