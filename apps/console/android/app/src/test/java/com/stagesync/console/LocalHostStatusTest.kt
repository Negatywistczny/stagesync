package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import kotlin.io.path.createTempDirectory

class LocalHostStatusTest {
    @Test
    fun read_empty_isNone() {
        val dir = createTempDirectory(prefix = "ss-host-status-").toFile()
        try {
            assertEquals(LocalHostStatus.Snapshot.None, LocalHostStatus.read(dir))
            LocalHostStatus.clear(dir)
            assertEquals(LocalHostStatus.Snapshot.None, LocalHostStatus.read(dir))
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test
    fun writeReady_roundTrip() {
        val dir = createTempDirectory(prefix = "ss-host-ready-").toFile()
        try {
            LocalHostStatus.writeReady(dir, "http://127.0.0.1:4000")
            val snap = LocalHostStatus.read(dir)
            assertTrue(snap is LocalHostStatus.Snapshot.Ready)
            assertEquals(
                "http://127.0.0.1:4000",
                (snap as LocalHostStatus.Snapshot.Ready).origin,
            )
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test
    fun writeFailed_preservesMultiline() {
        val dir = createTempDirectory(prefix = "ss-host-failed-").toFile()
        try {
            LocalHostStatus.writeFailed(dir, "line-a\nline-b")
            val snap = LocalHostStatus.read(dir)
            assertTrue(snap is LocalHostStatus.Snapshot.Failed)
            assertEquals(
                "line-a\nline-b",
                (snap as LocalHostStatus.Snapshot.Failed).message,
            )
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test
    fun writeReady_blankOrigin_usesLoopback() {
        val dir = createTempDirectory(prefix = "ss-host-blank-").toFile()
        try {
            LocalHostStatus.writeReady(dir, "  ")
            val snap = LocalHostStatus.read(dir) as LocalHostStatus.Snapshot.Ready
            assertEquals(LocalHostRuntime.LOOPBACK_ORIGIN, snap.origin)
        } finally {
            dir.deleteRecursively()
        }
    }

    @Test
    fun statusFile_name() {
        val dir = File("/tmp")
        assertEquals(
            File(dir, LocalHostStatus.FILE_NAME),
            LocalHostStatus.statusFile(dir),
        )
    }
}
