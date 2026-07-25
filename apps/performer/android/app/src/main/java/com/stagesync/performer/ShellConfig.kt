package com.stagesync.performer

object ShellConfig {
    /** Path after successful health check. Performer → Client. */
    const val ENTRY_PATH = "/client"

    /** Sideload APK filename served by host `GET /downloads/…`. */
    const val APK_FILENAME = "stagesync-performer.apk"

    const val PREFS = "stagesync_performer"
    const val PREFS_RECENT = "recent_hosts"
    const val MAX_RECENT = 8

    /** mDNS service type advertised by StageSync host. */
    const val MDNS_TYPE = "_stagesync._tcp."
}
