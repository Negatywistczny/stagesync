package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SemVerTest {
    @Test
    fun compare_releaseOrdering() {
        assertTrue(SemVer.compare("5.1.3", "5.1.2")!! > 0)
        assertTrue(SemVer.compare("5.0.0", "5.1.0")!! < 0)
        assertEquals(0, SemVer.compare("5.1.3", "5.1.3"))
    }

    @Test
    fun compare_prereleaseBelowRelease() {
        assertTrue(SemVer.compare("5.1.3", "5.1.3-alpha.1")!! > 0)
        assertTrue(SemVer.compare("5.1.3-alpha.1", "5.1.3")!! < 0)
        assertTrue(SemVer.compare("5.1.3-beta.2", "5.1.3-beta.1")!! > 0)
    }

    @Test
    fun hostIsNewer_semver() {
        assertTrue(SemVer.hostIsNewer("5.2.0", "5.1.3"))
        assertFalse(SemVer.hostIsNewer("5.1.3", "5.1.3"))
        assertFalse(SemVer.hostIsNewer("5.1.2", "5.1.3"))
    }

    @Test
    fun hostIsNewer_unparseableFallsBackToInequality() {
        assertTrue(SemVer.hostIsNewer("next", "5.1.3"))
        assertFalse(SemVer.hostIsNewer("build-local", "build-local"))
    }

    @Test
    fun compare_unparseableReturnsNull() {
        assertEquals(null, SemVer.compare("not-a-version", "5.1.3"))
        assertEquals(null, SemVer.compare("5.1.3", "bogus"))
        assertEquals(null, SemVer.compare("", "5.1.3"))
    }

    @Test
    fun compare_trimsAndIgnoresBuildMetadata() {
        assertEquals(0, SemVer.compare("  5.1.3  ", "5.1.3+build.9"))
        assertEquals(0, SemVer.compare("5.1.3+abc", "5.1.3+xyz"))
    }

    @Test
    fun hostIsNewer_emptyVersionsAreNotNewer() {
        assertFalse(SemVer.hostIsNewer("", "5.1.3"))
        assertFalse(SemVer.hostIsNewer("5.1.3", ""))
        assertFalse(SemVer.hostIsNewer("   ", "5.1.3"))
    }
}
