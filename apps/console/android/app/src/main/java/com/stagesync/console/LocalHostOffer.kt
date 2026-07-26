package com.stagesync.console

/**
 * Launcher affordance for the local-host button from [LocalHostStatus].
 *
 * When the `:host` process is already READY, the UI must offer Connect — not
 * Start — so a second tap never clears status and hangs on „Uruchamianie…”.
 */
object LocalHostOffer {
    enum class Mode {
        Start,
        Connect,
    }

    fun mode(snapshot: LocalHostStatus.Snapshot): Mode =
        when (snapshot) {
            is LocalHostStatus.Snapshot.Ready -> Mode.Connect
            else -> Mode.Start
        }

    fun connectOrigin(snapshot: LocalHostStatus.Snapshot): String? =
        (snapshot as? LocalHostStatus.Snapshot.Ready)?.origin
}
