package com.stagesync.performer

/**
 * Minimal SemVer compare for host vs shell (ADR 0015/0016 — no silent auto-update).
 * Supports `MAJOR.MINOR.PATCH` with optional pre-release suffix (`-alpha.1`, `-beta.2`).
 */
object SemVer {
    data class Parsed(
        val major: Int,
        val minor: Int,
        val patch: Int,
        /** Empty = release; otherwise pre-release identifier (compared lexicographically). */
        val prerelease: String,
    )

    private val CORE =
        Regex("""^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.]+))?(?:\+.*)?$""")

    fun parse(raw: String): Parsed? {
        val m = CORE.matchEntire(raw.trim()) ?: return null
        return Parsed(
            major = m.groupValues[1].toInt(),
            minor = m.groupValues[2].toInt(),
            patch = m.groupValues[3].toInt(),
            prerelease = m.groupValues[4],
        )
    }

    /**
     * Negative if [a] < [b], 0 if equal, positive if [a] > [b].
     * `null` when either side is not parseable.
     */
    fun compare(a: String, b: String): Int? {
        val left = parse(a) ?: return null
        val right = parse(b) ?: return null
        val core =
            left.major.compareTo(right.major).takeIf { it != 0 }
                ?: left.minor.compareTo(right.minor).takeIf { it != 0 }
                ?: left.patch.compareTo(right.patch)
        if (core != 0) return core
        // Release (no prerelease) > any prerelease of the same core.
        return when {
            left.prerelease.isEmpty() && right.prerelease.isEmpty() -> 0
            left.prerelease.isEmpty() -> 1
            right.prerelease.isEmpty() -> -1
            else -> left.prerelease.compareTo(right.prerelease)
        }
    }

    /**
     * Offer an update when the host reports a newer SemVer than the installed shell.
     * If either version is unparseable, fall back to inequality (MVP).
     */
    fun hostIsNewer(hostVersion: String, shellVersion: String): Boolean {
        val host = hostVersion.trim()
        val shell = shellVersion.trim()
        if (host.isEmpty() || shell.isEmpty()) return false
        val cmp = compare(host, shell)
        return if (cmp != null) cmp > 0 else host != shell
    }
}
