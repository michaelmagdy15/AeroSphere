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
- Ran `npm run typecheck`: Successfully passed with `0` type errors.
- Ran `npm run build`: Successfully built all bundles (Main process with embedded assets, Preload, and Renderer React application) without errors.

