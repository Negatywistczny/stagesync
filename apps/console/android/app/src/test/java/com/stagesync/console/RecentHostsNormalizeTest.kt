package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class RecentHostsNormalizeTest {
    @Test
    fun normalizeOrigin_addsSchemeAndDefaultPort() {
        assertEquals("http://192.168.1.10:4000", RecentHosts.normalizeOrigin("192.168.1.10"))
        assertEquals("http://192.168.1.10:4000", RecentHosts.normalizeOrigin("http://192.168.1.10"))
        assertEquals("https://host.example:8443", RecentHosts.normalizeOrigin("https://host.example:8443"))
    }

    @Test
    fun normalizeOrigin_rejectsBlankAndGarbage() {
        assertNull(RecentHosts.normalizeOrigin(""))
        assertNull(RecentHosts.normalizeOrigin("   "))
        assertNull(RecentHosts.normalizeOrigin("http://"))
        assertNull(RecentHosts.normalizeOrigin("://bad"))
    }

    @Test
    fun originFromQrPayload_extractsEmbeddedUrl() {
        assertEquals(
            "http://10.0.0.5:4000",
            RecentHosts.originFromQrPayload("Join StageSync http://10.0.0.5:4000/admin now"),
        )
        assertEquals(
            "http://10.0.0.5:4000",
            RecentHosts.originFromQrPayload("http://10.0.0.5:4000/downloads/stagesync-console.apk"),
        )
    }

    @Test
    fun originFromQrPayload_rejectsNoise() {
        assertNull(RecentHosts.originFromQrPayload(""))
        assertNull(RecentHosts.originFromQrPayload("no url here"))
    }
}
