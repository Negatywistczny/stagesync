package com.stagesync.console

import android.content.Context
import java.io.File
import java.io.RandomAccessFile
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Persists local-host Node stdio + boot phase under [Context.getFilesDir] so the
 * launcher process can show a useful Polish error after `:host` dies (no adb).
 */
object HostProcessLog {
    const val LOG_NAME = "local-host-node.log"
    const val PHASE_NAME = "local-host-phase.txt"
    private const val DEFAULT_MAX_LINES = 40
    private const val DEFAULT_MAX_CHARS = 3_500

    fun logFile(filesDir: File): File = File(filesDir, LOG_NAME)

    fun logFile(context: Context): File = logFile(context.filesDir)

    fun phaseFile(filesDir: File): File = File(filesDir, PHASE_NAME)

    fun phaseFile(context: Context): File = phaseFile(context.filesDir)

    fun clear(context: Context) = clear(context.filesDir)

    fun clear(filesDir: File) {
        runCatching { logFile(filesDir).writeText("") }
        runCatching { phaseFile(filesDir).writeText("") }
    }

    fun writePhase(context: Context, phase: String) = writePhase(context.filesDir, phase)

    fun writePhase(filesDir: File, phase: String) {
        val line = "${System.currentTimeMillis()} $phase\n"
        runCatching { phaseFile(filesDir).appendText(line) }
    }

    fun readPhase(context: Context): String = readPhase(context.filesDir)

    fun readPhase(filesDir: File): String =
        runCatching { phaseFile(filesDir).readText().trim() }.getOrDefault("")

    fun lastLines(
        context: Context,
        maxLines: Int = DEFAULT_MAX_LINES,
        maxChars: Int = DEFAULT_MAX_CHARS,
    ): String = lastLines(context.filesDir, maxLines, maxChars)

    fun lastLines(
        filesDir: File,
        maxLines: Int = DEFAULT_MAX_LINES,
        maxChars: Int = DEFAULT_MAX_CHARS,
    ): String {
        val file = logFile(filesDir)
        if (!file.isFile || file.length() == 0L) return ""
        return try {
            val raw = readTailBytes(file, maxChars * 4).toString(Charsets.UTF_8)
            val lines = raw.lines().filter { it.isNotEmpty() }
            val slice = lines.takeLast(maxLines).joinToString("\n")
            if (slice.length <= maxChars) {
                slice
            } else {
                "…" + slice.takeLast(maxChars - 1)
            }
        } catch (_: Throwable) {
            ""
        }
    }

    fun lastPhaseLabel(context: Context): String = lastPhaseLabel(context.filesDir)

    fun lastPhaseLabel(filesDir: File): String {
        val phase = readPhase(filesDir).lines().lastOrNull()?.trim().orEmpty()
        if (phase.isEmpty()) return ""
        return phase.substringAfter(' ').ifEmpty { phase }
    }

    /** Scrollable panel body (phase + Node stdio) for launcher UI. */
    fun panelText(context: Context): String = panelText(context.filesDir)

    fun panelText(filesDir: File): String {
        val phase = lastPhaseLabel(filesDir)
        val tail = lastLines(filesDir)
        return buildString {
            if (phase.isNotEmpty()) {
                append("Faza: ")
                append(phase)
            }
            if (tail.isNotEmpty()) {
                if (isNotEmpty()) append("\n\n")
                append(tail)
            } else if (phase.isNotEmpty()) {
                append(
                    "\n\n(brak logu Node — proces padł przed startem silnika albo przed pierwszym zapisem; " +
                        "logcat tag SsLocalHost)",
                )
            }
        }
    }

    fun hasPanelContent(context: Context): Boolean = hasPanelContent(context.filesDir)

    fun hasPanelContent(filesDir: File): Boolean = panelText(filesDir).isNotBlank()

    fun buildExport(context: Context, message: String): String =
        buildExport(context.filesDir, message)

    fun buildExport(filesDir: File, message: String): String {
        val stamp =
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                .apply { timeZone = TimeZone.getTimeZone("UTC") }
                .format(Date())
        val parts =
            mutableListOf(
                "# StageSync — log startu lokalnego hosta",
                "# $stamp",
            )
        val msg = message.trim()
        if (msg.isNotEmpty()) {
            parts += ""
            parts += "## Komunikat"
            parts += msg
        }
        val panel = panelText(filesDir)
        if (panel.isNotEmpty()) {
            parts += ""
            parts += "## Log hosta"
            parts += panel
        }
        return parts.joinToString("\n") + "\n"
    }

    fun appendDiagnostics(context: Context, baseMessage: String): String =
        appendDiagnostics(context.filesDir, baseMessage)

    fun appendDiagnostics(filesDir: File, baseMessage: String): String {
        val panel = panelText(filesDir)
        return buildString {
            append(baseMessage.trim())
            if (panel.isNotEmpty()) {
                append("\n\n")
                append(panel)
            } else {
                append(
                    "\n\n(brak logu Node — proces padł przed startem silnika albo przed pierwszym zapisem; " +
                        "logcat tag SsLocalHost)",
                )
            }
        }
    }

    private fun readTailBytes(file: File, maxBytes: Int): ByteArray {
        val len = file.length()
        if (len <= 0L) return ByteArray(0)
        val take = minOf(len, maxBytes.toLong()).toInt()
        return RandomAccessFile(file, "r").use { raf ->
            raf.seek(len - take)
            ByteArray(take).also { raf.readFully(it) }
        }
    }
}
