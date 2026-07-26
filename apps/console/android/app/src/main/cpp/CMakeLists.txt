cmake_minimum_required(VERSION 3.22.1)
project(stagesync_console_host)

add_library(stagesync-host-bridge SHARED native-lib.cpp)

# Headers from prepare-local-host.mjs → app/libnode/include/node/
# CMAKE_SOURCE_DIR = app/src/main/cpp → ../../../libnode = app/libnode
set(LIBNODE_ROOT "${CMAKE_SOURCE_DIR}/../../../libnode")
include_directories("${LIBNODE_ROOT}/include/node")

add_library(libnode SHARED IMPORTED)
set_target_properties(
  libnode
  PROPERTIES
  IMPORTED_LOCATION
  "${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libnode.so"
)

find_library(log-lib log)

target_link_libraries(
  stagesync-host-bridge
  libnode
  ${log-lib}
)

# Prefer 16 KB ELF max-page-size on the bridge. libnode.so comes from
# prepare-local-host (default: digidem v18.20.4 with PT_LOAD align 16 KB).
if (ANDROID_ABI STREQUAL "arm64-v8a" OR ANDROID_ABI STREQUAL "x86_64")
  target_link_options(stagesync-host-bridge PRIVATE "-Wl,-z,max-page-size=16384")
endif()
