plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.stagesync.performer"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.stagesync.performer"
        minSdk = 26
        targetSdk = 34
        // Keep in sync with root package.json (host /api/health.version).
        versionCode = 50300
        versionName = "5.3.0"
        // Sideload tablets: arm only (drop x86/x86_64 emulator ABIs).
        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a")
        }
    }

    // Stable sideload key (repo launch/android) — CI ephemeral ~/.android/debug.keystore
    // made every Release APK unsigned-upgrade-incompatible with the previous cut.
    val sideloadKeystore =
        rootProject.projectDir.parentFile!!.parentFile!!.parentFile!!.resolve(
            "launch/android/sideload.keystore",
        )
    signingConfigs {
        create("sideload") {
            storeFile = sideloadKeystore
            storePassword = "android"
            keyAlias = "stagesync-sideload"
            keyPassword = "android"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            signingConfig = signingConfigs.getByName("sideload")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
        debug {
            applicationIdSuffix = ".debug"
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("sideload")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        viewBinding = true
    }
}

// Copy Client-only web dist → assets/www for Offline-First cold start (#692).
// Requires prior `pnpm --filter @stagesync/web build` (see scripts/build-apk.sh).
val webDistDir = rootProject.projectDir.parentFile?.parentFile?.resolve("web/dist-performer")
val wwwAssetsDir = file("src/main/assets/www")

tasks.register("cleanWebAssets") {
    group = "stagesync"
    description = "Remove previous assets/www before sync"
    doLast {
        if (wwwAssetsDir.exists()) {
            wwwAssetsDir.deleteRecursively()
        }
    }
}

tasks.register<Copy>("syncWebAssets") {
    group = "stagesync"
    description = "Copy apps/web/dist-performer into assets/www (skip if dist missing)"
    dependsOn("cleanWebAssets")
    onlyIf { webDistDir?.resolve("index.html")?.isFile == true }
    from(webDistDir!!)
    into(wwwAssetsDir)
    exclude("ui-bundle.zip")
    exclude("**/.vite/**")
    exclude("**/*.map")
}

tasks.named("preBuild").configure {
    dependsOn("syncWebAssets")
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    implementation("androidx.activity:activity-ktx:1.9.1")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    testImplementation("junit:junit:4.13.2")
}
