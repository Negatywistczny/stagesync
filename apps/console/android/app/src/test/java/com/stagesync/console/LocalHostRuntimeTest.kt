package com.stagesync.console

import org.junit.Assert.assertTrue
import org.junit.Test

class LocalHostRuntimeTest {
    @Test
    fun missingMessage_listsGaps() {
        val msg =
            LocalHostRuntime.missingMessage(
                LocalHostRuntime.Readiness(
                    nativeLibPresent = false,
                    hostAssetsPresent = false,
                    jniBridgeLoaded = false,
                ),
            )
        assertTrue(msg.contains("libnode.so"))
        assertTrue(msg.contains("assets/host"))
        assertTrue(msg.contains("MOBILE.md"))
    }

    @Test
    fun canStart_requiresAllThree() {
        assertTrue(
            !LocalHostRuntime.Readiness(
                nativeLibPresent = true,
                hostAssetsPresent = true,
                jniBridgeLoaded = false,
            ).canStart,
        )
        assertTrue(
            LocalHostRuntime.Readiness(
                nativeLibPresent = true,
                hostAssetsPresent = true,
                jniBridgeLoaded = true,
            ).canStart,
        )
    }

    @Test
    fun missingMessage_jniOnlyWhenNativePresent() {
        val msg =
            LocalHostRuntime.missingMessage(
                LocalHostRuntime.Readiness(
                    nativeLibPresent = true,
                    hostAssetsPresent = true,
                    jniBridgeLoaded = false,
                ),
            )
        assertTrue(msg.contains("JNI"))
        assertTrue(!msg.contains("libnode.so"))
        assertTrue(!msg.contains("assets/host"))
    }

    @Test
    fun missingMessage_readyBuildHasNoGapList() {
        val msg =
            LocalHostRuntime.missingMessage(
                LocalHostRuntime.Readiness(
                    nativeLibPresent = true,
                    hostAssetsPresent = true,
                    jniBridgeLoaded = true,
                ),
            )
        assertTrue(msg.contains("Lokalny host nie jest jeszcze gotowy"))
        assertTrue(!msg.contains(": "))
    }
}
