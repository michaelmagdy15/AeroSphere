# AeroSphere Studio — Obsidian Session Sync & Handoff

- **Date**: 2026-06-24
- **Current Branch**: `master` (Tracked at [github.com/michaelmagdy15/AeroSphere](https://github.com/michaelmagdy15/AeroSphere.git))
- **Status**: 🟢 Clean Compilation (`0` Type Errors) & Successful Bundling (`npm run build`)

---

## 🎯 Project Overview
**AeroSphere Studio** is a high-fidelity desktop utility for Microsoft Flight Simulator 2024. It combines:
1. **Dynamic LOD Engine (Free)**: Real-time PID-controlled LOD adjustment.
2. **Shared Cockpit (Pro)**: Co-op variable sync and VoIP.
3. **Career Mode (Pro)**: Economics, flight log, fleet manager, and procedural missions.

---

## 🔒 Key Decisions & Ground Truths

### Firebase Configuration
The app targets a **named Firestore database instance** (`db-aerosphere`) rather than the default one.
* **Config Location**: `src/shared/firebase-config.ts`
* **Project ID**: `faa-test-guide-v2`

### Embedded Database Migrations & JSON Seeding
* **Discovery**: Relocating SQL files and JSON seed data in the packaged app bundle is fragile since bundlers (like `electron-vite`) exclude non-JS files by default.
* **Fix**: Embedded all six migrations directly into `CareerDatabase.ts` inside a static `MIGRATIONS` array, and imported `aircraft_types.json` natively so the compiler inlines the database seed data.

### SimConnect API Alignment
* **Input Events**: `enumerateInputEvents` callbacks listen to `'inputEventsList'` rather than `'enumerateInputEvents'`. Descriptor structures use `inputEventIdHash` (bigint) and `name`.
* **Telemetry**: SimConnect's telemetry updates return raw binary streams (`RawBuffer`) rather than objects. We read them sequentially using `readFloat64` and `readInt32` in the precise registration order:
  1. `PLANE ALTITUDE` (FLOAT64)
  2. `VERTICAL SPEED` (FLOAT64)
  3. `SIM ON GROUND` (INT32)
  4. `AIRSPEED INDICATED` (FLOAT64)
  5. `HEADING INDICATOR` (FLOAT64)
  6. `PLANE LATITUDE` (FLOAT64)
  7. `PLANE LONGITUDE` (FLOAT64)
  8. `SIM DISABLED` (INT32)
  9. `SIMULATION RATE` (FLOAT64)

---

## 📂 Codebase Reference

- [CareerDatabase.ts](file:///C:/Users/Mi5a/Documents/antigravity/joyful-shannon/src/main/career/CareerDatabase.ts) — Database manager with embedded migrations & JSON seed.
- [InputEventEnumerator.ts](file:///C:/Users/Mi5a/Documents/antigravity/joyful-shannon/src/main/simconnect/InputEventEnumerator.ts) — Discovers and triggers MSFS 2024 input events.
- [LVarBridge.ts](file:///C:/Users/Mi5a/Documents/antigravity/joyful-shannon/src/main/simconnect/LVarBridge.ts) — Syncs variables using WASM client data areas.
- [SimConnectManager.ts](file:///C:/Users/Mi5a/Documents/antigravity/joyful-shannon/src/main/simconnect/SimConnectManager.ts) — Real-time telemetry receiver.
- [WASMInstaller.ts](file:///C:/Users/Mi5a/Documents/antigravity/joyful-shannon/src/main/wasm-installer/WASMInstaller.ts) — Auto-detects and installs C WASM gauges into the MSFS Community folder.

---

## 🔮 What's Remaining for Production Readiness

### 1. Rebuild C++ Native Addon (`memoryjs`)
Since the user machine lacks the C++ compile tools, `memoryjs` failed to compile during `npx electron-rebuild`. 
* Run this command in an **Administrator Command Prompt** to install compile tools:
  ```powershell
  winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive --norestart"
  ```
* Once installed, restart your terminal and run the rebuild:
  ```bash
  npx electron-rebuild -f -w memoryjs
  ```

### 2. Compile the WASM Module
* Locate the C source gauge inside `wasm-module/`.
* Use the MSFS SDK / LLVM toolchain to compile it into `wasm-module/PackageSources/` so it is ready to install via the app's auto-detection.

### 3. Deploy Cloud Services
* **Signaling Server** (`cloud-signaling/`) and **Profile API** (`cloud-profiles/`) need to be deployed to Google Cloud Run.
* Map a secure URL for WebSockets (`wss://`) and Firestore connections.
