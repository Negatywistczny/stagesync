package com.stagesync.performer

/**
 * LAN host discovery display — keep in sync with packages/shared/src/host-discovery.ts
 */
object HostDiscovery {
    private val stagesyncServiceTitleRe = Regex("^stagesync(\\s|$)", RegexOption.IGNORE_CASE)
    private val dashSemverRe = Regex("^(\\d+)-(\\d+)-(\\d+)(?:$|[-.])")

    data class Host(
        val title: String,
        val meta: String,
        val origin: String,
    )

    fun normalizeDiscoveryVersion(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        var v = raw.trim().removePrefix("v").removePrefix("V")
        if (v.isBlank()) return null
        val dash = dashSemverRe.find(v)
        if (dash != null) {
            v = "${dash.groupValues[1]}.${dash.groupValues[2]}.${dash.groupValues[3]}"
        }
        return v
    }

    fun formatDiscoveryVersionLabel(raw: String?): String? {
        val v = normalizeDiscoveryVersion(raw) ?: return null
        return "v$v"
    }

    fun formatDiscoveryTitle(
        hostname: String?,
        origin: String,
        serviceName: String? = null,
    ): String {
        val host = hostname?.trim()?.takeIf { it.isNotEmpty() }
        if (host != null && !isStagesyncServiceTitle(host)) return host

        hostFromOrigin(origin)?.let { return it }

        val service = serviceName?.trim()?.takeIf { it.isNotEmpty() }
        if (service != null && !isStagesyncServiceTitle(service)) return service

        return origin.trim().ifBlank { "Host" }
    }

    fun formatDiscoveryMeta(
        origin: String,
        version: String? = null,
        project: String? = null,
    ): String {
        val bits = mutableListOf(originDisplay(origin))
        formatDiscoveryVersionLabel(version)?.let { bits.add(it) }
        val proj = project?.trim()?.takeIf { it.isNotEmpty() }
        if (proj != null && proj != "Brak projektu") {
            bits.add(proj)
        }
        return bits.joinToString(" · ")
    }

    fun decodeTxtAttribute(bytes: ByteArray?): String? {
        if (bytes == null || bytes.isEmpty()) return null
        return try {
            String(bytes, Charsets.UTF_8).trim().takeIf { it.isNotEmpty() }
        } catch (_: Exception) {
            null
        }
    }

    fun txtAttribute(attributes: Map<String, ByteArray>?, key: String): String? =
        decodeTxtAttribute(attributes?.get(key))

    private fun isStagesyncServiceTitle(value: String): Boolean =
        stagesyncServiceTitleRe.containsMatchIn(value.trim())

    private fun hostFromOrigin(origin: String?): String? {
        if (origin.isNullOrBlank()) return null
        val trimmed = origin.trim()
        return try {
            val withScheme =
                if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
                    trimmed
                } else {
                    "http://$trimmed"
                }
            val uri = java.net.URI(withScheme)
            val host = uri.host ?: return trimmed.removePrefix("http://").removePrefix("https://")
            val port = if (uri.port > 0) uri.port else 4000
            "$host:$port"
        } catch (_: Exception) {
            trimmed.removePrefix("http://").removePrefix("https://").ifBlank { null }
        }
    }

    private fun originDisplay(origin: String): String =
        hostFromOrigin(origin) ?: origin.removePrefix("http://").removePrefix("https://")
}
