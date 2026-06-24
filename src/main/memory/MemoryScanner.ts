// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Process Memory Scanner
// ═══════════════════════════════════════════════════════

// memoryjs is a native C++ addon — it may not be available
// if the machine lacks Visual Studio build tools or the
// module wasn't rebuilt for the current Electron ABI.
let memoryjs: any;
try {
  memoryjs = require('memoryjs');
} catch {
  console.warn('[MemoryScanner] memoryjs native addon not available — LOD memory patching disabled');
  memoryjs = null;
}

/** Chunk size for AOB scanning (64 KB). */
const SCAN_CHUNK_SIZE = 0x10000;

interface ProcessHandle {
  handle: number;
  modBaseAddr: number;
  modBaseSize: number;
  th32ProcessID: number;
}

/**
 * Low-level wrapper around `memoryjs` for reading / writing
 * another process's memory and performing Array-of-Bytes scans.
 */
export class MemoryScanner {
  private process: ProcessHandle | null = null;

  get isAttached(): boolean {
    return this.process !== null;
  }

  // ── Lifecycle ──────────────────────────────────────────

  /** Open a handle to `processName` and cache module info. */
  attach(processName: string): void {
    if (!memoryjs) throw new Error('MemoryScanner: memoryjs native addon not available');
    if (this.process) this.detach();

    const proc = memoryjs.openProcess(processName);
    this.process = {
      handle:         proc.handle,
      modBaseAddr:    proc.modBaseAddr,
      modBaseSize:    proc.szExePath ? proc.modBaseSize : 0,
      th32ProcessID:  proc.th32ProcessID,
    };
  }

  /** Close the process handle. */
  detach(): void {
    if (!this.process) return;
    memoryjs.closeProcess(this.process.handle);
    this.process = null;
  }

  // ── AOB Scanner ────────────────────────────────────────

  /**
   * Scan process memory for an Array-of-Bytes pattern.
   *
   * @param pattern Space-separated hex bytes. Use `??` for wildcards.
   *                Example: `'48 8B 05 ?? ?? ?? ??'`
   * @returns       Absolute address of the first match, or `null`.
   */
  scanAOB(pattern: string): number | null {
    const proc = this.process;
    if (!proc) throw new Error('MemoryScanner: not attached to any process');
    const { handle, modBaseAddr, modBaseSize } = proc;

    const { bytes, mask } = this.parsePattern(pattern);
    const patternLen = bytes.length;

    const start = modBaseAddr;
    const end   = modBaseAddr + modBaseSize;

    for (let offset = start; offset < end; offset += SCAN_CHUNK_SIZE) {
      const chunkSize = Math.min(SCAN_CHUNK_SIZE + patternLen - 1, end - offset);
      if (chunkSize <= 0) break;

      let chunk: Buffer;
      try {
        chunk = memoryjs.readBuffer(handle, offset, chunkSize);
      } catch {
        // Unreadable page — skip.
        continue;
      }

      const matchIdx = this.findPattern(chunk, bytes, mask);
      if (matchIdx !== -1) {
        return offset + matchIdx;
      }
    }

    return null;
  }

  // ── Typed Read / Write Helpers ─────────────────────────

  readFloat(address: number): number {
    const proc = this.process;
    if (!proc) throw new Error('MemoryScanner: not attached to any process');
    return memoryjs.readMemory(proc.handle, address, memoryjs.FLOAT);
  }

  writeFloat(address: number, value: number): void {
    const proc = this.process;
    if (!proc) throw new Error('MemoryScanner: not attached to any process');
    memoryjs.writeMemory(proc.handle, address, value, memoryjs.FLOAT);
  }

  readInt(address: number): number {
    const proc = this.process;
    if (!proc) throw new Error('MemoryScanner: not attached to any process');
    return memoryjs.readMemory(proc.handle, address, memoryjs.INT);
  }

  readPointer(address: number): number {
    const proc = this.process;
    if (!proc) throw new Error('MemoryScanner: not attached to any process');
    return memoryjs.readMemory(proc.handle, address, memoryjs.INT64);
  }

  // ── Internal ───────────────────────────────────────────

  private assertAttached(): void {
    if (!this.process) throw new Error('MemoryScanner: not attached to any process');
  }

  /**
   * Parse a hex pattern string into byte values and a wildcard mask.
   *
   * @returns `bytes`  – numeric value for each token (0 for wildcards)
   *          `mask`   – `true` = must match, `false` = wildcard
   */
  private parsePattern(pattern: string): { bytes: number[]; mask: boolean[] } {
    const tokens = pattern.trim().split(/\s+/);
    const bytes: number[] = [];
    const mask:  boolean[] = [];

    for (const tok of tokens) {
      if (tok === '??' || tok === '?') {
        bytes.push(0);
        mask.push(false);
      } else {
        bytes.push(parseInt(tok, 16));
        mask.push(true);
      }
    }

    return { bytes, mask };
  }

  /** Brute-force search for `bytes/mask` inside `buffer`. */
  private findPattern(buffer: Buffer, bytes: number[], mask: boolean[]): number {
    const patLen = bytes.length;
    const limit  = buffer.length - patLen;

    for (let i = 0; i <= limit; i++) {
      let found = true;
      for (let j = 0; j < patLen; j++) {
        if (mask[j] && buffer[i + j] !== bytes[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }

    return -1;
  }
}
