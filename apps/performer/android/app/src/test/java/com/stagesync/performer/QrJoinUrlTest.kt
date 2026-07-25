package com.stagesync.performer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class QrJoinUrlTest {
    @Test
    fun acceptsPlainOrigin() {
        assertEquals("http://192.168.1.10:4000", QrJoinUrl.fromRaw("http://192.168.1.10:4000"))
        assertEquals("http://192.168.1.10:4000", QrJoinUrl.fromRaw("192.168.1.10:4000"))
    }

    @Test
    fun stripsPathFromJoinOrDownloadQr() {
        assertEquals(
            "http://10.0.0.5:4000",
            QrJoinUrl.fromRaw("http://10.0.0.5:4000/client"),
        )
        assertEquals(
            "http://10.0.0.5:4000",
            QrJoinUrl.fromRaw("http://10.0.0.5:4000/downloads/stagesync-performer.apk"),
        )
    }

    @Test
    fun extractsEmbeddedUrl() {
        assertEquals(
            "http://192.168.0.2:4000",
            QrJoinUrl.fromRaw("StageSync http://192.168.0.2:4000 join"),
        )
    }

    @Test
    fun rejectsGarbage() {
        assertNull(QrJoinUrl.fromRaw(""))
        assertNull(QrJoinUrl.fromRaw("not a url"))
    }
}
