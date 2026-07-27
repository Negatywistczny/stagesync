package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class HostDiscoveryTest {
    @Test
    fun normalizeDiscoveryVersion_convertsDashSemver() {
        assertEquals("5.3.0", HostDiscovery.normalizeDiscoveryVersion("5-3-0"))
        assertEquals("5.3.0", HostDiscovery.normalizeDiscoveryVersion("v5.3.0"))
        assertNull(HostDiscovery.normalizeDiscoveryVersion("  "))
    }

    @Test
    fun formatDiscoveryTitle_prefersHostname() {
        assertEquals(
            "FOH Mac Mini",
            HostDiscovery.formatDiscoveryTitle(
                hostname = "FOH Mac Mini",
                origin = "http://192.168.0.12:4000",
                serviceName = "StageSync 5.3.0",
            ),
        )
    }

    @Test
    fun formatDiscoveryTitle_rejectsStagesyncServiceName() {
        assertEquals(
            "192.168.0.12:4000",
            HostDiscovery.formatDiscoveryTitle(
                hostname = "StageSync 5.3.0",
                origin = "http://192.168.0.12:4000",
                serviceName = "StageSync 5-3-0",
            ),
        )
    }

    @Test
    fun formatDiscoveryMeta_joinsOriginVersionProject() {
        assertEquals(
            "192.168.0.12:4000 · v5.3.0 · Tour 2026",
            HostDiscovery.formatDiscoveryMeta(
                origin = "http://192.168.0.12:4000",
                version = "5.3.0",
                project = "Tour 2026",
            ),
        )
    }

    @Test
    fun formatDiscoveryMeta_omitsDefaultProject() {
        assertEquals(
            "192.168.0.12:4000 · v5.3.0",
            HostDiscovery.formatDiscoveryMeta(
                origin = "http://192.168.0.12:4000",
                version = "5.3.0",
                project = LocalHostNsdTxt.NO_PROJECT,
            ),
        )
    }
}
