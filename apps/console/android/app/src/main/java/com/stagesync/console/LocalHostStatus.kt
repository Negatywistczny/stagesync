package com.stagesync.console

import android.content.Context
import java.io.File

/**
 * Cross-process gate between `:host` ([LocalHostService]) and the launcher UI.
 *
 * Broadcasts alone are unreliable for dynamically registered
 * `RECEIVER_NOT_EXPORTED` receivers on Android 14+ when the sender runs in
 * another process of the same app. Both sides share [Context.getFilesDir], so
 * a small status file is the SSOT the UI can poll after `health-ok`.
 */
object LocalHostStatus {
    const val FILE_NAME = "local-host-status.txt"
    private const val KIND_READY = "READY"
    private const val KIND_FAILED = "FAILED"

    sealed class Snapshot {
        data object None : Snapshot()

        data class Ready(
            val origin: String,
        ) : Snapshot()

        data class Failed(
            val message: String,
        ) : Snapshot()
    }

    fun statusFile(filesDir: File): File = File(filesDir, FILE_NAME)

    fun statusFile(context: Context): File = statusFile(context.filesDir)

    fun clear(context: Context) = clear(context.filesDir)

    fun clear(filesDir: File) {
        runCatching { statusFile(filesDir).writeText("") }
    }

    fun writeReady(
        context: Context,
        origin: String,
    ) = writeReady(context.filesDir, origin)

    fun writeReady(
        filesDir: File,
        origin: String,
    ) {
        val safe = origin.trim().ifEmpty { LocalHostRuntime.LOOPBACK_ORIGIN }
        statusFile(filesDir).writeText("$KIND_READY\n$safe\n")
    }

    fun writeFailed(
        context: Context,
        message: String,
    ) = writeFailed(context.filesDir, message)

    fun writeFailed(
        filesDir: File,
        message: String,
    ) {
        statusFile(filesDir).writeText("$KIND_FAILED\n${message.trim()}")
    }

    fun read(context: Context): Snapshot = read(context.filesDir)

    fun read(filesDir: File): Snapshot {
        val raw =
            runCatching { statusFile(filesDir).readText() }
                .getOrNull()
                ?.trim()
                .orEmpty()
        if (raw.isEmpty()) return Snapshot.None
        val nl = raw.indexOf('\n')
        val kind = if (nl < 0) raw.trim() else raw.substring(0, nl).trim()
        val body = if (nl < 0) "" else raw.substring(nl + 1).trim()
        return when (kind) {
            KIND_READY ->
                Snapshot.Ready(
                    body.ifEmpty { LocalHostRuntime.LOOPBACK_ORIGIN },
                )
            KIND_FAILED ->
                Snapshot.Failed(
                    body.ifEmpty { "Lokalny host nie wystartował." },
                )
            else -> Snapshot.None
        }
    }
}
