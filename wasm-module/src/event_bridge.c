// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Event Bridge
// RPN execution, K-events, Input Events, H-Event forwarding
// ═══════════════════════════════════════════════════════

#include <MSFS/MSFS.h>
#include <MSFS/MSFS_Render.h>
#include <SimConnect.h>
#include <gauges.h>
#include <string.h>
#include <stdio.h>
#include "client_data.h"

// ── External SimConnect handle (owned by main.c) ────────

extern HANDLE g_hSimConnect;

// ── execute_calculator_code ─────────────────────────────
// Run an RPN calculator string inside the sim.
// This is the universal way to interact with the sim's
// internal variable/event system from WASM.

void execute_calculator_code(const char* rpn_string) {
    if (!rpn_string || rpn_string[0] == '\0') return;

    // execute_calculator_code is the MSFS gauge API function
    // that evaluates an RPN expression within the sim context
    FLOAT64 result = 0.0;
    SINT32  iresult = 0;
    PCSTRINGZ sresult = NULL;

    if (!gauge_calculator_code_precompile(NULL, NULL, rpn_string)) {
        // Direct execution path
        execute_calculator_code_str(
            rpn_string,
            &result,
            &iresult,
            &sresult
        );
    }
}

// ── trigger_key_event ───────────────────────────────────
// Fire a legacy K-event by its numeric ID.
// Common events: TOGGLE_MASTER_BATTERY, PARKING_BRAKES, etc.

void trigger_key_event(uint32_t event_id, double value) {
    // Use SimConnect to send the key event
    // The event is transmitted as a DWORD parameter
    DWORD param = (DWORD)value;

    SimConnect_TransmitClientEvent(
        g_hSimConnect,
        SIMCONNECT_OBJECT_ID_USER,
        event_id,
        param,
        SIMCONNECT_GROUP_PRIORITY_HIGHEST,
        SIMCONNECT_EVENT_FLAG_GROUPID_IS_PRIORITY
    );
}

// ── send_input_event ────────────────────────────────────
// Trigger an MSFS 2024 Input Event by name and value.
// Input Events are the new way to interact with modern
// aircraft cockpit controls in MSFS 2024.
// The name is hashed and sent via RPN as a fallback since
// direct InputEvent API requires enumeration first.

void send_input_event(const char* name, double value) {
    if (!name || name[0] == '\0') return;

    // Build RPN string to trigger the input event:
    //   (>B:name, value)
    // This is the recommended approach from WASM context
    char rpn_buf[256];
    snprintf(rpn_buf, sizeof(rpn_buf),
             "%.6f (>B:%s)", value, name);

    FLOAT64 result = 0.0;
    SINT32  iresult = 0;
    PCSTRINGZ sresult = NULL;

    execute_calculator_code_str(rpn_buf, &result, &iresult, &sresult);
}

// ── forward_h_event ─────────────────────────────────────
// H-Events (HTML events) are custom events defined by
// aircraft developers. Forward them by executing the
// appropriate RPN code.

void forward_h_event(const char* event_name) {
    if (!event_name || event_name[0] == '\0') return;

    // H-Events are triggered via RPN: (>H:EventName)
    char rpn_buf[256];
    snprintf(rpn_buf, sizeof(rpn_buf), "(>H:%s)", event_name);

    FLOAT64 result = 0.0;
    SINT32  iresult = 0;
    PCSTRINGZ sresult = NULL;

    execute_calculator_code_str(rpn_buf, &result, &iresult, &sresult);
}

// ── process_event_request ───────────────────────────────
// Handle an incoming EventRequest from the external app.

void process_event_request(const EventRequest* req) {
    switch (req->command) {
        case CMD_EXEC_RPN:
            execute_calculator_code(req->rpnCode);
            break;
        case CMD_KEY_EVENT:
            trigger_key_event(req->eventId, req->value);
            break;
        case CMD_INPUT_EVENT:
            send_input_event(req->rpnCode, req->value);
            break;
        default:
            break;
    }
}
