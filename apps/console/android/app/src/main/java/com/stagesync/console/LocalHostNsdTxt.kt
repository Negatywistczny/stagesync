package com.stagesync.console

/**
 * TXT / service-name helpers matching server `mdns-advertise.ts`
 * (`_stagesync._tcp`, keys: hostname, version, project, status, path).
 *
 * Pure JVM — unit-tested without Android instrumentation.
 */
object LocalHostNsdTxt {
    const val NO_PROJECT = "Brak projektu"
    const val PATH_ADMIN = "admin"
    const val STATUS_STOPPED = "STOPPED"
    const val TXT_VALUE_MAX = 64
    const val VERSION_MAX = 32

    fun truncate(value: String, max: Int = TXT_VALUE_MAX): String {
        val trimmed = value.trim()
        if (trimmed.length <= max) return trimmed
        if (max <= 1) return trimmed.take(max)
        return trimmed.take(max - 1) + "…"
    }

    fun normalizeHostname(raw: String): String {
        val host = raw.trim().replace(Regex("\\.local\\.?$", RegexOption.IGNORE_CASE), "")
        return truncate(host.ifBlank { "localhost" })
    }

    /** Same display name as Node `bonjour-service` publish (version lives in TXT only). */
    fun serviceName(): String = "StageSync"

    fun buildAttributes(
        hostname: String,
        version: String,
        project: String = NO_PROJECT,
        status: String = STATUS_STOPPED,
    ): Map<String, String> =
        mapOf(
            "hostname" to normalizeHostname(hostname),
            "version" to truncate(version, VERSION_MAX),
            "project" to truncate(project.ifBlank { NO_PROJECT }),
            "status" to status,
            "path" to PATH_ADMIN,
        )
}
