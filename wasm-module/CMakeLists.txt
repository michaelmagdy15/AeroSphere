# ═══════════════════════════════════════════════════════
# AeroSphere Studio — WASM Gauge Build Configuration
# Targets MSFS 2024 WASM gauge using the MSFS SDK toolchain
# ═══════════════════════════════════════════════════════

cmake_minimum_required(VERSION 3.16)

project(AeroSphereGauge LANGUAGES C)

# ── MSFS SDK paths ────────────────────────────────────────
# MSFS_SDK should point to the MSFS SDK installation root.
# Typically set via environment variable or CMake cache.

if(NOT DEFINED ENV{MSFS_SDK})
    message(FATAL_ERROR
        "MSFS_SDK environment variable not set. "
        "Point it to your MSFS SDK installation, e.g. "
        "C:/MSFS SDK/SimConnect SDK")
endif()

set(MSFS_SDK $ENV{MSFS_SDK})

# ── Source files ──────────────────────────────────────────

set(SOURCES
    src/main.c
    src/lvar_bridge.c
    src/event_bridge.c
)

# ── WASM target ──────────────────────────────────────────
# Build as a shared library (.wasm gauge module).

add_executable(${PROJECT_NAME} ${SOURCES})

# ── Include paths ────────────────────────────────────────

target_include_directories(${PROJECT_NAME} PRIVATE
    ${MSFS_SDK}/WASM/include
    ${MSFS_SDK}/SimConnect\ SDK/include
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# ── Compiler flags for WASM ──────────────────────────────
# When building with the MSFS WASM toolchain (clang --target=wasm32):

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten" OR CMAKE_C_COMPILER_TARGET MATCHES "wasm32")
    target_compile_options(${PROJECT_NAME} PRIVATE
        -O2
        -Wall
        -Wextra
        -Wno-unused-parameter
    )

    set_target_properties(${PROJECT_NAME} PROPERTIES
        SUFFIX ".wasm"
        OUTPUT_NAME "AeroSphereGauge"
    )
else()
    # Native build (for testing/CI) — link against SimConnect
    target_link_directories(${PROJECT_NAME} PRIVATE
        ${MSFS_SDK}/SimConnect\ SDK/lib
    )
    target_link_libraries(${PROJECT_NAME} PRIVATE SimConnect)

    target_compile_options(${PROJECT_NAME} PRIVATE
        -Wall -Wextra -Wno-unused-parameter
    )
endif()

# ── Output directory ─────────────────────────────────────

set_target_properties(${PROJECT_NAME} PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/out"
)
