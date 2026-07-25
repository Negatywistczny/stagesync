package com.stagesync.performer

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.BarcodeScanner
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import com.stagesync.performer.databinding.ActivityQrScanBinding
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Live QR join: CameraX preview + ML Kit QR → host origin, then same connect path as paste/manual.
 * Paste fallback always available (camera denied / offline / odd payload).
 */
class QrScanActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_URL = "url"
        const val EXTRA_CAMERA = "camera"
        private const val TAG = "QrScan"
    }

    private lateinit var binding: ActivityQrScanBinding
    private var cameraExecutor: ExecutorService? = null
    private var barcodeScanner: BarcodeScanner? = null
    private val handled = AtomicBoolean(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityQrScanBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnUseQrUrl.setOnClickListener { submitManual() }

        val cameraGranted = intent.getBooleanExtra(EXTRA_CAMERA, false)
        if (cameraGranted) {
            binding.cameraDenied.visibility = View.GONE
            binding.previewView.visibility = View.VISIBLE
            binding.scanFrame.visibility = View.VISIBLE
            binding.scanStatus.setText(R.string.qr_scanning)
            startCamera()
        } else {
            showPasteOnly(R.string.qr_camera_denied)
        }
    }

    override fun onDestroy() {
        handled.set(true)
        runCatching { ProcessCameraProvider.getInstance(this).get().unbindAll() }
        barcodeScanner?.close()
        barcodeScanner = null
        cameraExecutor?.shutdown()
        cameraExecutor = null
        super.onDestroy()
    }

    private fun showPasteOnly(statusRes: Int) {
        binding.previewView.visibility = View.GONE
        binding.scanFrame.visibility = View.GONE
        binding.cameraDenied.visibility = View.VISIBLE
        binding.scanStatus.setText(statusRes)
    }

    private fun startCamera() {
        val executor = Executors.newSingleThreadExecutor()
        cameraExecutor = executor
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)
        cameraProviderFuture.addListener(
            {
                try {
                    val cameraProvider = cameraProviderFuture.get()
                    val preview =
                        Preview.Builder().build().also { p ->
                            p.setSurfaceProvider(binding.previewView.surfaceProvider)
                        }
                    val options =
                        BarcodeScannerOptions.Builder()
                            .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                            .build()
                    val scanner = BarcodeScanning.getClient(options)
                    barcodeScanner = scanner

                    val analysis =
                        ImageAnalysis.Builder()
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                    analysis.setAnalyzer(executor) { imageProxy ->
                        processFrame(scanner, imageProxy)
                    }

                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        this,
                        CameraSelector.DEFAULT_BACK_CAMERA,
                        preview,
                        analysis,
                    )
                } catch (e: Exception) {
                    Log.w(TAG, "Camera bind failed", e)
                    showPasteOnly(R.string.qr_camera_error)
                }
            },
            ContextCompat.getMainExecutor(this),
        )
    }

    @androidx.annotation.OptIn(androidx.camera.core.ExperimentalGetImage::class)
    private fun processFrame(scanner: BarcodeScanner, imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null || handled.get()) {
            imageProxy.close()
            return
        }
        val input = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
        scanner
            .process(input)
            .addOnSuccessListener { barcodes ->
                if (handled.get()) return@addOnSuccessListener
                for (barcode in barcodes) {
                    val raw = barcode.rawValue ?: continue
                    val origin = RecentHosts.originFromQrPayload(raw) ?: continue
                    if (!handled.compareAndSet(false, true)) return@addOnSuccessListener
                    runOnUiThread {
                        binding.scanStatus.setText(R.string.qr_found)
                        finishWithUrl(origin)
                    }
                    break
                }
            }
            .addOnCompleteListener { imageProxy.close() }
    }

    private fun submitManual() {
        val raw = binding.qrUrlInput.text?.toString().orEmpty()
        val origin = RecentHosts.originFromQrPayload(raw)
        if (origin == null) {
            binding.qrUrlInput.error = getString(R.string.err_bad_url)
            return
        }
        finishWithUrl(origin)
    }

    private fun finishWithUrl(origin: String) {
        setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_URL, origin))
        finish()
    }
}
