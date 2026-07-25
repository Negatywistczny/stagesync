package com.stagesync.performer

/**
 * Thin alias for QR / paste payload → host origin (tests + call sites).
 */
object QrJoinUrl {
    fun fromRaw(raw: String): String? = RecentHosts.originFromQrPayload(raw)
}
