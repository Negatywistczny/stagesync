package com.stagesync.performer

import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

object HealthProbe {
    private val executor = Executors.newCachedThreadPool()

    fun probe(origin: String, callback: (ok: Boolean, detail: String) -> Unit) {
        executor.execute {
            val result = runCatching {
                val url = URL("${origin.trimEnd('/')}/api/health")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    connectTimeout = 3000
                    readTimeout = 3000
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
            }
            callback(
                result.getOrDefault(false),
                result.exceptionOrNull()?.message ?: if (result.getOrDefault(false)) "ok" else "fail",
            )
        }
    }
}
