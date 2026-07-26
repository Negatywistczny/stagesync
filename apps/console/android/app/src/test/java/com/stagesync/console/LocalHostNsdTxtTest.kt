package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LocalHostNsdTxtTest {
    @Test
    fun serviceName_matchesDesktopBonjour() {
        assertEquals("StageSync 5.2.2", LocalHostNsdTxt.serviceName("5.2.2"))
        assertEquals("StageSync 0.0.0", LocalHostNsdTxt.serviceName("  "))
    }

    @Test
    fun normalizeHostname_stripsLocalSuffix() {
        assertEquals("Pixel-Tablet", LocalHostNsdTxt.normalizeHostname("Pixel-Tablet.local"))
        assertEquals("Pixel-Tablet", LocalHostNsdTxt.normalizeHostname("Pixel-Tablet.local."))
        assertEquals("localhost", LocalHostNsdTxt.normalizeHostname("  "))
    }

    @Test
    fun buildAttributes_matchesServerTxtKeys() {
        val attrs =
            LocalHostNsdTxt.buildAttributes(
                hostname = "Stage-Tab.local",
                version = "5.2.2",
                project = "Tour 2026",
                status = "PLAYING",
            )
        assertEquals("Stage-Tab", attrs["hostname"])
        assertEquals("5.2.2", attrs["version"])
        assertEquals("Tour 2026", attrs["project"])
        assertEquals("PLAYING", attrs["status"])
        assertEquals("admin", attrs["path"])
    }

    @Test
    fun truncate_ellipsisWhenOverMax() {
        val long = "a".repeat(80)
        val out = LocalHostNsdTxt.truncate(long, 10)
        assertEquals(10, out.length)
        assertTrue(out.endsWith("…"))
        assertEquals("aaaaaaaaa…", out)
    }

    @Test
    fun shellConfig_serviceType_matchesBrowseAndDesktop() {
        // Trailing dot is required by NsdManager; desktop uses `_stagesync._tcp.local.`
        assertEquals("_stagesync._tcp.", ShellConfig.MDNS_TYPE)
    }
}
