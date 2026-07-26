package com.stagesync.console

/**
 * Label / click semantics for the launcher local-host primary button.
 *
 * When the `:host` process is already READY (status file on disk), the UI must
 * offer **connect** — never a second start that clears status and hangs on
 * "Uruchamianie…".
 */
object LocalHostButtonMode {
    enum class Mode {
        /** Host not running — start foreground service. */
        Start,

        /** Boot / health probe in flight. */
        Busy,

        /** Host READY — open WebView on loopback origin. */
        Connect,
    }

    fun from(
        busy: Boolean,
        snapshot: LocalHostStatus.Snapshot,
    ): Mode {
        if (busy) return Mode.Busy
        return when (snapshot) {
            is LocalHostStatus.Snapshot.Ready -> Mode.Connect
            LocalHostStatus.Snapshot.None,
            is LocalHostStatus.Snapshot.Failed,
            -> Mode.Start
        }
    }
}
