# Microsoft Flight Simulator: Shared Cockpit Multiplayer Analysis

## Introduction
The ability to fly a single aircraft with two or more human pilots sharing a cockpit (co-pilot/multi-crew) is one of the most requested features in the flight simulation community. Since the release of Microsoft Flight Simulator (2020) and extending into Microsoft Flight Simulator 2024, the lack of a **native, out-of-the-box shared cockpit system** has generated significant discussion, feature requests, and community-led engineering efforts.

This document analyzes the community requirements, technical architectures, challenges (such as latency, SimConnect limitations, and variables synchronization), and current solutions available to flight simulation enthusiasts.

---

## Community Requirements & Motivation
The MSFS forum wishlist thread highlighted several core motivators for why a shared cockpit is a crucial feature:
1. **Flight Instruction & Training:** Real-world flight instructors (CFIs) and virtual instructors rely heavily on shared cockpits to teach procedures, instrument flight rules (IFR), and emergency checklists in real-time.
2. **Divided Workload (Multi-Crew Operations):** Flying complex commercial airliners (e.g., Airbus A320, Boeing 737) requires division of labor between the Pilot Flying (PF) and the Pilot Monitoring (PM). Managing the autopilot, checking lists, handling ATC communications (especially on networks like VATSIM or IVAO), and flying manually is far more realistic when split.
3. **Co-Op & Social Engagement:** The social aspect of sharing a long flight deck with a friend, managing systems together, or acting as a co-pilot has been highly popular since the days of FSX.

---

## The Technical Challenge
Implementing shared cockpit functionality is notoriously difficult due to the underlying architecture of modern simulators and the complexity of current aircraft models.

```mermaid
graph TD
    subgraph Host PC [Pilot Flying (PF)]
        MSFS_PF[MSFS Sim Engine]
        YC_PF[YourControls / Co-Op Client]
        Control_PF[Physical Joysticks/Yokes]
    end

    subgraph Peer PC [Pilot Monitoring (PM)]
        MSFS_PM[MSFS Sim Engine]
        YC_PM[YourControls / Co-Op Client]
        Control_PM[Physical Joysticks/Yokes]
    end

    Network{Internet / Sync Server}

    Control_PF -->|Direct Input| MSFS_PF
    MSFS_PF <-->|SimConnect API| YC_PF
    YC_PF <-->|P2P / Relay Sync| Network
    Network <-->|P2P / Relay Sync| YC_PM
    YC_PM <-->|SimConnect API| MSFS_PM
    Control_PM -->|Direct Input| MSFS_PM
```

### 1. Architectural Differences: FSX vs. MSFS
*   **FSX (Peer-to-Peer):** Microsoft Flight Simulator X featured native shared cockpit support because its multiplayer model was built around peer-to-peer connections. The simulator could lock the state of two aircraft directly over a LAN or direct WAN connection.
*   **MSFS (Server-Client):** MSFS runs on a cloud-based server-client architecture. The game servers distribute generic multiplayer aircraft locations, weather data, and traffic, but do not synchronize the deep internals of an aircraft's flight deck.

### 2. SimConnect & WASM Overhead
Third-party tools must interface with MSFS using the **SimConnect API** or **WASM (WebAssembly) gauges**. 
*   **Bandwidth Limitations:** SimConnect was not originally designed to stream hundreds of local cockpit variables at high frequencies (up to 60 times a second).
*   **Main Thread Bottlenecks:** SimConnect operations run on the simulator's main thread. If a shared cockpit tool queries or sets too many variables simultaneously, it can trigger CPU bottlenecks, leading to visible stutters and framerate drops.

### 3. Variable Synchronization (A, L, H, B Vars)
In basic FSX aircraft, switches were bound to standard simulator variables (A-Variables). Modern MSFS add-on airliners (e.g., PMDG 737, Fenix A320) use highly customized gauge code, custom local variables (**L-Vars**), input events (**H-Vars** or **B-Vars**), and internal logic engines.
*   **Profile Dependency:** For a shared cockpit tool to work, developers must write custom profiles mapping every single switch, button, knob, and display coordinate to its counterpart in the other pilot's simulator. If one variable is missed, a switch flipped by the captain will not register for the first officer.

### 4. Latency & Physics Conflict
Because two separate physical computers are running distinct physics simulations of the same aircraft, minor network latency can cause severe desynchronizations:
*   **Jitter and Shaking:** If both simulators try to calculate the aircraft's precise GPS position independently, they will slightly disagree due to wind shifts or turbulence. This causes the aircraft to jitter or shake as the sync tool constantly tries to align the coordinates.
*   **Autopilot Fighting:** If both pilots have their autopilots engaged, the two simulators might send conflicting control surface commands, causing a feedback loop that crash-stresses the aircraft.

---

## Current Solutions

Due to the lack of native support, the community relies on several standalone solutions and workarounds:

| Solution | Type | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **YourControls** | P2P / Server Relay Sync | Free, open-source, highly customizable, support for many popular default and payware aircraft. | Complex setup, prone to profiles breaking after aircraft updates, requires port-forwarding or cloud relay. |
| **FSCopilot** | Co-Op Client | Lightweight, designed with modern MSFS architecture in mind, fast synchronization. | Focuses on specific aircraft, requires active configuration. |
| **Multi Crew Experience (MCE)** | Voice-Controlled AI Co-pilot | Works offline, extremely immersive, handles radio/checklists dynamically via speech recognition. | Single-player only (you interact with an AI first officer, not a human friend). |
| **FS2Crew** | Scripted / Voice AI Co-pilot | Tailored specifically to high-fidelity airliners (PMDG, Fenix, FlyByWire), accurate airline SOPs. | AI co-pilot only, paid expansion per aircraft model. |

---

## Best Practices & Troubleshooting for Shared Cockpit Sessions

To achieve a stable shared cockpit session and minimize latency, users should implement the following optimizations:

### Network & Settings Configurations
> [!IMPORTANT]
> **Disable MSFS Native Multiplayer:** To prevent the simulator from rendering two overlapping copies of your aircraft, turn off the native multiplayer option in the MSFS settings, or configure your group to use separate servers.
*   **Use Direct Connections (IPv4):** If both pilots have stable connections and can configure port forwarding, direct P2P connection bypasses public relay servers, reducing latency significantly.
*   **Disable Crash Physics:** Turn off aircraft stress and crash damage in the MSFS assistance settings to prevent desync jitters from triggering an accidental "Crash" screen.

### Simulator Optimization
> [!TIP]
> **Lower Level of Detail (LOD) Sliders:** Shared cockpit applications put heavy strain on the SimConnect thread. Lowering **Terrain LOD** and **Object LOD** settings frees up CPU headroom for the main thread, smoothing out incoming state updates.
*   **Limit AI Traffic:** High AI traffic injects hundreds of additional variables into SimConnect. Set AI traffic to minimum or off during shared cockpit operations.

### Cockpit Etiquette
*   **One Pilot Flying (PF) Rule:** Only one pilot should manipulate control inputs (yoke, throttles, rudder) at any given time.
*   **Deliberate Switch Flipping:** Avoid spamming knobs (like rotating the autopilot altitude selector rapidly). Rotate them incrementally to give the sync software time to queue and transmit the packets without overflow.
*   **Verify Versions:** Ensure both players have the exact same version of the simulator, the aircraft, the livery, and identical community mods/scenery installed.

---

## The Road Ahead: MSFS 2024
While MSFS 2024 introduces advanced multiplayer group setups, career co-op mechanics, and improved SDK access, **native shared-cockpit multi-crew remains a third-party domain**. However, the modernization of the SDK in MSFS 2024 (using WASM and better data management) makes it easier for tools like FSCopilot and YourControls to access variables more reliably, promising smoother experiences for future co-op flights.
