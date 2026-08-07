plugins {
    id("com.android.application")
}

android {
    namespace = "com.stagesync.console"
    compileSdk = 37
    // Keep NDK 26 pin for nodejs-mobile JNI bridge (libnode); AGP 9 default is r28c.
    ndkVersion = "26.1.10909125"

    defaultConfig {
        applicationId = "com.stagesync.console"
        minSdk = 26
        targetSdk = 36
        // Keep in sync with root package.json (host /api/health.version).
        // versionCode patch digit bumps for Console sideload diagnostics builds
        // without a SemVer cut (50207 = READY via shared status file after :host split).
        versionCode = 50407
        versionName = "5.4.7"
        // Sideload tablets: arm only (drop x86/x86_64 emulator ABIs).
        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a")
        }
        externalNativeBuild {
            cmake {
                cppFlags += ""
                arguments += listOf("-DANDROID_STL=c++_shared")
            }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = "3.22.1"
        }
    }

    packaging {
        jniLibs {
            // Keep libnode extractable beside the JNI bridge.
            useLegacyPackaging = true
        }
    }

    // Stable sideload key (repo launch/android) — CI ephemeral ~/.android/debug.keystore
    // made every Release APK unsigned-upgrade-incompatible with the previous cut.
    val sideloadKeystore =
        rootProject.projectDir.parentFile!!.parentFile!!.parentFile!!.resolve(
            "packages/android-keystore/sideload.keystore",
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
    buildFeatures {
        viewBinding = true
    }
}

// Copy full Console SPA web dist → assets/www for Offline-First cold start (#692).
val webDistDir = rootProject.projectDir.parentFile?.parentFile?.resolve("web/dist-console")
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
    description = "Copy apps/web/dist-console (full SPA) into assets/www (skip if dist missing)"
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
    implementation("androidx.core:core-ktx:1.19.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("com.google.android.material:material:1.14.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.2")
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.webkit:webkit:1.16.0")
    implementation("androidx.camera:camera-camera2:1.6.1")
    implementation("androidx.camera:camera-lifecycle:1.6.1")
    implementation("androidx.camera:camera-view:1.6.1")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    testImplementation("junit:junit:4.13.2")
}
