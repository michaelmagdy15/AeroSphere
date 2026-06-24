// ═══════════════════════════════════════════════════════
// AeroSphere Studio — L-Var Bridge
// Enumerate, read, write L-Vars via MSFS gauge API
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

// ── Tracked L-Var cache ─────────────────────────────────

static int    g_lvar_ids[MAX_TRACKED_LVARS];
static char   g_lvar_names[MAX_TRACKED_LVARS][LVAR_NAME_MAX];
static int    g_lvar_count = 0;
static int    g_broadcast_offset = 0; // cursor for batch reads

// ── enumerate_lvars ─────────────────────────────────────
// Walk all registered named variables and cache their IDs.
// Sends the total count + each name back via LVarResponse.

void enumerate_lvars(void) {
    g_lvar_count = 0;

    // MSFS gauge API: iterate named variables
    int total = 0;
    PCSTRINGZ name = NULL;

    // get_name_of_named_variable iterates when called in sequence
    // We start from index 0 and walk until NULL or MAX
    for (int i = 0; i < MAX_TRACKED_LVARS; i++) {
        name = get_name_of_named_variable(i);
        if (!name || name[0] == '\0') break;

        // Only track L: variables (local vars)
        g_lvar_ids[g_lvar_count] = i;
        strncpy(g_lvar_names[g_lvar_count], name, LVAR_NAME_MAX - 1);
        g_lvar_names[g_lvar_count][LVAR_NAME_MAX - 1] = '\0';
        g_lvar_count++;
    }

    // Send back each var name via ClientData response area
    for (int i = 0; i < g_lvar_count; i++) {
        LVarResponse resp;
        memset(&resp, 0, sizeof(resp));
        resp.command   = CMD_ENUMERATE;
        resp.totalVars = (uint16_t)g_lvar_count;
        resp.varIndex  = (uint16_t)i;
        resp.value     = 0.0;
        strncpy(resp.varName, g_lvar_names[i], LVAR_NAME_MAX - 1);

        SimConnect_SetClientData(
            g_hSimConnect,
            CD_AREA_LVAR_RESPONSE,
            DEFINE_LVAR_RESPONSE,
            SIMCONNECT_CLIENT_DATA_SET_FLAG_DEFAULT,
            0,
            sizeof(LVarResponse),
            &resp
        );
    }

    g_broadcast_offset = 0;
}

// ── read_lvar ───────────────────────────────────────────
// Read a single L-Var by name and send its value back.

void read_lvar(const char* name) {
    int id = check_named_variable(name);
    if (id < 0) return; // unknown variable

    double val = get_named_variable_value(id);

    LVarResponse resp;
    memset(&resp, 0, sizeof(resp));
    resp.command   = CMD_READ;
    resp.totalVars = (uint16_t)g_lvar_count;
    resp.varIndex  = 0;
    resp.value     = val;
    strncpy(resp.varName, name, LVAR_NAME_MAX - 1);

    SimConnect_SetClientData(
        g_hSimConnect,
        CD_AREA_LVAR_RESPONSE,
        DEFINE_LVAR_RESPONSE,
        SIMCONNECT_CLIENT_DATA_SET_FLAG_DEFAULT,
        0,
        sizeof(LVarResponse),
        &resp
    );
}

// ── write_lvar ──────────────────────────────────────────
// Set an L-Var's value by name.

void write_lvar(const char* name, double value) {
    int id = check_named_variable(name);
    if (id < 0) {
        // Auto-register if it doesn't exist yet
        id = register_named_variable(name);
        if (id < 0) return;
    }

    set_named_variable_value(id, value);
}

// ── broadcast_lvar_batch ────────────────────────────────
// Called once per frame. Reads up to LVAR_BATCH_SIZE L-Vars
// starting from the current offset, sends a StateBroadcast,
// and advances the cursor. Wraps around after all vars sent.

void broadcast_lvar_batch(void) {
    if (g_lvar_count == 0) return;

    int total_batches = (g_lvar_count + LVAR_BATCH_SIZE - 1) / LVAR_BATCH_SIZE;
    int batch_index   = g_broadcast_offset / LVAR_BATCH_SIZE;

    StateBroadcast pkt;
    memset(&pkt, 0, sizeof(pkt));
    pkt.batchIndex = (uint16_t)batch_index;
    pkt.batchTotal = (uint16_t)total_batches;

    int start = g_broadcast_offset;
    int end   = start + LVAR_BATCH_SIZE;
    if (end > g_lvar_count) end = g_lvar_count;

    pkt.count = (uint16_t)(end - start);

    for (int i = start; i < end; i++) {
        int slot = i - start;
        pkt.vars[slot].id    = (uint16_t)g_lvar_ids[i];
        pkt.vars[slot].value = get_named_variable_value(g_lvar_ids[i]);
    }

    SimConnect_SetClientData(
        g_hSimConnect,
        CD_AREA_STATE_BROADCAST,
        DEFINE_STATE_BROADCAST,
        SIMCONNECT_CLIENT_DATA_SET_FLAG_DEFAULT,
        0,
        sizeof(StateBroadcast),
        &pkt
    );

    // Advance cursor, wrap at end
    g_broadcast_offset = (end >= g_lvar_count) ? 0 : end;
}

// ── process_lvar_request ────────────────────────────────
// Handle an incoming LVarRequest from the external app.

void process_lvar_request(const LVarRequest* req) {
    switch (req->command) {
        case CMD_ENUMERATE:
            enumerate_lvars();
            break;
        case CMD_READ:
            read_lvar(req->varName);
            break;
        case CMD_WRITE:
            write_lvar(req->varName, req->value);
            break;
        default:
            break;
    }
}
