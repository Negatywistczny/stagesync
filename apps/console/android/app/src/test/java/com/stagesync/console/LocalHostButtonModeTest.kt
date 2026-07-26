package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Test

class LocalHostButtonModeTest {
    @Test
    fun busy_winsOverReady() {
        assertEquals(
            LocalHostButtonMode.Mode.Busy,
            LocalHostButtonMode.from(
                busy = true,
                snapshot = LocalHostStatus.Snapshot.Ready("http://127.0.0.1:4000"),
            ),
        )
    }

    @Test
    fun ready_isConnect() {
        assertEquals(
            LocalHostButtonMode.Mode.Connect,
            LocalHostButtonMode.from(
                busy = false,
                snapshot = LocalHostStatus.Snapshot.Ready("http://127.0.0.1:4000"),
            ),
        )
    }

    @Test
    fun none_isStart() {
        assertEquals(
            LocalHostButtonMode.Mode.Start,
            LocalHostButtonMode.from(
                busy = false,
                snapshot = LocalHostStatus.Snapshot.None,
            ),
        )
    }

    @Test
    fun failed_isStart() {
        assertEquals(
            LocalHostButtonMode.Mode.Start,
            LocalHostButtonMode.from(
                busy = false,
                snapshot = LocalHostStatus.Snapshot.Failed("boom"),
            ),
        )
    }
}
