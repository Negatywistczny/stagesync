package com.stagesync.console

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.stagesync.console.databinding.ActivityLauncherBinding

class LauncherActivity : AppCompatActivity() {
    private lateinit var binding: ActivityLauncherBinding
    private var mdns: MdnsBrowser? = null

    private val qrLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            if (result.resultCode != RESULT_OK) return@registerForActivityResult
            val url = result.data?.getStringExtra(QrScanActivity.EXTRA_URL) ?: return@registerForActivityResult
            binding.urlInput.setText(url)
            connect(url)
        }

    private val cameraPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
            // Camera lib optional — QrScanActivity always accepts pasted URL.
            qrLauncher.launch(Intent(this, QrScanActivity::class.java).putExtra("camera", granted))
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLauncherBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnConnect.setOnClickListener {
            connect(binding.urlInput.text?.toString().orEmpty())
        }
        binding.btnQr.setOnClickListener { startQr() }
        binding.btnMdns.setOnClickListener { startMdns() }

        renderRecent()
    }

    override fun onDestroy() {
        mdns?.stop()
        super.onDestroy()
    }

    private fun startQr() {
        when {
            ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED ->
                qrLauncher.launch(Intent(this, QrScanActivity::class.java).putExtra("camera", true))
            else -> cameraPermission.launch(Manifest.permission.CAMERA)
        }
    }

    private fun startMdns() {
        binding.status.text = getString(R.string.btn_mdns) + "…"
        if (mdns == null) mdns = MdnsBrowser(this)
        mdns?.start { hosts ->
            binding.mdnsList.removeAllViews()
            if (hosts.isEmpty()) {
                binding.status.text = "mDNS: brak hostów (sprawdź Wi‑Fi / STAGESYNC_DISABLE_MDNS)"
                return@start
            }
            binding.status.text = "mDNS: ${hosts.size}"
            hosts.forEach { host ->
                binding.mdnsList.addView(linkRow(host.name, host.origin))
            }
        }
    }

    private fun renderRecent() {
        binding.recentList.removeAllViews()
        RecentHosts.load(this).forEach { origin ->
            binding.recentList.addView(linkRow(origin, origin))
        }
    }

    private fun linkRow(label: String, origin: String): TextView {
        return TextView(this).apply {
            text = label
            setTextColor(ContextCompat.getColor(this@LauncherActivity, R.color.ss_primary))
            setPadding(0, 12, 0, 12)
            setOnClickListener {
                binding.urlInput.setText(origin)
                connect(origin)
            }
            layoutParams =
                LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                )
        }
    }

    private fun connect(raw: String) {
        val origin = RecentHosts.normalizeOrigin(raw)
        if (origin == null) {
            binding.status.setText(R.string.err_bad_url)
            return
        }
        binding.status.setText(R.string.status_probing)
        binding.btnConnect.isEnabled = false
        HealthProbe.probe(origin) { ok, _ ->
            runOnUiThread {
                binding.btnConnect.isEnabled = true
                if (!ok) {
                    binding.status.setText(R.string.err_health)
                    Toast.makeText(this, R.string.err_health, Toast.LENGTH_SHORT).show()
                    return@runOnUiThread
                }
                RecentHosts.push(this, origin)
                binding.status.setText(R.string.status_ok)
                startActivity(
                    Intent(this, HostWebActivity::class.java).putExtra(
                        HostWebActivity.EXTRA_ORIGIN,
                        origin,
                    ),
                )
            }
        }
    }
}
