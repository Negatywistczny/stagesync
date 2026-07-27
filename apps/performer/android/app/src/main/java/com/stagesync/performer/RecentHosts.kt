package com.stagesync.performer

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.net.URI

object RecentHosts {
    data class Entry(
        val url: String,
        val label: String,
    )

    fun load(context: Context): List<Entry> {
        val raw =
            context.getSharedPreferences(ShellConfig.PREFS, Context.MODE_PRIVATE)
                .getString(ShellConfig.PREFS_RECENT, "[]") ?: "[]"
        return try {
            val arr = JSONArray(raw)
            buildList {
                for (i in 0 until arr.length()) {
                    when (val item = arr.get(i)) {
                        is JSONObject -> {
                            val url = item.optString("url").trim()
                            if (url.isEmpty()) continue
                            val label = item.optString("label").trim().ifBlank { url }
                            add(Entry(url = url, label = label))
                        }
                        is String -> {
                            val url = item.trim()
                            if (url.isNotEmpty()) add(Entry(url = url, label = url))
                        }
                    }
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun push(context: Context, origin: String, label: String? = null) {
        val normalized = normalizeOrigin(origin) ?: return
        val title = label?.trim()?.takeIf { it.isNotEmpty() } ?: normalized
        val next =
            (listOf(Entry(url = normalized, label = title)) +
                load(context).filter { it.url != normalized })
                .take(ShellConfig.MAX_RECENT)
        val arr = JSONArray()
        next.forEach { entry ->
            arr.put(
                JSONObject()
                    .put("url", entry.url)
                    .put("label", entry.label),
            )
        }
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
