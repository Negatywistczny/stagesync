package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class LocalUiHashParseTest {
    @Test
    fun parseUiHash_readsQuotedHash() {
        assertEquals(
            "abc123",
            LocalUiStore.parseUiHash("""{"protocolVersion":1,"uiHash":"abc123"}"""),
        )
        assertEquals(
            "deadbeef",
            LocalUiStore.parseUiHash("""{ "uiHash" : "deadbeef" }"""),
        )
    }

    @Test
    fun parseUiHash_rejectsMissingOrGarbage() {
        assertNull(LocalUiStore.parseUiHash(""))
        assertNull(LocalUiStore.parseUiHash("{}"))
        assertNull(LocalUiStore.parseUiHash("""{"uiHash":}"""))
        assertNull(LocalUiStore.parseUiHash("not-json"))
    }
}
