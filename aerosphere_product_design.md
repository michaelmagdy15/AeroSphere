# AeroSphere: Unified Co-Op, Career, & Performance Suite for MSFS

## 1. Product Vision
Many flight simulation enthusiasts are reluctant to install separate, single-purpose add-ons that compete for SimConnect bandwidth and complicate startup workflows. **AeroSphere** is designed as a unified, all-in-one companion utility that solves three major pillars of the MSFS experience:
1. **Dynamic Graphics Optimization (Dynamic LOD):** Dynamically scales terrain/object level of detail (TLOD/OLOD) and clouds based on altitude and target FPS to maximize visual fidelity in cruise and preserve frame rates on the ground.
2. **Smart Shared Cockpit:** Low-latency co-op flight deck synchronization with automatic profile generation (APG) for complex aircraft.
3. **Multi-Crew Career Mode:** An economy engine supporting both Solo and Co-Op flights, enabling friends to fly as Pilot Flying (PF) and Pilot Monitoring (PM) to earn shared revenue, build airline bases, and manage schedules.

---

## 2. System Architecture

AeroSphere runs as an external desktop application (e.g., C++/Go backend with a React frontend) communicating with a custom WASM module injected into the simulator.

```mermaid
graph TD
    subgraph AeroSphere Client [Desktop App]
        Core[AeroSphere Core Engine]
        UI[React Desktop UI]
        DB[Local SQLite Database]
        Net[P2P WebRTC / WebSocket Client]
    end

    subgraph MSFS Process
        WASM[AeroSphere WASM Module]
        SimC[SimConnect API]
    end

    subgraph Cloud Backend
        API[AeroSphere Central Server]
        CareerDB[(Global Economy & Co-Op Sync)]
        ProfileDB[(Aircraft Profile Registry)]
    end

    UI <--> Core
    Core <--> DB
    Core <-->|SimConnect | SimC
    Core <-->|WASM Hook (L-Vars)| WASM
    Core <-->|Cloud API| API
    Net <-->|Peer-to-Peer Sync| Net
    API <--> CareerDB
    API <--> ProfileDB
```

---

## 3. Pillar 1: Dynamic Graphics Optimizer (Dynamic LOD)

### The Problem
At high altitudes, low TLOD results in blurry ground textures and flat terrain, but high TLOD (e.g., 400+) is easily handled by the CPU since there are few models to render. On the ground at busy airports, high TLOD causes severe CPU main-thread bottlenecks and stutters.

### The Solution
AeroSphere continuously monitors the simulator telemetry and dynamically adjusts settings during flight:
*   **Altitude-Based Scaling:** Automatically raises TLOD linearly as the aircraft climbs (e.g., TLOD 100 on the ground, scaling to TLOD 600+ above 20,000 feet).
*   **FPS-Gated Safety Valve:** If the frame rate drops below a user-defined threshold (e.g., 35 FPS), the app dials back TLOD and Cloud settings to restore smooth performance.
*   **Vertical Speed Awareness:** Reduces settings early during rapid descents to prepare the CPU for landing at complex airports.

```
       +--------------------------------------------+
       |   Read Sim telemetry (Alt: 24,000 ft, FPS: 42)  |
       +---------------------┬----------------------+
                             ▼
       +--------------------------------------------+
       |   Calculate Target TLOD (Alt Target: 500)   |
       +---------------------┬----------------------+
                             ▼
            Is FPS >= Target (e.g., 40 FPS)?
                   /                 \
                 Yes                  No
                 /                     \
  Set TLOD to 500              Set TLOD to 350 (Throttle down)
```

*   **Technical Implementation:** The app writes directly to the active MSFS process memory offsets for TLOD/OLOD (a technique used by tools like *Dynamic LOD* to change settings in real-time without reloading the simulator) or hooks into official SDK parameters as they expand in MSFS 2024.

---

## 4. Pillar 2: Smart Shared Cockpit

*   **P2P Network Core:** Utilizes WebRTC DataChannels for direct, low-latency communication between the two pilots. This bypasses central servers, reducing synchronization lag below 50ms.
*   **APG (Adaptive Profile Generator):** Runs a differential variable watcher. When either pilot clicks a cockpit switch, the app captures variable state changes, automatically mapping custom local variables (L-Vars, B-Events, H-Vars) to standard cockpit controls on the fly.
*   **Aircraft Profiles Cloud:** Download verified aircraft profiles created by other users from the AeroSphere Cloud registry for instant compatibility with complex payware (PMDG, Fenix, FlyByWire).

---

## 5. Pillar 3: Multi-Crew Co-Op Career Mode

AeroSphere features a fully integrated aviation career and airline economy simulation.

### Single-Pilot vs. Shared Cockpit Integration
Users can perform career missions in two distinct modes:

1.  **Shared Cockpit Mode (Co-Op):**
    *   **Pilot Flying (PF):** Handles the physical yoke, rudder, and direct flight maneuvers. Earns flight hours and piloting experience points.
    *   **Pilot Monitoring (PM):** Manages checklists, flight computer (FMC) inputs, and radios. Earns crew experience and monitoring points.
    *   **Shared Company Pay:** The revenue earned from delivering passengers or cargo is deposited into the shared virtual airline account, and both pilots receive their respective contract pay.
2.  **Solo Mode:**
    *   The user flies alone. To simulate crew resource management, they can hire **AI Co-pilots** from the recruitment market. Higher-tier AI co-pilots manage checklists and radio transitions with fewer errors but cost a higher hourly rate.

### Career Features (Distilled from Wishlist)
*   **Virtual Airline Bases:** Purchase bases at preferred airports. Maintenance at home bases is discounted, and you can see your offline fleet parked at the gates.
*   **Real-Time Dynamic Economy:** Fuel pricing updates dynamically based on real-world aviation fuel indices. Landing and ground handling fees vary depending on airport size and your airline's local reputation.
*   **Dynamic Mission Generator:** Instead of static lists, missions (Charter, Cargo, Passenger, MedEvac) are generated procedurally based on the aircraft's current location, meaning you must fly the aircraft to the next starting point (no unrealistic teleportation).
*   **Company Management:** Hire additional pilots, set flight schedules, lease aircraft, and design custom liveries/logos.

---

## 6. Implementation Strategy

To ensure feasibility and avoid project bloat, build in structured checkpoints:

| Phase | Milestone | Key Features |
| :--- | :--- | :--- |
| **Phase 1** | Performance & Telemetry | Build the SimConnect bridge. Implement the **Dynamic Graphics Optimizer** (DLOD). This builds trust with a wider audience who just want FPS improvements. |
| **Phase 2** | P2P Synchronization | Integrate WebRTC networking. Synchronize position, attitude, and simple controls between two default aircraft (Shared Cockpit Core). |
| **Phase 3** | Smart Profiles (APG) | Develop the L-Var state-diffing system to auto-map complex airliner switches without hardcoding. |
| **Phase 4** | Career & Economy | Deploy the SQLite-based career database, procedurally generated missions, and co-op company bases. |
