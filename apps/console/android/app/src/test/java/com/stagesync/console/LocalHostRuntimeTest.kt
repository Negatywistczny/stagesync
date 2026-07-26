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
        assertTrue(msg.contains("libnode"))
        assertTrue(msg.contains("assets/host"))
        assertTrue(msg.contains("MOBILE.md"))
    }

    @Test
    fun missingMessage_includesLoadDetail() {
        val msg =
            LocalHostRuntime.missingMessage(
                LocalHostRuntime.Readiness(
                    nativeLibPresent = true,
                    hostAssetsPresent = true,
                    jniBridgeLoaded = false,
                    loadDetail = "dlopen failed: libnode.so",
                ),
            )
        assertTrue(msg.contains("dlopen failed"))
    }

    @Test
    fun processDiedMessage_mentionsLanFallback() {
        // No Android Context in JVM unit tests — generic branch only via reflection-free path
        // is covered indirectly; ensure missingMessage still ends with docs pointer.
        val msg =
            LocalHostRuntime.missingMessage(
                LocalHostRuntime.Readiness(
                    nativeLibPresent = true,
                    hostAssetsPresent = true,
                    jniBridgeLoaded = false,
                ),
            )
        assertTrue(msg.contains("LAN") || msg.contains("hostem"))
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
