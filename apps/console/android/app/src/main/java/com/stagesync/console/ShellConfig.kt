package com.stagesync.console

object ShellConfig {
    /** Path after successful health check. Console → Admin. */
    const val ENTRY_PATH = "/admin"

    const val PREFS = "stagesync_console"
    const val PREFS_RECENT = "recent_hosts"
    const val MAX_RECENT = 8

    /** mDNS service type advertised by StageSync host. */
    const val MDNS_TYPE = "_stagesync._tcp."
}
