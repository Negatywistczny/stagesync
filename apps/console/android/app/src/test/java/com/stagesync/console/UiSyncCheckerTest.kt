package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UiSyncCheckerTest {
    @Test
    fun parseHealthBody_readsConsoleRoleHash() {
        val body =
            """
            {"ok":true,"version":"5.1.3","protocolVersion":1,
             "uiHash":"full-spa","uiHashPerformer":"perf-a","uiHashConsole":"cons-b"}
            """.trimIndent()
        val health = UiSyncChecker.parseHealthBody(body, "uiHashConsole")!!
        assertEquals("5.1.3", health.version)
        assertEquals(1, health.protocolVersion)
        assertEquals("cons-b", health.uiHash)
    }

    @Test
    fun parseHealthBody_rejectsIncomplete() {
        assertNull(UiSyncChecker.parseHealthBody("""{"version":"5.1.3"}""", "uiHashConsole"))
    }

    @Test
    fun evaluateHealth_protocolMismatchKeepsLocalIntent() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.2.0", protocolVersion = 9, uiHash = "x"),
                localUiHash = "x",
                localProtocol = 1,
            )
        assertTrue(gate is UiSyncChecker.Gate.ProtocolMismatch)
    }

    @Test
    fun evaluateHealth_uiUpdateForConsoleBundle() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "cons-new"),
                localUiHash = "cons-old",
                localShellVersion = "5.1.0",
            )
        assertTrue(gate is UiSyncChecker.Gate.UiUpdateAvailable)
        val update = gate as UiSyncChecker.Gate.UiUpdateAvailable
        assertEquals("cons-new", update.hostUiHash)
        assertEquals(UiSyncChecker.UiVersionDirection.HostNewer, update.direction)
    }

    @Test
    fun evaluateHealth_uiUpdateMarksOlderHostDirection() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.0", 1, "cons-old"),
                localUiHash = "cons-new",
                localShellVersion = "5.3.0",
            )
        assertTrue(gate is UiSyncChecker.Gate.UiUpdateAvailable)
        assertEquals(
            UiSyncChecker.UiVersionDirection.HostOlder,
            (gate as UiSyncChecker.Gate.UiUpdateAvailable).direction,
        )
    }

    @Test
    fun evaluateHealth_uiUpdateMarksUnknownDirectionWhenSemverUnparseable() {
        val gate =
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("next-build", 1, "cons-other"),
                localUiHash = "cons-local",
                localShellVersion = "5.3.0",
            )
        assertTrue(gate is UiSyncChecker.Gate.UiUpdateAvailable)
        assertEquals(
            UiSyncChecker.UiVersionDirection.Unknown,
            (gate as UiSyncChecker.Gate.UiUpdateAvailable).direction,
        )
    }

    @Test
    fun evaluateHealth_okWhenMatched() {
        assertEquals(
            UiSyncChecker.Gate.Ok,
            UiSyncChecker.evaluateHealth(
                UiSyncChecker.Health("5.1.3", 1, "same"),
                localUiHash = "same",
            ),
        )
    }

    @Test
    fun parseHealthBody_rejectsBlankAndGarbage() {
        assertNull(UiSyncChecker.parseHealthBody("", "uiHashConsole"))
        assertNull(UiSyncChecker.parseHealthBody("not-json", "uiHashConsole"))
    }

    @Test
    fun evaluateHealth_okWhenHostHashNoneOrBlank() {
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
                UiSyncChecker.Health("5.1.3", 1, ""),
                localUiHash = "local",
            ),
        )
    }
}
