// ═══════════════════════════════════════════════════════
// AeroSphere Studio — WASM Gauge Entry Point
// Runs inside MSFS 2024 as an in-process gauge module.
// Bridges L-Vars, events, and input events to the
// external Electron app via SimConnect ClientData areas.
// ═══════════════════════════════════════════════════════

#include <MSFS/MSFS.h>
#include <MSFS/MSFS_Render.h>
#include <SimConnect.h>
#include <gauges.h>
#include <string.h>
#include "client_data.h"

// ── Global SimConnect handle ────────────────────────────

HANDLE g_hSimConnect = NULL;

// ── Forward declarations from bridge modules ────────────

extern void process_lvar_request(const LVarRequest* req);
extern void process_event_request(const EventRequest* req);
extern void broadcast_lvar_batch(void);

// ── SimConnect dispatch callback ────────────────────────
// Routes incoming ClientData messages to the appropriate
// bridge handler based on the request ID.

static void CALLBACK simconnect_dispatch(SIMCONNECT_RECV* pData, DWORD cbData, void* pContext) {
    (void)cbData;
    (void)pContext;

    switch (pData->dwID) {
        case SIMCONNECT_RECV_ID_CLIENT_DATA: {
            SIMCONNECT_RECV_CLIENT_DATA* pClientData =
                (SIMCONNECT_RECV_CLIENT_DATA*)pData;

            if (pClientData->dwRequestID == REQUEST_LVAR) {
                // Incoming L-Var command from external app
                const LVarRequest* req = (const LVarRequest*)&pClientData->dwData;
                if (req->command != CMD_NOP) {
                    process_lvar_request(req);
                }
            }
            else if (pClientData->dwRequestID == REQUEST_EVENT) {
                // Incoming event command from external app
                const EventRequest* req = (const EventRequest*)&pClientData->dwData;
                if (req->command != CMD_NOP) {
                    process_event_request(req);
                }
            }
            break;
        }

        case SIMCONNECT_RECV_ID_QUIT:
            // Sim is shutting down
            break;

        default:
            break;
    }
}

// ── setup_client_data_areas ─────────────────────────────
// Create and map all four ClientData areas for IPC.

static void setup_client_data_areas(void) {
    // Area 1: L-Var requests (external → WASM)
    SimConnect_MapClientDataNameToID(
        g_hSimConnect, CD_NAME_LVAR_REQUEST, CD_AREA_LVAR_REQUEST);
    SimConnect_CreateClientData(
        g_hSimConnect, CD_AREA_LVAR_REQUEST,
        sizeof(LVarRequest),
        SIMCONNECT_CREATE_CLIENT_DATA_FLAG_DEFAULT);

    // Area 2: L-Var responses (WASM → external)
    SimConnect_MapClientDataNameToID(
        g_hSimConnect, CD_NAME_LVAR_RESPONSE, CD_AREA_LVAR_RESPONSE);
    SimConnect_CreateClientData(
        g_hSimConnect, CD_AREA_LVAR_RESPONSE,
        sizeof(LVarResponse),
        SIMCONNECT_CREATE_CLIENT_DATA_FLAG_DEFAULT);

    // Area 3: Event requests (external → WASM)
    SimConnect_MapClientDataNameToID(
        g_hSimConnect, CD_NAME_EVENT_REQUEST, CD_AREA_EVENT_REQUEST);
    SimConnect_CreateClientData(
        g_hSimConnect, CD_AREA_EVENT_REQUEST,
        sizeof(EventRequest),
        SIMCONNECT_CREATE_CLIENT_DATA_FLAG_DEFAULT);

    // Area 4: State broadcast (WASM → external, bulk L-Vars)
    SimConnect_MapClientDataNameToID(
        g_hSimConnect, CD_NAME_STATE_BROADCAST, CD_AREA_STATE_BROADCAST);
    SimConnect_CreateClientData(
        g_hSimConnect, CD_AREA_STATE_BROADCAST,
        sizeof(StateBroadcast),
        SIMCONNECT_CREATE_CLIENT_DATA_FLAG_DEFAULT);

    // ── Define data structures for each area ────────────

    SimConnect_AddToClientDataDefinition(
        g_hSimConnect, DEFINE_LVAR_REQUEST,
        0, sizeof(LVarRequest));

    SimConnect_AddToClientDataDefinition(
        g_hSimConnect, DEFINE_LVAR_RESPONSE,
        0, sizeof(LVarResponse));

    SimConnect_AddToClientDataDefinition(
        g_hSimConnect, DEFINE_EVENT_REQUEST,
        0, sizeof(EventRequest));

    SimConnect_AddToClientDataDefinition(
        g_hSimConnect, DEFINE_STATE_BROADCAST,
        0, sizeof(StateBroadcast));

    // ── Subscribe to incoming data on request areas ─────

    SimConnect_RequestClientData(
        g_hSimConnect,
        CD_AREA_LVAR_REQUEST,
        REQUEST_LVAR,
        DEFINE_LVAR_REQUEST,
        SIMCONNECT_CLIENT_DATA_PERIOD_ON_SET,
        SIMCONNECT_CLIENT_DATA_REQUEST_FLAG_DEFAULT,
        0, 0, 0);

    SimConnect_RequestClientData(
        g_hSimConnect,
        CD_AREA_EVENT_REQUEST,
        REQUEST_EVENT,
        DEFINE_EVENT_REQUEST,
        SIMCONNECT_CLIENT_DATA_PERIOD_ON_SET,
        SIMCONNECT_CLIENT_DATA_REQUEST_FLAG_DEFAULT,
        0, 0, 0);
}

// ── Gauge callback ──────────────────────────────────────
// Main MSFS gauge lifecycle hook. Called by the panel
// service at install, each frame, and teardown.

void MSFS_CALLBACK gauge_callback(FsContext ctx, int service_id,
                                   void* pData) {
    (void)ctx;
    (void)pData;

    switch (service_id) {
        case PANEL_SERVICE_POST_INSTALL: {
            // Open SimConnect from within the WASM context
            HRESULT hr = SimConnect_Open(
                &g_hSimConnect,
                "AeroSphere Cockpit Bridge",
                NULL, 0, 0, 0);

            if (SUCCEEDED(hr) && g_hSimConnect) {
                setup_client_data_areas();
            }
            break;
        }

        case PANEL_SERVICE_PRE_DRAW: {
            // Dispatch any pending SimConnect messages
            if (g_hSimConnect) {
                SimConnect_CallDispatch(
                    g_hSimConnect, simconnect_dispatch, NULL);

                // Broadcast one batch of L-Var state per frame
                broadcast_lvar_batch();
            }
            break;
        }

        case PANEL_SERVICE_PRE_KILL: {
            // Cleanup on gauge unload
            if (g_hSimConnect) {
                SimConnect_Close(g_hSimConnect);
                g_hSimConnect = NULL;
            }
            break;
        }

        default:
            break;
    }
}

// ── MSFS WASM Module Registration ───────────────────────
// This macro registers the gauge_callback with the MSFS
// panel service so the sim knows to call us.

#ifdef __wasm__
MSFS_CALLBACK void module_init(void) {
    // Module initialization — gauge_callback handles lifecycle
}

MSFS_CALLBACK void module_deinit(void) {
    // Module cleanup — handled in PRE_KILL
}
#endif
