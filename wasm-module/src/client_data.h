// ═══════════════════════════════════════════════════════
// AeroSphere Studio — ClientData Shared Definitions
// Bidirectional IPC structs for WASM ↔ Electron bridge
// ═══════════════════════════════════════════════════════

#ifndef AEROSPHERE_CLIENT_DATA_H
#define AEROSPHERE_CLIENT_DATA_H

#include <stdint.h>

// ── ClientData Area IDs ─────────────────────────────────

#define CD_AREA_LVAR_REQUEST     1
#define CD_AREA_LVAR_RESPONSE    2
#define CD_AREA_EVENT_REQUEST    3
#define CD_AREA_STATE_BROADCAST  4

// ── ClientData Area Names (must match TypeScript side) ──

#define CD_NAME_LVAR_REQUEST    "AeroSphere.LVar.Request"
#define CD_NAME_LVAR_RESPONSE   "AeroSphere.LVar.Response"
#define CD_NAME_EVENT_REQUEST   "AeroSphere.Event.Request"
#define CD_NAME_STATE_BROADCAST "AeroSphere.State.Broadcast"

// ── Command Constants ───────────────────────────────────

#define CMD_NOP           0
#define CMD_ENUMERATE     1
#define CMD_READ          2
#define CMD_WRITE         3
#define CMD_EXEC_RPN      4
#define CMD_KEY_EVENT     5
#define CMD_INPUT_EVENT   6

// ── Data Definition IDs (for ClientData mapping) ────────

#define DEFINE_LVAR_REQUEST     1
#define DEFINE_LVAR_RESPONSE    2
#define DEFINE_EVENT_REQUEST    3
#define DEFINE_STATE_BROADCAST  4

// ── Request IDs (for SimConnect dispatching) ────────────

#define REQUEST_LVAR     100
#define REQUEST_EVENT    101

// ── Max batch size per frame ────────────────────────────

#define LVAR_BATCH_SIZE  50
#define LVAR_NAME_MAX    64
#define RPN_CODE_MAX     128
#define MAX_TRACKED_LVARS 4096

// ── Struct: single L-Var entry in a state batch ─────────

#pragma pack(push, 1)

typedef struct {
    uint16_t id;
    double   value;
} LVarEntry;

// ── Struct: incoming L-Var command from external app ────

typedef struct {
    uint16_t command;     // CMD_NOP, CMD_ENUMERATE, CMD_READ, CMD_WRITE
    uint16_t varIndex;    // L-Var index (for indexed operations)
    double   value;       // Value to write (CMD_WRITE only)
    char     varName[LVAR_NAME_MAX]; // Variable name (CMD_READ/CMD_WRITE)
} LVarRequest;

// ── Struct: L-Var response back to external app ─────────

typedef struct {
    uint16_t command;     // Echo of the command that was processed
    uint16_t totalVars;   // Total registered L-Vars (CMD_ENUMERATE)
    uint16_t varIndex;    // Index of this variable
    double   value;       // Current value
    char     varName[LVAR_NAME_MAX]; // Variable name
} LVarResponse;

// ── Struct: event execution command ─────────────────────

typedef struct {
    uint16_t command;     // CMD_EXEC_RPN, CMD_KEY_EVENT, CMD_INPUT_EVENT
    uint32_t eventId;     // K-event ID (CMD_KEY_EVENT)
    double   value;       // Parameter value
    char     rpnCode[RPN_CODE_MAX]; // RPN string (CMD_EXEC_RPN)
} EventRequest;

// ── Struct: bulk L-Var state broadcast ──────────────────

typedef struct {
    uint16_t batchIndex;  // Current batch number (0-based)
    uint16_t batchTotal;  // Total batches for this cycle
    uint16_t count;       // Entries populated in vars[]
    LVarEntry vars[LVAR_BATCH_SIZE];
} StateBroadcast;

#pragma pack(pop)

#endif // AEROSPHERE_CLIENT_DATA_H
