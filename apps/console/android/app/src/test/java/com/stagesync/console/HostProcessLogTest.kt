package com.stagesync.console

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class HostProcessLogTest {
    @Test
    fun appendDiagnostics_includesTailAndPhase() {
        val dir = createTempDir(prefix = "ss-host-log-")
        try {
            HostProcessLog.writePhase(dir, "extract")
            HostProcessLog.writePhase(dir, "node-start")
            File(dir, HostProcessLog.LOG_NAME).writeText(
                (1..50).joinToString("\n") { "line-$it" } + "\n",
            )
            val msg = HostProcessLog.appendDiagnostics(dir, "base error")
            assertTrue(msg.startsWith("base error"))
            assertTrue(msg.contains("Faza: node-start"))
            assertTrue(msg.contains("line-50"))
            assertFalse(msg.contains("line-1\n"))
            val panel = HostProcessLog.panelText(dir)
            assertTrue(panel.startsWith("Faza: node-start"))
            assertTrue(panel.contains("line-50"))
            val export = HostProcessLog.buildExport(dir, "base error")
            assertTrue(export.contains("## Komunikat"))
            assertTrue(export.contains("## Log hosta"))
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test
    fun appendDiagnostics_emptyLogHint() {
        val dir = createTempDir(prefix = "ss-host-log-empty-")
        try {
            HostProcessLog.writePhase(dir, "redirect-stdio")
            val msg = HostProcessLog.appendDiagnostics(dir, "died")
            assertTrue(msg.contains("Faza: redirect-stdio"))
            assertTrue(msg.contains("brak logu Node"))
            assertTrue(HostProcessLog.hasPanelContent(dir))
        } finally {
            dir.deleteRecursively()
        }
    }
}
