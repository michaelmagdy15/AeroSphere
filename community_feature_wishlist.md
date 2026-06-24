# Shared Cockpit App: Feasibility & Community Feature Wishlist

## Feasibility Assessment
**Is it possible?**  
Yes, absolutely. Open-source projects like **YourControls** (written in Rust/TypeScript) and commercial utilities like **FSCopilot** have proven that third-party shared cockpit synchronization is achievable on PC using SimConnect and WASM gauges. 

**Is it difficult?**  
Yes, the difficulty is **high (8/10)**. The key challenges you will face are:
1. **Low-level Hooking:** Reading/writing local variables (L-Vars) and HTML/JS variables requires injecting a WASM (WebAssembly) gauge module into the simulator, as standard SimConnect cannot access these out-of-process.
2. **Network Jitter & Dead Reckoning:** You must interpolate the aircraft's position smoothly. If you simply copy raw coordinates, network latency will cause the aircraft to vibrate or teleport.
3. **Autopilot Desync:** Synchronizing internal systems (like hydraulic pressure, electrical buses, and fuel pumps) so that the autopilot doesn't receive conflicting guidance from the two flight models.

---

## Community Feature Wishlist (Scanned from Forum Discussions)

To make the community happy, the app must support the features flight simulation enthusiasts actually need. Below is the checklist of requirements distilled from the MSFS wishlist threads:

### 1. Flight Deck Systems Synchronization
*   **Dual FMC/MCDU Sync:** Both pilots must see changes to the Flight Management Computer in real-time (loading route, entering performance data, modifying constraints).
*   **Shared Displays (EFIS/ND/PFD):** Glass cockpit screens, navigational displays, and map ranges must sync flawlessly.
*   **Electrical & System States:** Engine startup selectors, fuel pumps, cabin pressurization, and hydraulic switches must match across clients.
*   **Synced Weather Radar & Terrain Displays:** Assuring both pilots see identical weather sweeps and terrain warnings.

### 2. Controls & Blending
*   **Dual-Control Input Blending:** If both pilots make control inputs (e.g., pulling back on the yoke), the system should blend the inputs (average them) or allow one pilot to claim priority (similar to the Airbus "Side Stick Priority" system).
*   **Throttle & Flap Detents Sync:** Physical control levers must sync smoothly without fighting local hardware calibrations.

### 3. Voice & Atmosphere
*   **Integrated Intercom (VoIP):** High-fidelity voice communication with cockpit acoustic effects (engine muffling, headset filter).
*   **Radio Transceiver Sync:** Synchronizing radio frequencies (COM1/COM2/NAV1/NAV2) and audio panels. If Pilot A dials a VATSIM frequency, it must update for Pilot B.

### 4. Session Management
*   **Hot-Swapping / Mid-Flight Join:** Allowing a friend to join a flight that is already in cruise, download the current aircraft state, and take over the co-pilot seat.
*   **Observer/Jumpseat Role:** Supporting a third user (or instructor) who can sit in the jumpseat to monitor the flight without control inputs.
*   **Cross-Platform Setup (PC):** Synchronization across Steam and Microsoft Store versions of the simulator.

---

## How to Guarantee Success: Step-by-Step Roadmap

To ensure this project succeeds and does not stall due to technical complexity, adopt an **incremental development path**:

```
┌──────────────────────────────────────┐
│  Phase 1: Simple Position Sync       │ -> Get two planes flying as one
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Phase 2: Input Events (IE) Hooking  │ -> Sync landing gear, lights, flaps
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Phase 3: SmartSync Delta Watcher    │ -> Auto-profile generator (APG)
└──────────────────┬───────────────────┘
                   ▼
┌──────────────────────────────────────┐
│  Phase 4: FMC & Custom L-Vars Sync   │ -> Full airliner multi-crew
└──────────────────────────────────────┘
```

1. **Start with default aircraft:** Build your prototype around the Cessna 152 or Cessna 172. These use standard SimConnect variables that are easy to sync.
2. **Implement B-Event/Input Event sync first:** Modern MSFS 2024 input events are easier to sync than legacy L-Vars. Syncing these will get 80% of switches working out of the box.
3. **Use WebRTC for low latency:** Instead of sending data through a slow cloud server, use WebRTC DataChannels for peer-to-peer variable streaming.
