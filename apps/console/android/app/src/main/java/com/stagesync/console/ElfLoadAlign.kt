package com.stagesync.console

import java.io.File
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Reads max PT_LOAD `p_align` from an ELF shared library (little-endian).
 * Used to diagnose 4 KB vs 16 KB page-size mismatches on Android 15+.
 */
object ElfLoadAlign {
    const val ALIGN_16K = 16_384L
    private const val PT_LOAD = 1

    /** @return max PT_LOAD align, or 0 if unreadable / not ELF. */
    fun maxPtLoadAlign(soFile: File): Long {
        if (!soFile.isFile || soFile.length() < 64L) return 0L
        return try {
            RandomAccessFile(soFile, "r").use { raf ->
                val ident = ByteArray(16)
                raf.readFully(ident)
                if (ident[0] != 0x7f.toByte() || ident[1] != 'E'.code.toByte()) return 0L
                if (ident[5].toInt() != 1) return 0L // little-endian only
                val eiClass = ident[4].toInt()
                val hdr =
                    when (eiClass) {
                        2 -> {
                            val buf = ByteArray(64)
                            System.arraycopy(ident, 0, buf, 0, 16)
                            raf.seek(16)
                            raf.readFully(buf, 16, 48)
                            val bb = ByteBuffer.wrap(buf).order(ByteOrder.LITTLE_ENDIAN)
                            Triple(bb.getLong(32), bb.getShort(54).toInt() and 0xffff, bb.getShort(56).toInt() and 0xffff)
                        }
                        1 -> {
                            val buf = ByteArray(52)
                            System.arraycopy(ident, 0, buf, 0, 16)
                            raf.seek(16)
                            raf.readFully(buf, 16, 36)
                            val bb = ByteBuffer.wrap(buf).order(ByteOrder.LITTLE_ENDIAN)
                            Triple(bb.getInt(28).toLong(), bb.getShort(42).toInt() and 0xffff, bb.getShort(44).toInt() and 0xffff)
                        }
                        else -> return 0L
                    }
                val (phOff, phEntSize, phNum) = hdr
                if (phEntSize <= 0 || phNum <= 0 || phNum > 256) return 0L
                var maxAlign = 0L
                val entry = ByteArray(phEntSize)
                for (i in 0 until phNum) {
                    raf.seek(phOff + i.toLong() * phEntSize)
                    raf.readFully(entry)
                    val bb = ByteBuffer.wrap(entry).order(ByteOrder.LITTLE_ENDIAN)
                    val pType = bb.getInt(0)
                    if (pType != PT_LOAD) continue
                    val pAlign =
                        if (eiClass == 2) {
                            bb.getLong(48)
                        } else {
                            bb.getInt(28).toLong() and 0xffff_ffffL
                        }
                    if (pAlign > maxAlign) maxAlign = pAlign
                }
                maxAlign
            }
        } catch (_: Throwable) {
            0L
        }
    }

    fun libnodeAlign(nativeLibraryDir: String): Long {
        return maxPtLoadAlign(File(nativeLibraryDir, "libnode.so"))
    }
}
