/**
 * Faza 4 — NDK cmake stub (not wired into Gradle yet).
 *
 * Next eng step after `prepare-local-host.mjs` drops libnode.so into jniLibs:
 * 1. Install Android NDK.
 * 2. Add externalNativeBuild { cmake { path = file("src/main/cpp/CMakeLists.txt") } }
 *    with ANDROID_STL=c++_shared and link against libnode.
 * 3. Implement JNI `LocalHostNative.startNodeWithArguments` calling node::Start
 *    (pattern: JaneaSystems nodejs-mobile native-gradle sample).
 * 4. Flip LocalHostNative.isBridgeReady() to true when the native lib exports the symbol.
 *
 * Until then Console launcher reports an honest failure — never fake /api/health success.
 *
 * See docs/MOBILE.md § Faza 4.
 */
cmake_minimum_required(VERSION 3.22.1)
project(stagesync_console_host)

# Placeholder — enable when NDK + libnode paths are provisioned in CI/local.
# add_library(stagesync-host-bridge SHARED native-lib.cpp)
# find_library(log-lib log)
# target_link_libraries(stagesync-host-bridge ${log-lib} ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libnode.so)
