# SmartSync: Adaptive Profile Generator (APG) for Shared Cockpit

## Objective
To eliminate the need for developers to manually code and map individual cockpit switches (L-Vars, H-Vars, B-Vars, and SimConnect variables) for each aircraft, this system proposes a **smart, automated profile generation architecture**. The system automatically discovers, maps, and validates aircraft system variables by combining **Runtime State-Diffing**, **Static File Scanning**, **Semantic Heuristics**, and **Crowd-Sourced Cloud Mapping**.

---

## Architectural Overview

The system consists of three main engines running on top of a SimConnect/WASM client bridge:

```
┌────────────────────────────────────────────────────────┐
│             Aircraft Directory Scanner                 │
│      (Parses XML behavior, JS gauges, HTML UI)          │
└───────────────────────────┬────────────────────────────┘
                            │ (Discovered Var List)
                            ▼
┌────────────────────────────────────────────────────────┐
│            Differential Telemetry Watcher              │
│       (Detects variable deltas upon click events)      │
└───────────────────────────┬────────────────────────────┘
                            │ (Linked Action -> Variable)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Semantic Heuristic Classifier              │
│     (Fuzzy matches variables to Canonical Controls)    │
└───────────────────────────┬────────────────────────────┘
                            │ (Mapped Profile)
                            ▼
               [ Crowd-Sourced Cloud Registry ]
```

---

## Core Techniques for Auto-Assignment

### 1. Differential Telemetry Monitoring (The "Record & Map" Mode)
Instead of guessing which variable controls a button, the system monitors all simulator variables in real time and detects changes when a user interacts with the cockpit.

*   **How it works:**
    1. The client registers to watch all active **L-Vars** (Local variables) and **Input Events (B-Events / IE)**.
    2. The pilot puts the app into **"Auto-Learn Mode"**.
    3. The pilot clicks a switch in the cockpit (e.g., Captain's APU Start button).
    4. The app captures a snapshot of all variables immediately before and after the click.
    5. The app calculates the **Variable Delta ($\Delta$)**:
       $$\Delta = V_{\text{post}} - V_{\text{pre}}$$
    6. If a variable (e.g., `L:APU_START_SWITCH`) changes from `0` to `1` matching the frame of the click, the system automatically binds that variable to the APU Start action.

*   **Smart Filtering:**
    To prevent false positives (like engine RPM or fuel flow changing continuously), the system filters out rapidly changing floats and variables known to be active telemetry rather than discrete switch inputs.

---

### 2. Static File Parsing (XML & JS Analysis)
Aircraft behaviors in MSFS are defined in standard formats inside the aircraft packages (e.g., `Packages/Official` or `Packages/Community`). The system scans these folders prior to flight.

*   **XML Behavior Scanning:**
    MSFS uses Model Behavior XML files to map 3D cockpit clickspots to variables. The parser scans these XML files looking for `<Component>` blocks containing mouse interactions:
    ```xml
    <!-- Example of what the system parses statically -->
    <Component ID="LIGHTING_Landing_Light_Switch">
        <UseTemplate Name="ASOBO_LIGHTING_Switch_Template">
            <NODE_ID>LIGHTING_Switch_Landing</NODE_ID>
            <ANIM_NAME>landing_light_anim</ANIM_NAME>
            <SIMVAR>LANDING LIGHT SWITCH</SIMVAR>
        </UseTemplate>
    </Component>
    ```
    By parsing these templates, the system extracts the `NODE_ID` and links it directly to the `SIMVAR` or `L-Var` used for animation and logic.

*   **JS/HTML Gauge Parsing:**
    Modern glass cockpits (Garmin G1000, A32NX flyPad) run on HTML/JS. The static analyzer parses files inside the `html_ui/` folder of the aircraft, searching for event handlers (e.g., `SimVar.SetSimVarValue` or `Coherent.call`) to map digital buttons to underlying variables.

---

### 3. Heuristic Semantic Classifier
Once the variables are discovered via static parsing or runtime diffing, they must be mapped to a **Canonical Control Vocabulary** (e.g., mapping `L:FBW_WX_SYS_ON` to a standardized `WEATHER_RADAR_POWER` action).

*   **Fuzzy Matching & RegEx Rules:**
    The classifier uses predefined semantic groups to automatically classify variables:
    ```json
    {
      "CanonicalAction": "LANDING_LIGHTS_TOGGLE",
      "Matches": [
        "*LDG_LT*",
        "*LANDING_LIGHT*",
        "*LIGHT_Landing*"
      ]
    }
    ```
    If an L-Var named `L:A32NX_OVHD_LDG_LT_Toggle` is discovered, the heuristic classifier assigns it to `LANDING_LIGHTS_TOGGLE` with a high confidence score.

*   **Machine Learning Classifiers:**
    For non-standard names, a lightweight local ML classifier (or LLM parser) can evaluate the variable names and code snippets to predict their corresponding cockpit function.

---

### 4. Direct Input Event Hooking (B-Events API)
Introduced in MSFS Sim Update 12 and enhanced in MSFS 2024, the **Input Event API (IE)** exposes high-level cockpit controls directly, bypassing messy L-Vars entirely.

*   **The Paradigm Shift:** Instead of syncing individual variables, the system hooks into `IE:LIGHTING_Landing_1`. Flipping the landing light switch fires this high-level event, which the simulator handles natively.
*   **Auto-Exposure:** The app queries the SimConnect Input Event interface to list all exposed Input Events for the currently loaded aircraft. It can then map them 1-to-1 to the peer client, ensuring a perfect sync out of the box for any aircraft utilizing the new MSFS 2024 standard input system.

---

## Shared Profile Cloud Database (Crowdsourcing)

To make the system truly seamless for end-users, profile mappings should be shared globally.

```
[Pilot A Client]  ──(Auto-learns PMDG 777 Profile)──> [Central Cloud API]
                                                            │
                                                     (Saves & Verifies)
                                                            ▼
[Pilot B Client]  <──(Auto-downloads Profile)──────── [Shared JSON Store]
```

1. **Anonymous Telemetry Sync:** When a user runs "Auto-Learn Mode" and successfully verifies a mapping, the profile JSON is uploaded to a central database.
2. **Voting/Validation:** If multiple users' systems report the same mapping for a particular aircraft title (e.g., `PMDG 777-300ER`), the profile is marked as "Verified".
3. **Zero-Configuration:** When a new user loads the PMDG 777, the app downloads the verified profile in the background. The user flies with instant shared-cockpit support without manual configuration.
