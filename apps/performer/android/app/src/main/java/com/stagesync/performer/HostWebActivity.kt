package com.stagesync.performer

import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.stagesync.performer.databinding.ActivityHostWebBinding
import java.io.File
import java.net.URI

/**
 * Loads `{origin}/client` with Offline-First hybrid (#692):
 * local assets via [WebViewAssetLoader] when available; Remote Mode on protocol mismatch
 * (without wiping cache); explicit „Zastosuj nowy interfejs” when host uiHash differs.
 *
 * APK update remains a separate explicit dialog (ADR 0015 / 0016) — never silent.
 */
class HostWebActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_ORIGIN = "origin"
    }

    private lateinit var binding: ActivityHostWebBinding
    private var hostOrigin: String = ""
    private var hostAuthority: String = ""
    private var updateDialogShown = false
    private var uiDialogShown = false
    private var remoteMode = false
    private var pendingApkFile: File? = null
    private var assetLoader: WebViewAssetLoader? = null

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
        hostAuthority =
            try {
                URI(origin).host ?: ""
            } catch (_: Exception) {
                ""
            }

        remoteMode = !LocalUiStore.hasLocalUi(this)
        rebuildAssetLoader()

        val web = binding.webView
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.webChromeClient = WebChromeClient()
        web.webViewClient =
            object : WebViewClientCompat() {
                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest,
                ): Boolean = false

                override fun shouldInterceptRequest(
                    view: WebView,
                    request: WebResourceRequest,
                ): WebResourceResponse? {
                    if (remoteMode) return null
                    val loader = assetLoader ?: return null
                    val uri = request.url
                    if (uri.host != null && uri.host != hostAuthority) return null
                    return loader.shouldInterceptRequest(uri)
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    maybeCheckUiGate()
                    maybeCheckForApkUpdate()
                }
            }
        web.addJavascriptInterface(NativeBridge(), "StageSyncNative")
        loadEntry()

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

    private fun rebuildAssetLoader() {
        if (hostAuthority.isEmpty() || remoteMode) {
            assetLoader = null
            return
        }
        assetLoader =
            WebViewAssetLoader.Builder()
                .setDomain(hostAuthority)
                .setHttpAllowed(true)
                .addPathHandler("/", LocalUiStore.pathHandler(this))
                .build()
    }

    private fun loadEntry() {
        binding.webView.loadUrl("$hostOrigin${ShellConfig.ENTRY_PATH}")
    }

    private fun enterRemoteMode(reasonToast: Int? = null) {
        // Keep local cache / assets — only stop intercepting.
        remoteMode = true
        assetLoader = null
        reasonToast?.let {
            Toast.makeText(this, it, Toast.LENGTH_LONG).show()
        }
        loadEntry()
    }

    private fun maybeCheckUiGate() {
        if (uiDialogShown || hostOrigin.isEmpty()) return
        val localHash = LocalUiStore.readLocalUiHash(this)
        UiSyncChecker.checkAsync(hostOrigin, localHash) { gate ->
            runOnUiThread {
                if (isFinishing) return@runOnUiThread
                when (gate) {
                    is UiSyncChecker.Gate.ProtocolMismatch -> {
                        if (!remoteMode) {
                            enterRemoteMode(R.string.ui_protocol_mismatch)
                        }
                    }
                    is UiSyncChecker.Gate.UiUpdateAvailable -> {
                        if (uiDialogShown || remoteMode) return@runOnUiThread
                        uiDialogShown = true
                        showUiApplyDialog(gate)
                    }
                    UiSyncChecker.Gate.Ok -> Unit
                }
            }
        }
    }

    private fun showUiApplyDialog(gate: UiSyncChecker.Gate.UiUpdateAvailable) {
        AlertDialog.Builder(this)
            .setTitle(R.string.ui_apply_title)
            .setMessage(
                getString(
                    R.string.ui_apply_message,
                    gate.hostUiHash.take(12),
                    gate.localUiHash.take(12),
                ),
            )
            .setPositiveButton(R.string.ui_apply_action) { _, _ ->
                startUiBundleApply()
            }
            .setNegativeButton(R.string.update_later, null)
            .setCancelable(true)
            .show()
    }

    private fun startUiBundleApply() {
        val progress =
            AlertDialog.Builder(this)
                .setMessage(R.string.ui_apply_downloading)
                .setCancelable(false)
                .create()
        progress.show()
        UiSyncChecker.downloadAndApplyAsync(
            context = this,
            origin = hostOrigin,
            onError = { msg ->
                runOnUiThread {
                    progress.dismiss()
                    Toast.makeText(
                        this,
                        getString(R.string.ui_apply_failed, msg),
                        Toast.LENGTH_LONG,
                    ).show()
                }
            },
            onDone = {
                runOnUiThread {
                    progress.dismiss()
                    remoteMode = false
                    rebuildAssetLoader()
                    Toast.makeText(this, R.string.ui_apply_done, Toast.LENGTH_SHORT).show()
                    loadEntry()
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
        ApkUpdateChecker.check(hostOrigin, shellVersion, ShellConfig.APK_FILENAME) hostCheck@{ hostOffer ->
            if (hostOffer != null) {
                runOnUiThread {
                    if (isFinishing || updateDialogShown) return@runOnUiThread
                    updateDialogShown = true
                    showUpdateDialog(hostOffer)
                }
                return@hostCheck
            }
            val snoozed =
                getSharedPreferences(ShellConfig.PREFS, MODE_PRIVATE)
                    .getString(ShellConfig.PREFS_RELEASE_UPDATE_SNOOZE, null)
            ReleaseApkUpdateChecker.check(
                shellVersion,
                ReleaseApkUpdateChecker.AppKind.PERFORMER,
            ) releaseCheck@{ releaseOffer ->
                if (releaseOffer == null || releaseOffer.latestVersion == snoozed) {
                    return@releaseCheck
                }
                runOnUiThread {
                    if (isFinishing || updateDialogShown) return@runOnUiThread
                    updateDialogShown = true
                    showReleaseUpdateDialog(releaseOffer)
                }
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

    private fun showReleaseUpdateDialog(offer: ReleaseApkUpdateChecker.Offer) {
        AlertDialog.Builder(this)
            .setTitle(R.string.update_title)
            .setMessage(
                getString(
                    R.string.update_message_release,
                    offer.latestVersion,
                    offer.shellVersion,
                ),
            )
            .setPositiveButton(R.string.update_download_install) { _, _ ->
                startDownloadAndInstall(offer.apkUrl)
            }
            .setNegativeButton(R.string.update_later) { _, _ ->
                getSharedPreferences(ShellConfig.PREFS, MODE_PRIVATE)
                    .edit()
                    .putString(ShellConfig.PREFS_RELEASE_UPDATE_SNOOZE, offer.latestVersion)
                    .apply()
            }
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

    inner class NativeBridge {
        @android.webkit.JavascriptInterface
        fun shellKind(): String = "performer"

        @android.webkit.JavascriptInterface
        fun keepScreenOnNative(): Boolean = true

        @android.webkit.JavascriptInterface
        fun changeServer() {
            runOnUiThread { finish() }
        }
    }
}
