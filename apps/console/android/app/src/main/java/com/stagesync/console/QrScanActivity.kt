package com.stagesync.console

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.stagesync.console.databinding.ActivityQrScanBinding

/**
 * QR scan hook: requests camera permission from launcher; full CameraX / ML Kit wiring
 * is documented in apps/console/README.md. Until then, paste URL from Admin join QR.
 */
class QrScanActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_URL = "url"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val binding = ActivityQrScanBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val cameraGranted = intent.getBooleanExtra("camera", false)
        if (!cameraGranted) {
            // Honest: no fake camera preview.
            binding.root.findViewById<android.widget.TextView?>(android.R.id.message)
        }

        binding.btnUseQrUrl.setOnClickListener {
            val raw = binding.qrUrlInput.text?.toString().orEmpty()
            val origin = RecentHosts.normalizeOrigin(raw)
            if (origin == null) {
                binding.qrUrlInput.error = getString(R.string.err_bad_url)
                return@setOnClickListener
            }
            setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_URL, origin))
            finish()
        }
    }
}
