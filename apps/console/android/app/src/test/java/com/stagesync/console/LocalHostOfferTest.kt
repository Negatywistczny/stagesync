package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LocalHostOfferTest {
    @Test
    fun ready_isConnect() {
        val snap = LocalHostStatus.Snapshot.Ready("http://127.0.0.1:4000")
        assertEquals(LocalHostOffer.Mode.Connect, LocalHostOffer.mode(snap))
        assertEquals("http://127.0.0.1:4000", LocalHostOffer.connectOrigin(snap))
    }

    @Test
    fun noneOrFailed_isStart() {
        assertEquals(LocalHostOffer.Mode.Start, LocalHostOffer.mode(LocalHostStatus.Snapshot.None))
        assertEquals(
            LocalHostOffer.Mode.Start,
            LocalHostOffer.mode(LocalHostStatus.Snapshot.Failed("boom")),
        )
        assertNull(LocalHostOffer.connectOrigin(LocalHostStatus.Snapshot.None))
        assertNull(LocalHostOffer.connectOrigin(LocalHostStatus.Snapshot.Failed("boom")))
    }
}
