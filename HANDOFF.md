# AeroSphere Studio — Development Handoff

> **Read this file first in every new session.**
> Last updated: 2026-06-24T10:49:00Z

## What Is This Project?
AeroSphere Studio is a premium Electron app for MSFS 2024 with 3 pillars:
1. **Dynamic LOD** (Free) — PID-controlled graphics settings
2. **Shared Cockpit** (Pro) — WebRTC co-op flying with auto-learning profiles
3. **Career Mode** (Pro) — Procedural missions, economy, fleet management

## Key Facts
- **MSFS 2024 only** (no 2020)
- **No VR** at launch
- **Freemium** — LOD free, Cockpit + Career = Pro
- **Firebase**: Project `faa-test-guide-v2`, Firestore DB name: `db-aerosphere`
- **Cloud**: Google Cloud Run for signaling + profiles API
- **Design**: Dark glassmorphism, Outfit font, OKLCH HSL colors, backdrop-filter blur
- **Auto-install WASM** to Community folder

## What's Built (90+ files)
- ✅ Full Electron main process + SimConnect + Memory Scanner + LOD Engine
- ✅ WebRTC networking (signaling server + PeerManager + VoIP + StateSyncEngine)
- ✅ WASM gauge module (C code: LVarBridge + EventBridge + ClientData IPC)
- ✅ Shared cockpit logic (AutoLearn + SemanticClassifier + ControlAuthority + ProfileManager)
- ✅ Career database (6 SQL migrations + 25 aircraft types seed + CareerDatabase + LandingScorer)
- ✅ Cloud services (signaling server + profile API + Firebase Auth)
- ✅ Full React UI: Design system + Layout + Common components + LOD page + Pages + Settings
- ✅ WASM auto-installer + Settings store

## What's MISSING
1. ~~Career backend~~ ✅ DONE (all 14 files: 6 SQL migrations + seed data + 7 TypeScript modules)
2. **Cockpit UI** (12 files): ConnectionPanel, RoleSelector, AutoLearnPanel, ProfileBrowser, VoIPControls, SyncStatus (each .tsx + .css)
3. **Career UI** (12 files): CareerDashboard, MissionBoard, FlightLog, FleetManager, AircraftShop, BaseMap (each .tsx + .css)
4. **Hooks** (3 files): usePeer, useCareer, useVoIP
5. ~~Default profiles~~ ✅ DONE (cessna172=18 mappings, a320neo=56 mappings, boeing747=51 mappings)
6. **IPC expansion**: Wire cockpit + career channels into preload.ts + handlers.ts
7. **npm install** + **tsc --noEmit** verification
8. **Build test**: npm run build

> NOTE: Two agents (Career Backend Builder, Cockpit & Career UI Builder) may still be
> running and could have created additional files since this handoff was written.
> Run `Get-ChildItem -Recurse -File src\main\career,src\renderer\components\cockpit,src\renderer\components\career,src\renderer\hooks | Select FullName`
> to check for any new files.

## Full walkthrough at:
See `walkthrough.md` in the Antigravity brain directory for the complete 90+ file inventory.
