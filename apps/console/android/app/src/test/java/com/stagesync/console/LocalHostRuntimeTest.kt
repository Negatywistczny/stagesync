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
}
