package com.stagesync.console

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

class ElfLoadAlignTest {
    @Test
    fun maxPtLoadAlign_readsSyntheticElf64() {
        val so = File.createTempFile("libnode-test", ".so")
        try {
            // Minimal ELF64 LE with one PT_LOAD, p_align = 16384
            val buf = ByteBuffer.allocate(128).order(ByteOrder.LITTLE_ENDIAN)
            buf.put(0, 0x7f)
            buf.put(1, 'E'.code.toByte())
            buf.put(2, 'L'.code.toByte())
            buf.put(3, 'F'.code.toByte())
            buf.put(4, 2) // ELFCLASS64
            buf.put(5, 1) // ELFDATA2LSB
            buf.putLong(32, 64) // e_phoff
            buf.putShort(54, 56) // e_phentsize
            buf.putShort(56, 1) // e_phnum
            buf.putInt(64, 1) // p_type = PT_LOAD
            buf.putLong(64 + 48, 16384L) // p_align
            so.writeBytes(buf.array())
            assertEquals(16384L, ElfLoadAlign.maxPtLoadAlign(so))
        } finally {
            so.delete()
        }
    }

    @Test
    fun maxPtLoadAlign_returnsZeroForGarbage() {
        val so = File.createTempFile("not-elf", ".so")
        try {
            so.writeBytes(byteArrayOf(1, 2, 3, 4, 5, 6, 7, 8))
            assertEquals(0L, ElfLoadAlign.maxPtLoadAlign(so))
        } finally {
            so.delete()
        }
    }

    @Test
    fun align16k_constant() {
        assertTrue(ElfLoadAlign.ALIGN_16K == 16_384L)
    }
}
