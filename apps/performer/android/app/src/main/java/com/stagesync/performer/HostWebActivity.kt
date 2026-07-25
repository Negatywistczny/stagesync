package com.stagesync.performer

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.stagesync.performer.databinding.ActivityHostWebBinding
import java.io.File

/**
 * Loads `{origin}/client` in a kiosk-ish WebView.
 *
 * Dual wake-lock: [FLAG_KEEP_SCREEN_ON] here + PWA Screen Wake Lock API inside the SPA.
 * After load: optional explicit APK update dialog (never silent — ADR 0015 / 0016).
 */
class HostWebActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_ORIGIN = "origin"
    }

    private lateinit var binding: ActivityHostWebBinding
    private var hostOrigin: String = ""
    private var updateDialogShown = false
    private var pendingApkFile: File? = null

    private val unknownSourcesLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) {
            val file = pendingApkFile
            if (file != null && ApkInstaller.canInstallPackages(this)) {
                startActivity(ApkInstaller.installIntent(this, file))
            } else if (file != null) {
                Toast.makeText(this, R.string.update_need_permission, Toast.LENGTH_LONG).show()
            }
            pendingApkFile = null
        }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHostWebBinding.inflate(layoutInflater)
        setContentView(binding.root)

        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        enterImmersive()

        val origin = intent.getStringExtra(EXTRA_ORIGIN)?.trimEnd('/')
        if (origin.isNullOrEmpty()) {
            finish()
            return
        }
        hostOrigin = origin

        val web = binding.webView
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        // Pull-to-refresh is browser chrome; WebView has no address bar — still block overscroll glow noise.
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.webChromeClient = WebChromeClient()
        web.webViewClient =
            object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?,
                ): Boolean = false

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    maybeCheckForApkUpdate()
                }
            }
        web.addJavascriptInterface(NativeBridge(), "StageSyncNative")
        web.loadUrl("$origin${ShellConfig.ENTRY_PATH}")

        binding.btnChangeServer.setOnClickListener { finish() }

        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (binding.webView.canGoBack()) {
                        binding.webView.goBack()
                    } else {
                        finish()
                    }
                }
            },
        )
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) enterImmersive()
    }

    private fun maybeCheckForApkUpdate() {
        if (updateDialogShown || hostOrigin.isEmpty()) return
        val shellVersion =
            try {
                packageManager.getPackageInfo(packageName, 0).versionName ?: return
            } catch (_: PackageManager.NameNotFoundException) {
                return
            }
        ApkUpdateChecker.check(hostOrigin, shellVersion, ShellConfig.APK_FILENAME) { offer ->
            if (offer == null) return@check
            runOnUiThread {
                if (isFinishing || updateDialogShown) return@runOnUiThread
                updateDialogShown = true
                showUpdateDialog(offer)
            }
        }
    }

    private fun showUpdateDialog(offer: ApkUpdateChecker.Offer) {
        AlertDialog.Builder(this)
            .setTitle(R.string.update_title)
            .setMessage(
                getString(R.string.update_message, offer.hostVersion, offer.shellVersion),
            )
            .setPositiveButton(R.string.update_download_install) { _, _ ->
                startDownloadAndInstall(offer.apkUrl)
            }
            .setNegativeButton(R.string.update_later, null)
            .setCancelable(true)
            .show()
    }

    private fun startDownloadAndInstall(apkUrl: String) {
        val progress =
            AlertDialog.Builder(this)
                .setMessage(R.string.update_downloading)
                .setCancelable(false)
                .create()
        progress.show()
        ApkInstaller.downloadThenInstall(
            context = this,
            apkUrl = apkUrl,
            onError = { msg ->
                runOnUiThread {
                    progress.dismiss()
                    Toast.makeText(
                        this,
                        getString(R.string.update_download_failed, msg),
                        Toast.LENGTH_LONG,
                    ).show()
                }
            },
            onReadyToInstall = { file ->
                runOnUiThread {
                    progress.dismiss()
                    launchInstaller(file)
                }
            },
        )
    }

    private fun launchInstaller(file: File) {
        if (!ApkInstaller.canInstallPackages(this)) {
            pendingApkFile = file
            Toast.makeText(this, R.string.update_need_permission, Toast.LENGTH_LONG).show()
            unknownSourcesLauncher.launch(ApkInstaller.unknownSourcesSettingsIntent(this))
            return
        }
        startActivity(ApkInstaller.installIntent(this, file))
    }

    private fun enterImmersive() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility =
            (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN)
    }

    /**
     * Bridge notes for dual wake-lock / update prompt.
     * No secrets. Manual APK download only (no silent install).
     */
    class NativeBridge {
        @android.webkit.JavascriptInterface
        fun shellKind(): String = "performer"

        @android.webkit.JavascriptInterface
        fun keepScreenOnNative(): Boolean = true
    }
}
