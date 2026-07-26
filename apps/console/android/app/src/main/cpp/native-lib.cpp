#include <jni.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <cstdlib>

#include <android/log.h>

#include "node.h"

#define SS_LOGI(...) __android_log_print(ANDROID_LOG_INFO, "SsLocalHost", __VA_ARGS__)
#define SS_LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "SsLocalHost", __VA_ARGS__)

/**
 * JNI bridge for StageSync Console local host (nodejs-mobile).
 * Pattern: JaneaSystems / nodejs-mobile native-gradle sample → node::Start.
 */

extern "C" JNIEXPORT jboolean JNICALL
Java_com_stagesync_console_LocalHostNative_nativeIsBridgeReady(
    JNIEnv * /* env */,
    jclass /* clazz */) {
  SS_LOGI("nativeIsBridgeReady=true");
  return JNI_TRUE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_stagesync_console_LocalHostNative_nativeChdir(
    JNIEnv *env,
    jclass /* clazz */,
    jstring path) {
  if (path == nullptr) {
    return JNI_FALSE;
  }
  const char *p = env->GetStringUTFChars(path, nullptr);
  if (p == nullptr) {
    return JNI_FALSE;
  }
  SS_LOGI("chdir %s", p);
  const int rc = chdir(p);
  if (rc != 0) {
    SS_LOGE("chdir failed errno=%d path=%s", errno, p);
  }
  env->ReleaseStringUTFChars(path, p);
  return rc == 0 ? JNI_TRUE : JNI_FALSE;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_stagesync_console_LocalHostNative_nativeSetEnv(
    JNIEnv *env,
    jclass /* clazz */,
    jstring key,
    jstring value) {
  if (key == nullptr || value == nullptr) {
    return JNI_FALSE;
  }
  const char *k = env->GetStringUTFChars(key, nullptr);
  const char *v = env->GetStringUTFChars(value, nullptr);
  if (k == nullptr || v == nullptr) {
    if (k) env->ReleaseStringUTFChars(key, k);
    if (v) env->ReleaseStringUTFChars(value, v);
    return JNI_FALSE;
  }
  const int rc = setenv(k, v, 1);
  if (rc != 0) {
    SS_LOGE("setenv failed key=%s errno=%d", k, errno);
  }
  env->ReleaseStringUTFChars(key, k);
  env->ReleaseStringUTFChars(value, v);
  return rc == 0 ? JNI_TRUE : JNI_FALSE;
}

// libuv requires argv strings in contiguous memory.
extern "C" JNIEXPORT jint JNICALL
Java_com_stagesync_console_LocalHostNative_nativeStartNodeWithArguments(
    JNIEnv *env,
    jclass /* clazz */,
    jobjectArray arguments) {
  if (arguments == nullptr) {
    SS_LOGE("startNode: arguments=null");
    return 1;
  }

  const jsize argument_count = env->GetArrayLength(arguments);
  if (argument_count <= 0) {
    SS_LOGE("startNode: empty argv");
    return 1;
  }

  int c_arguments_size = 0;
  for (jsize i = 0; i < argument_count; i++) {
    auto arg = (jstring)env->GetObjectArrayElement(arguments, i);
    if (arg == nullptr) {
      return 1;
    }
    const char *utf = env->GetStringUTFChars(arg, nullptr);
    if (utf == nullptr) {
      env->DeleteLocalRef(arg);
      return 1;
    }
    c_arguments_size += static_cast<int>(strlen(utf)) + 1;
    env->ReleaseStringUTFChars(arg, utf);
    env->DeleteLocalRef(arg);
  }

  char *args_buffer = (char *)calloc(static_cast<size_t>(c_arguments_size), sizeof(char));
  if (args_buffer == nullptr) {
    SS_LOGE("startNode: calloc args_buffer failed");
    return 1;
  }

  char **argv = (char **)malloc(static_cast<size_t>(argument_count) * sizeof(char *));
  if (argv == nullptr) {
    free(args_buffer);
    SS_LOGE("startNode: malloc argv failed");
    return 1;
  }

  char *current = args_buffer;
  for (jsize i = 0; i < argument_count; i++) {
    auto arg = (jstring)env->GetObjectArrayElement(arguments, i);
    if (arg == nullptr) {
      free(argv);
      free(args_buffer);
      return 1;
    }
    const char *utf = env->GetStringUTFChars(arg, nullptr);
    if (utf == nullptr) {
      env->DeleteLocalRef(arg);
      free(argv);
      free(args_buffer);
      return 1;
    }
    const size_t len = strlen(utf);
    memcpy(current, utf, len);
    current[len] = '\0';
    argv[i] = current;
    SS_LOGI("startNode argv[%d]=%s", (int)i, current);
    current += len + 1;
    env->ReleaseStringUTFChars(arg, utf);
    env->DeleteLocalRef(arg);
  }

  SS_LOGI("calling node::Start argc=%d", (int)argument_count);
  const int node_result = node::Start(argument_count, argv);
  SS_LOGI("node::Start returned %d", node_result);
  free(argv);
  free(args_buffer);
  return jint(node_result);
}
