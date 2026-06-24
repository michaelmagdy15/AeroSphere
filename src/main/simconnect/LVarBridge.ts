// ═══════════════════════════════════════════════════════
// AeroSphere Studio — L-Var Bridge (TypeScript Client)
// Communicates with the WASM gauge module via SimConnect
// ClientData areas for L-Var enumeration, read/write,
// and bulk state broadcast subscription.
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import type { SimConnectConnection } from 'node-simconnect';

// ── ClientData area names (must match C side) ───────────

const CD_NAME_LVAR_REQUEST = 'AeroSphere.LVar.Request';
const CD_NAME_LVAR_RESPONSE = 'AeroSphere.LVar.Response';
const CD_NAME_EVENT_REQUEST = 'AeroSphere.Event.Request';
const CD_NAME_STATE_BROADCAST = 'AeroSphere.State.Broadcast';

// ── ClientData area IDs (must match C side) ─────────────

const CD_AREA_LVAR_REQUEST = 1;
const CD_AREA_LVAR_RESPONSE = 2;
const CD_AREA_EVENT_REQUEST = 3;
const CD_AREA_STATE_BROADCAST = 4;

// ── Data definition IDs ─────────────────────────────────

const DEFINE_LVAR_REQUEST = 1;
const DEFINE_LVAR_RESPONSE = 2;
const DEFINE_EVENT_REQUEST = 3;
const DEFINE_STATE_BROADCAST = 4;

// ── Request IDs ─────────────────────────────────────────

const REQUEST_LVAR_RESPONSE = 200;
const REQUEST_STATE_BROADCAST = 201;

// ── Command constants (must match C side) ───────────────

const CMD_NOP = 0;
const CMD_ENUMERATE = 1;
const CMD_READ = 2;
const CMD_WRITE = 3;
const CMD_EXEC_RPN = 4;
const CMD_KEY_EVENT = 5;
const CMD_INPUT_EVENT = 6;

// ── Struct sizes (must match packed C structs) ──────────

const LVAR_NAME_MAX = 64;
const RPN_CODE_MAX = 128;
const LVAR_BATCH_SIZE = 50;

// ── L-Var response fields ───────────────────────────────

interface LVarResponse {
  command: number;
  totalVars: number;
  varIndex: number;
  value: number;
  varName: string;
}

// ── State broadcast entry ───────────────────────────────

interface LVarEntry {
  id: number;
  value: number;
}

interface StateBroadcast {
  batchIndex: number;
  batchTotal: number;
  count: number;
  vars: LVarEntry[];
}

// ── Pending request tracking ────────────────────────────

interface PendingEnumeration {
  resolve: (names: string[]) => void;
  names: string[];
  expected: number;
}

interface PendingRead {
  resolve: (value: number) => void;
  varName: string;
}

// ═══════════════════════════════════════════════════════
// LVarBridge — TypeScript client for the WASM bridge
// ═══════════════════════════════════════════════════════

export class LVarBridge extends EventEmitter {
  private handle: SimConnectConnection;
  private pendingEnum: PendingEnumeration | null = null;
  private pendingReads = new Map<string, PendingRead>();
  private initialized = false;

  constructor(handle: SimConnectConnection) {
    super();
    this.handle = handle;
  }

  // ── Initialize ClientData area mappings ───────────────
  // Call once after SimConnect is open.

  init(): void {
    if (this.initialized) return;

    // Map area names to IDs (the WASM side creates them,
    // we just need to map them on our side too)
    this.handle.mapClientDataNameToID(CD_NAME_LVAR_REQUEST, CD_AREA_LVAR_REQUEST);
    this.handle.mapClientDataNameToID(CD_NAME_LVAR_RESPONSE, CD_AREA_LVAR_RESPONSE);
    this.handle.mapClientDataNameToID(CD_NAME_EVENT_REQUEST, CD_AREA_EVENT_REQUEST);
    this.handle.mapClientDataNameToID(CD_NAME_STATE_BROADCAST, CD_AREA_STATE_BROADCAST);

    // Define data structures for reading response areas
    this.handle.addToClientDataDefinition(
      DEFINE_LVAR_RESPONSE, 0, this.lvarResponseSize()
    );
    this.handle.addToClientDataDefinition(
      DEFINE_STATE_BROADCAST, 0, this.stateBroadcastSize()
    );

    // Subscribe to responses from the WASM module
    (this.handle as any).requestClientData(
      CD_AREA_LVAR_RESPONSE,
      REQUEST_LVAR_RESPONSE,
      DEFINE_LVAR_RESPONSE,
      0, // SIMCONNECT_CLIENT_DATA_PERIOD_ON_SET
      0, 0, 0, 0
    );

    (this.handle as any).requestClientData(
      CD_AREA_STATE_BROADCAST,
      REQUEST_STATE_BROADCAST,
      DEFINE_STATE_BROADCAST,
      0, // SIMCONNECT_CLIENT_DATA_PERIOD_ON_SET
      0, 0, 0, 0
    );

    // Listen for ClientData responses
    (this.handle as any).on('clientData', this.onClientData);

    this.initialized = true;
  }

  // ── Enumerate all L-Vars ──────────────────────────────

  enumerateLVars(): Promise<string[]> {
    return new Promise((resolve) => {
      this.pendingEnum = { resolve, names: [], expected: -1 };
      this.sendLVarRequest(CMD_ENUMERATE, 0, 0, '');
    });
  }

  // ── Read a single L-Var ───────────────────────────────

  readLVar(name: string): Promise<number> {
    return new Promise((resolve) => {
      this.pendingReads.set(name, { resolve, varName: name });
      this.sendLVarRequest(CMD_READ, 0, 0, name);
    });
  }

  // ── Write a single L-Var ──────────────────────────────

  writeLVar(name: string, value: number): void {
    this.sendLVarRequest(CMD_WRITE, 0, value, name);
  }

  // ── Execute RPN calculator code ───────────────────────

  executeRPN(code: string): void {
    this.sendEventRequest(CMD_EXEC_RPN, 0, 0, code);
  }

  // ── Subscribe to bulk L-Var state broadcasts ──────────

  onStateBroadcast(callback: (batch: StateBroadcast) => void): void {
    this.on('stateBroadcast', callback);
  }

  // ── Internal: send an LVarRequest to the WASM module ──

  private sendLVarRequest(
    command: number,
    varIndex: number,
    value: number,
    varName: string,
  ): void {
    const buf = Buffer.alloc(this.lvarRequestSize());
    let offset = 0;

    buf.writeUInt16LE(command, offset); offset += 2;
    buf.writeUInt16LE(varIndex, offset); offset += 2;
    buf.writeDoubleLE(value, offset); offset += 8;
    buf.write(varName, offset, LVAR_NAME_MAX, 'utf8');

    (this.handle as any).setClientData(
      CD_AREA_LVAR_REQUEST,
      DEFINE_LVAR_REQUEST,
      0, // flags
      buf
    );
  }

  // ── Internal: send an EventRequest to the WASM module ─

  private sendEventRequest(
    command: number,
    eventId: number,
    value: number,
    rpnCode: string,
  ): void {
    const buf = Buffer.alloc(this.eventRequestSize());
    let offset = 0;

    buf.writeUInt16LE(command, offset); offset += 2;
    // 2 bytes padding for alignment to match packed struct
    buf.writeUInt32LE(eventId, offset + 2); offset += 6;
    buf.writeDoubleLE(value, offset); offset += 8;
    buf.write(rpnCode, offset, RPN_CODE_MAX, 'utf8');

    (this.handle as any).setClientData(
      CD_AREA_EVENT_REQUEST,
      DEFINE_EVENT_REQUEST,
      0, // flags
      buf
    );
  }

  // ── Internal: handle incoming ClientData ──────────────

  private onClientData = (data: any): void => {
    const requestID = data.requestID;
    const rawBuf = data.data;
    const payload = rawBuf.readBytes(rawBuf.remaining());

    if (requestID === REQUEST_LVAR_RESPONSE) {
      this.handleLVarResponse(payload);
    } else if (requestID === REQUEST_STATE_BROADCAST) {
      this.handleStateBroadcast(payload);
    }
  };

  private handleLVarResponse(buf: Buffer): void {
    const resp = this.parseLVarResponse(buf);

    if (resp.command === CMD_ENUMERATE && this.pendingEnum) {
      if (this.pendingEnum.expected < 0) {
        this.pendingEnum.expected = resp.totalVars;
      }
      this.pendingEnum.names[resp.varIndex] = resp.varName;

      // Check if we've received all names
      const filled = this.pendingEnum.names.filter(Boolean).length;
      if (filled >= this.pendingEnum.expected) {
        const names = [...this.pendingEnum.names];
        this.pendingEnum.resolve(names);
        this.pendingEnum = null;
      }
    } else if (resp.command === CMD_READ) {
      const pending = this.pendingReads.get(resp.varName);
      if (pending) {
        pending.resolve(resp.value);
        this.pendingReads.delete(resp.varName);
      }
    }
  }

  private handleStateBroadcast(buf: Buffer): void {
    const broadcast = this.parseStateBroadcast(buf);
    this.emit('stateBroadcast', broadcast);
  }

  // ── Buffer parsers ────────────────────────────────────

  private parseLVarResponse(buf: Buffer): LVarResponse {
    let offset = 0;
    const command = buf.readUInt16LE(offset); offset += 2;
    const totalVars = buf.readUInt16LE(offset); offset += 2;
    const varIndex = buf.readUInt16LE(offset); offset += 2;
    const value = buf.readDoubleLE(offset); offset += 8;
    const varName = buf.toString('utf8', offset, offset + LVAR_NAME_MAX)
      .replace(/\0+$/, '');

    return { command, totalVars, varIndex, value, varName };
  }

  private parseStateBroadcast(buf: Buffer): StateBroadcast {
    let offset = 0;
    const batchIndex = buf.readUInt16LE(offset); offset += 2;
    const batchTotal = buf.readUInt16LE(offset); offset += 2;
    const count = buf.readUInt16LE(offset); offset += 2;

    const vars: LVarEntry[] = [];
    for (let i = 0; i < count; i++) {
      const id = buf.readUInt16LE(offset); offset += 2;
      const value = buf.readDoubleLE(offset); offset += 8;
      vars.push({ id, value });
    }

    return { batchIndex, batchTotal, count, vars };
  }

  // ── Struct sizes ──────────────────────────────────────

  private lvarRequestSize(): number {
    // u16 command + u16 varIndex + f64 value + char[64] varName
    return 2 + 2 + 8 + LVAR_NAME_MAX;
  }

  private lvarResponseSize(): number {
    // u16 command + u16 totalVars + u16 varIndex + f64 value + char[64] varName
    return 2 + 2 + 2 + 8 + LVAR_NAME_MAX;
  }

  private eventRequestSize(): number {
    // u16 command + u32 eventId + f64 value + char[128] rpnCode
    return 2 + 4 + 8 + RPN_CODE_MAX;
  }

  private stateBroadcastSize(): number {
    // u16 batchIndex + u16 batchTotal + u16 count + LVarEntry[50]
    // LVarEntry = u16 id + f64 value = 10 bytes
    return 2 + 2 + 2 + LVAR_BATCH_SIZE * 10;
  }

  // ── Cleanup ───────────────────────────────────────────

  dispose(): void {
    (this.handle as any).off('clientData', this.onClientData);
    this.pendingEnum = null;
    this.pendingReads.clear();
    this.removeAllListeners();
  }
}
