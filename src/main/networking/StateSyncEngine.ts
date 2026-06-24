// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Delta-Based Cockpit State Sync
// ═══════════════════════════════════════════════════════

import { STATE_EPSILON } from '../../shared/constants';
import type { VarChange } from '../../shared/types';

export class StateSyncEngine {
  private lastSent = new Map<number, number>();
  private sequence = 0;

  /**
   * Returns binary delta of only changed vars, or null if nothing changed.
   * Wire format: [seq:u32][timestamp:f64][numVars:u16][...varId:u16+value:f64]
   */
  calculateDelta(currentState: Map<number, number>): Uint8Array | null {
    const changes: VarChange[] = [];
    for (const [varId, value] of currentState) {
      const prev = this.lastSent.get(varId);
      if (prev === undefined || Math.abs(value - prev) > STATE_EPSILON) {
        changes.push({ varId, value });
        this.lastSent.set(varId, value);
      }
    }
    return changes.length > 0 ? this.serialize(changes) : null;
  }

  /** Deserialize binary delta back to VarChange[] */
  applyDelta(data: Uint8Array): VarChange[] {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const numVars = view.getUint16(12);
    const changes: VarChange[] = [];
    let offset = 14; // header: seq(4) + timestamp(8) + numVars(2)
    for (let i = 0; i < numVars; i++) {
      changes.push({
        varId: view.getUint16(offset),
        value: view.getFloat64(offset + 2),
      });
      offset += 10;
    }
    return changes;
  }

  /** Build full state snapshot for late joiners */
  buildFullState(currentState: Map<number, number>): Uint8Array {
    const all: VarChange[] = [];
    for (const [varId, value] of currentState) all.push({ varId, value });
    return this.serialize(all);
  }

  /** Reset for a new session */
  reset(): void {
    this.lastSent.clear();
    this.sequence = 0;
  }

  private serialize(changes: VarChange[]): Uint8Array {
    const headerSize = 14; // seq(4) + timestamp(8) + numVars(2)
    const buf = new ArrayBuffer(headerSize + changes.length * 10);
    const view = new DataView(buf);

    view.setUint32(0, this.sequence++);
    view.setFloat64(4, performance.now());
    view.setUint16(12, changes.length);

    let offset = headerSize;
    for (const { varId, value } of changes) {
      view.setUint16(offset, varId);
      view.setFloat64(offset + 2, value);
      offset += 10;
    }
    return new Uint8Array(buf);
  }
}
