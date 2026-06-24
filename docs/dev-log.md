# AeroSphere Studio — Development Log

## 2026-06-24 — SimConnect & Type Compilation Phase

### Context
AeroSphere Studio compiles fully using TypeScript strict mode. The remaining typecheck and runtime errors were successfully resolved by aligning the SimConnect wrapper integration with the actual callback signatures and data parsing behaviors of the `node-simconnect` library.

### Decisions & Implementation Detail

#### 1. Input Event Enumeration (`InputEventEnumerator.ts`)
- **Discovery**: The `node-simconnect` connection emits the `'inputEventsList'` event (passing `RecvEnumerateInputEvents`) when input events are enumerated, rather than the event `'enumerateInputEvents'`.
- **Action**: Changed listeners to listen to `'inputEventsList'`.
- **Parsing**: `RecvEnumerateInputEvents` stores event descriptors in `inputEventDescriptors` where each descriptor has `inputEventIdHash` (a `bigint`) and `name` (a `string`). Updated `onEnumerateResult` to correctly map these fields into our local cache.
- **Subscription**: The connection method `subscribeInputEvent` accepts only a single argument `(inputEventHashID: bigint): number`. The previous implementation was passing an extra Request ID parameter. Removed the extra argument to match the correct signature.

#### 2. L-Var ClientData Sync (`LVarBridge.ts`)
- **Discovery**: The `'clientData'` event emits a `RecvSimObjectData` instance. The raw payload buffer is stored in `data.data`, which is a `RawBuffer` wrapper.
- **Action**: Modified `onClientData` to receive the `RecvSimObjectData` instance, extract the payload using `data.data.readBytes(data.data.remaining())` to get a standard Node `Buffer`, and then dispatch it to `handleLVarResponse` and `handleStateBroadcast`.

#### 3. Telemetry Stream (`SimConnectManager.ts`)
- **Discovery**: In `node-simconnect`, `simObjectData` events return binary streams. The data must be read sequentially using `RawBuffer` methods (like `readFloat64` and `readInt32`) in the exact order in which they were registered via `addToDataDefinition`.
- **Action**: Updated `handleSimObjectData` to receive the `RecvSimObjectData` object, extract `data.data`, and read the registered telemetry properties sequentially:
  1. `PLANE ALTITUDE` (FLOAT64)
  2. `VERTICAL SPEED` (FLOAT64)
  3. `SIM ON GROUND` (INT32)
  4. `AIRSPEED INDICATED` (FLOAT64)
  5. `HEADING INDICATOR` (FLOAT64)
  6. `PLANE LATITUDE` (FLOAT64)
  7. `PLANE LONGITUDE` (FLOAT64)
  8. `SIM DISABLED` (INT32)
  9. `SIMULATION RATE` (FLOAT64)

#### 4. Embedded Database Migrations & JSON Seeding (`CareerDatabase.ts`)
- **Discovery**: In dev/production packages bundled by `electron-vite`, non-JavaScript files (such as `.sql` migrations and `.json` seed assets) are not copied to `dist/` by default. This prevented `CareerDatabase.runMigrations()` and `seedData()` from locating these files at runtime, which blocked database initialization.
- **Action**: 
  - Embedded all six SQL migration steps directly as an array of static SQL strings (`MIGRATIONS`) inside `CareerDatabase.ts`.
  - Imported `aircraft_types.json` directly using TypeScript's `resolveJsonModule` feature, letting the bundler inline the JSON array natively into the main process bundle.
  - Rewrote `runMigrations()` and `seedData()` to consume these in-memory data structures, eliminating all relative filesystem reads.

### Verification
- **Compilation Workaround**: Added the `/Zc:strictStrings-` option inside the `binding.gyp` targets for `memoryjs` to bypass MSVC compilation errors caused by strict string literal pointer conversions on Visual Studio 2022.
- **Rebuild Native Addons**: Run `npx electron-rebuild -f -w memoryjs` completed successfully with `0` errors, creating the binary `memoryjs.node` compiled for Electron.
- Ran `npm run typecheck`: Successfully passed with `0` type errors.
- Ran `npm run build`: Successfully built all bundles (Main process with embedded assets, Preload, and Renderer React application) without errors.

#### 5. Cloud Run Profiles API Deployment
- **Deployment**: Configured and deployed the `aerosphere-profiles` service to Google Cloud Run under the `bengarab` project.
- **Port Mapping**: Explicitly bound the container port `--port 8080` to resolve Buildpacks Dockerfile detection conflicts.
- **URL**: `https://aerosphere-profiles-430356395102.us-central1.run.app`
- **Firestore**: Successfully linked to the `db-aerosphere` database.
## 2026-06-24 — Built-in Auto-Updater & v0.2.1 Release Phase

### Context
Implemented a built-in application auto-updater that downloads updates in the background and notifies the user with a premium glassmorphic toast before applying. Resolved critical startup blocks and wired real-time telemetry to the header controls.

### Decisions & Implementation Detail

#### 1. Real-Time Telemetry Header Wiring
- **Action**: Modified `App.tsx` to consume telemetry from the `useSimConnect` and `useLOD` hooks, dynamically passing `simConnected`, `lodState.currentFPS`, and `telemetry.altitude` to the `<Header />` component, replacing the previous static/hardcoded status values.

#### 2. Preload API & Hook Alignment
- **Discovery**: React hooks in the renderer call generic `window.aerosphere.invoke`, `on`, and `off` functions, but `preload.ts` context bridge only exposed specific subsystem endpoints. This resulted in runtime undefined errors when accessing IPC.
- **Action**: Updated `preload.ts` to expose generic `invoke`, `on`, and `off` methods, maintaining a local listener callback mapping to cleanly subscribe and unsubscribe event handlers without memory leaks.

#### 3. Firebase Auth Initialization Block
- **Discovery**: In development mode, the app was stuck on a dark loading spinner. The main process threw an unhandled rejection because `FirebaseAuthManager` attempted to initialize Firebase with empty environment variables (`process.env.FIREBASE_API_KEY ?? ''`), which blocked IPC handlers from registering.
- **Action**: Modified `FirebaseAuthManager.ts` to import and fall back to the default bundled `FIREBASE_CONFIG` when environmental overrides are absent, allowing compilation and startup in both dev and production.

#### 4. Preload Path Resolution
- **Discovery**: The BrowserWindow configuration was looking for `../preload/index.js`, but the packaging build compiled `preload.ts` to `../preload/preload.js`.
- **Action**: Updated the preload path inside `src/main/index.ts` to point to the correct output file `preload.js`.

#### 5. Installer File Naming Auto-Updater Alignment
- **Discovery**: `electron-builder` sanitizes spaces in update manifests (`latest.yml`), pointing to `AeroSphere-Studio-Setup-0.2.1.exe`, but outputs the installer binary using the product name with spaces (`AeroSphere Studio Setup 0.2.1.exe`). This would lead to a 404 download error in the auto-updater.
- **Action**: Renamed the local executable to `AeroSphere-Studio-Setup-0.2.1.exe` prior to staging and uploading to ensure update URLs resolve correctly.

### Verification & Releases
- Ran `npm run typecheck`: Completed successfully with `0` errors.
- Ran `npm run build`: Completed successfully.
- Ran `npx electron-builder` to package installer `0.2.1`.
- Committed, tagged `v0.2.1`, pushed, and uploaded `AeroSphere-Studio-Setup-0.2.1.exe` and `latest.yml` to the GitHub release.

