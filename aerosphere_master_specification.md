# AeroSphere Studio: Comprehensive Master Product Specification
*A Unified Co-Op, Career, & Performance Suite for Microsoft Flight Simulator*

---

## 1. Executive Summary & Vision
**AeroSphere Studio** is the ultimate all-in-one companion utility for Microsoft Flight Simulator. Historically, simmers have had to install separate, single-purpose add-ons for multiplayer shared cockpit, performance tuning, and career progression. This clutter leads to SimConnect bandwidth contention, high memory usage, and fragmented UI/UX.

AeroSphere Studio solves this by combining three highly-demanded community pillars into a single, high-performance desktop application:
1. **Pillar 1: Smart Shared Cockpit (P2P)** — Zero-configuration, low-latency cockpit state sync with auto-learned aircraft profiles.
2. **Pillar 2: Dynamic Graphics Optimizer (Dynamic LOD)** — Dynamic, real-time adjustments of terrain LOD, object LOD, and clouds based on target FPS, altitude, and flight phase.
3. **Pillar 3: Multi-Crew Career Mode** — A persistent airline economy where users can fly solo (with hired AI co-pilots) or together (in shared cockpit co-op) to build global bases, purchase fleets, and manage schedules.

---

## 2. In-Depth Feature Specification

### Pillar 1: Smart Shared Cockpit
Built to replace legacy peer-to-peer hacks, this module synchronizes the flight decks of complex, high-fidelity payware aircraft.

*   **Adaptive Profile Generator (APG):** Real-time "Record & Map" mode. Users flip switches in the cockpit; the app reads the variable delta ($\Delta V$) via WASM and instantly generates the mapping.
*   **Systems & FMC Synchronization:**
    *   *Dual FMC/MCDU Sync:* Captures and syncs active flight plans, performance inputs, and lateral/vertical constraints.
    *   *Display Controls:* Syncs EFIS range selectors, ND modes, and brightness knobs.
    *   *Autopilot Handshake:* Shared control loop. Prevents both yokes from competing by assigning Pilot Flying (PF) or Pilot Monitoring (PM) priority.
*   **Dual-Control Input Blending:** Custom algorithms blend physical inputs from both pilots (yoke, throttles, rudders) or allocate absolute control to the pilot holding the "Takeover" priority button.
*   **Integrated Intercom (VoIP):** Low-latency, peer-to-peer voice channel with realistic radio crackle, engine noise dampening, and VHF headset effects.
*   **Session Management:**
    *   *Jumpseat Observer Mode:* Allows a third player to spectate the flight with a free-look camera inside the cockpit.
    *   *Live Hot-Swap:* Allows a player to connect to an active flight in mid-cruise, instantly downloading the aircraft's state.

---

### Pillar 2: Dynamic Graphics Optimizer (Dynamic LOD)
Designed to resolve CPU main-thread bottlenecks at busy airports while maximizing visual draw distance at high altitudes.

*   **Active Loop FPS Controller:** The user sets a **Target FPS** (e.g., 40 FPS in 2D, 30 FPS in VR). The app monitors simulator frame pacing and dynamically scales graphics variables to maintain the target.
*   **Exposed Settings Control:** Adjusts **TLOD** (Terrain Level of Detail), **OLOD** (Object Level of Detail), and **Cloud Quality** (Ultra/High/Medium/Low) in real-time.
*   **Flight Phase & AGL Profiles:**
    *   *Ground/Taxi Mode:* Drops TLOD (e.g., to 100) to keep FPS high. However, to prevent ground texture/taxi line blurriness, it features a "High-Res Ground Poly" threshold to keep minimum TLOD clamp at a level that retains custom markings.
    *   *Low & Slow (GA) Mode:* Optimized for low altitudes, keeping OLOD high to render trees and buildings, while keeping TLOD moderate.
    *   *High Cruise Mode:* Scales TLOD up to 1000+ at FL300 to render sharp distance horizons and mountain ranges.
    *   *Approach Mode:* Triggers early reduction of LODs upon starting descent (based on vertical speed and distance to destination) to prepare the CPU for dense airport rendering.
*   **VR vs. 2D Profiles:** Automatic switching between separate graphics profiles depending on whether the user is in Virtual Reality or 2D monitor mode.

---

### Pillar 3: Multi-Crew Career Mode
An immersive airline and charter career mode with built-in co-op capabilities.

*   **Co-Op Flight Economy:**
    *   *PF/PM Split:* The pilot flying (PF) receives flight hours and manual piloting experience. The pilot monitoring (PM) receives crew management and navigation points.
    *   *Airline Revenue:* Passenger ticket sales and cargo revenues are deposited into the company's shared cloud vault.
*   **Hirable AI Co-pilots:** When flying solo, the player can recruit AI co-pilots from a marketplace.
    *   *Experience vs. Risk:* Cheaper co-pilots make mistakes (e.g., late checklists, wrong radio readbacks). High-tier captains operate flawlessly but demand high hourly rates.
    *   *Insurance Model:* Accidents or hard landings raise your company's insurance premiums (billed every 24 hours).
*   **Company Bases & Offline Fleet:**
    *   Purchase hangars and offices at home airports.
    *   *Fleet Visibility:* Housed aircraft are rendered parked at your airline's gates in the simulator.
    *   *Base Maintenance:* Repairs at your home base are cheaper and faster.
*   **Procedural Economy & Logistics:**
    *   *Fluctuating Fuel Costs:* Dynamic pricing modeled on real-world aviation fuel indices at each airport.
    *   *Airport Fees:* Landing, ground handling, and ATC usage fees that decrease as your company's reputation at that specific airport grows.
    *   *Procedural Missions:* Dynamic routing (Cargo, Charter, MedEvac). Players must physically fly the aircraft to the next airport to start a new mission (no instant teleports).

---

## 3. Technical Architecture Specification

AeroSphere Studio integrates with MSFS using an external desktop client and a WebAssembly (WASM) module.

```
       +-----------------------------------------------------------+
       |                  AeroSphere UI (React)                    |
       |      (Career Dashboard, Graphics Profiles, P2P Status)    |
       +-----------------------------┬-----------------------------+
                                     ▼
       +-----------------------------------------------------------+
       |                 AeroSphere Core (C++/Go)                  |
       +──────┬──────────────────────┬──────────────────────┬──────+
              │                      │                      │
              ▼                      ▼                      ▼
       +──────────────+      +──────────────+      +──────────────+
       |  SimConnect  |      |  WASM Module |      |  WebRTC P2P  |
       |  Connection  |      |   Variable   |      |  DataChannel |
       |  (Telemetry) |      |  Interceptor |      | (Voice/Sync) |
       +──────┬───────+      +──────┬───────+      +──────┬───────+
              │                     │                     │
              +─────────────────────┼─────────────────────+
                                    ▼
                          [ MSFS Flight Engine ]
```

### 1. WebRTC Peer-to-Peer Sync Engine
*   **Transport Protocol:** WebRTC DataChannels over UDP. Direct connection between host and guest client.
*   **State Delta Syncing:** Rather than broadcasting the entire cockpit state continuously, the client only transmits *state change packets* (deltas) whenever a variable is modified.
*   **Voice Intercom:** Integrated Opus audio codec running directly over the P2P connection to minimize latency.

### 2. WASM Variable Interception
*   **L-Var Read/Write:** A custom WASM gauge is loaded via the `panel.cfg` of the aircraft. It communicates with the external AeroSphere Core using client-side named pipes or memory-mapped files.
*   **B-Event & H-Event Injection:** Emulates mouse clicks and cockpit inputs directly by calling the MSFS Gauge API.

### 3. Process Memory Patcher (LOD Engine)
*   **Real-time LOD Scaling:** In MSFS 2020, LOD sliders in the UI are bound to specific variables in the game's active heap. The C++ backend reads simulator memory addresses to write new TLOD and OLOD values dynamically on every frame. In MSFS 2024, it communicates via the official SDK bindings.

---

## 4. UI/UX Structure (Premium Dark-Glass Aesthetics)

AeroSphere Studio utilizes a modern, dark-glassmorphism theme built on CSS HSL tailoring andOutfit typography, reflecting a premium engineering tool.

### Main Navigation Tabs:
1.  **Dashboard:** Live flight status, network ping, active FPS, and dynamic LOD scaling meters.
2.  **Performance (Dynamic LOD):** Setup target FPS, min/max limits, cloud quality transitions, and test AGL profiles.
3.  **Flight Deck (Co-Op Sync):** WebRTC connection panel (Join Code generator), active aircraft profile loader, and switch "Auto-Learn" tool.
4.  **Career (Virtual Airline):** Financial logs, hired pilots, base manager, route scheduler, and available procedural missions.

---

## 5. Phase-Gated Implementation Plan

To launch all three features together successfully, development must be divided into parallel workstreams, culminating in a unified beta release:

### Workstream A: Performance (Dynamic LOD Engine)
*   **Milestone A1:** Memory scanner and pointer finder for MSFS process memory (TLOD/OLOD offsets).
*   **Milestone A2:** Implement target-FPS feedback loop algorithm (PID controller style) to scale LOD parameters smoothly.

### Workstream B: Networking (Smart Shared Cockpit)
*   **Milestone B1:** Integrate WebRTC library and create connection code system.
*   **Milestone B2:** Build WASM module for local variable injection (L-Vars, B-Events).
*   **Milestone B3:** Code the "Auto-Learn" state-diffing dashboard.

### Workstream C: Logistics (Career Mode Engine)
*   **Milestone C1:** Build SQLite database schema for local carrier tracking and cloud sync API.
*   **Milestone C2:** Code procedural route and mission generator using real-world airport databases.
*   **Milestone C3:** Build company base management and AI crew marketplace.

---

## 6. Community Launch Strategy (YouTube Campaign)
With an established YouTube audience, launch AeroSphere Studio as a single massive release:
*   **The Hook:** "One App to Replace Four: Dynamic LOD, Shared Cockpit, and a Global Career Mode."
*   **Beta Access:** Release a free, limited public beta to channel subscribers to gather telemetry data, aircraft profiles, and build hype.
*   **Crowdsourced Launch:** Leverage the first wave of users to populate the Cloud Profile Database, ensuring that by release day, all major aircraft are pre-mapped and work out of the box.
