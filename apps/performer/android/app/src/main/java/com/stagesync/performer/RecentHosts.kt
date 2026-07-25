package com.stagesync.performer

import android.content.Context
import org.json.JSONArray
import java.net.URI

object RecentHosts {
    fun load(context: Context): List<String> {
        val raw = context.getSharedPreferences(ShellConfig.PREFS, Context.MODE_PRIVATE)
            .getString(ShellConfig.PREFS_RECENT, "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    val s = arr.optString(i).trim()
                    if (s.isNotEmpty()) add(s)
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun push(context: Context, origin: String) {
        val normalized = normalizeOrigin(origin) ?: return
        val next = (listOf(normalized) + load(context).filter { it != normalized })
            .take(ShellConfig.MAX_RECENT)
        val arr = JSONArray()
        next.forEach { arr.put(it) }
        context.getSharedPreferences(ShellConfig.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(ShellConfig.PREFS_RECENT, arr.toString())
            .apply()
    }

    fun normalizeOrigin(raw: String): String? {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return null
        val withScheme =
            if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                trimmed
            } else {
                "http://$trimmed"
            }
        return try {
            val uri = URI(withScheme)
            val host = uri.host ?: return null
            val port = if (uri.port > 0) uri.port else 4000
            val scheme = uri.scheme ?: "http"
            "$scheme://$host:$port"
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Join QR from Admin is usually a bare LAN origin (`http://host:port`).
     * Also accepts paths (`/client`, `/downloads/…`) and noisy payloads with an embedded URL.
     */
    fun originFromQrPayload(raw: String): String? {
        normalizeOrigin(raw)?.let { return it }
        val match = URL_IN_TEXT.find(raw.trim()) ?: return null
        return normalizeOrigin(match.value.trimEnd(',', '.', ';', ')', ']'))
    }

    private val URL_IN_TEXT =
        Regex("""https?://[^\s"'<>\\]+""", RegexOption.IGNORE_CASE)
}
