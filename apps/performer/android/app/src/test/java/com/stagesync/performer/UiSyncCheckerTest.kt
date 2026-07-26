package com.stagesync.performer

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UiSyncCheckerTest {
    @Test
    fun parseHealthBody_readsRoleHashNotFullSpa() {
        val body =
            """
            {"ok":true,"version":"5.1.3","protocolVersion":1,
             "uiHash":"full-spa","uiHashPerformer":"perf-a","uiHashConsole":"cons-b"}
            """.trimIndent()
        val health = UiSyncChecker.parseHealthBody(body, "uiHashPerformer")!!
        assertEquals("5.1.3", health.version)
        assertEquals(1, health.protocolVersion)
        assertEquals("perf-a", health.uiHash)
    }

    @Test
    fun parseHealthBody_missingRoleHashYieldsEmpty() {
        val body = """{"version":"5.1.3","protocolVersion":1,"uiHash":"full-only"}"""
        val health = UiSyncChecker.parseHealthBody(body, "uiHashPerformer")!!
        assertEquals("", health.uiHash)
    }

    @Test
    fun parseHealthBody_rejectsIncomplete() {
        assertNull(UiSyncChecker.parseHealthBody("""{"version":"5.1.3"}""", "uiHashPerformer"))
        assertNull(UiSyncChecker.parseHealthBody("""{"protocolVersion":1}""", "uiHashPerformer"))
    }

    @Test
    fun evaluateHealth_protocolMismatch() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.2.0", protocolVersion = 2, uiHash = "x"),
                localUiHash = "x",
                localProtocol = 1,
            )
        assertTrue(gate is UiSyncChecker.Gate.ProtocolMismatch)
        val mm = gate as UiSyncChecker.Gate.ProtocolMismatch
        assertEquals(2, mm.host)
        assertEquals(1, mm.local)
    }

    @Test
    fun evaluateHealth_uiUpdateWhenRoleHashDiffers() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "host-hash"),
                localUiHash = "local-hash",
            )
        assertTrue(gate is UiSyncChecker.Gate.UiUpdateAvailable)
        val offer = gate as UiSyncChecker.Gate.UiUpdateAvailable
        assertEquals("host-hash", offer.hostUiHash)
        assertEquals("local-hash", offer.localUiHash)
    }

    @Test
    fun evaluateHealth_okWhenHashMatchesOrMissing() {
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "same"),
                localUiHash = "same",
            ),
        )
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "none"),
                localUiHash = "local",
            ),
        )
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "host"),
                localUiHash = null,
            ),
        )
    }

    @Test
    fun parseHealthBody_rejectsBlankAndGarbage() {
        assertNull(UiSyncChecker.parseHealthBody("", "uiHashPerformer"))
        assertNull(UiSyncChecker.parseHealthBody("not-json", "uiHashPerformer"))
        assertNull(UiSyncChecker.parseHealthBody("{", "uiHashPerformer"))
    }

    @Test
    fun evaluateHealth_okWhenHostHashBlank() {
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, ""),
                localUiHash = "local",
            ),
        )
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "   "),
                localUiHash = "local",
            ),
        )
    }
}
