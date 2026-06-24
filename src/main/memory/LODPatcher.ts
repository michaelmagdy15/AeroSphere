// ═══════════════════════════════════════════════════════
// AeroSphere Studio — LOD Memory Patcher
// ═══════════════════════════════════════════════════════
import { MemoryScanner } from './MemoryScanner';
import { MSFS2024_PATTERNS } from './patterns/msfs2024';
import {
  MSFS_PROCESS_NAME,
  MSFS_TLOD_VALID_MIN,
  MSFS_TLOD_VALID_MAX,
} from '../../shared/constants';

/** Clamp `v` into [lo, hi]. */
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

/**
 * Finds the MSFS graphics-settings struct in memory via AOB scan,
 * resolves the RIP-relative pointer chain, and exposes getters /
 * setters for TLOD, OLOD, and (future) cloud quality.
 */
export class LODPatcher {
  private scanner = new MemoryScanner();
  private settingsBase: number | null = null;

  private originalTLOD: number | null = null;
  private originalOLOD: number | null = null;

  get isReady(): boolean {
    return this.scanner.isAttached && this.settingsBase !== null;
  }

  // ── Lifecycle ──────────────────────────────────────────

  /**
   * Attach to MSFS, run the AOB scan, and resolve the
   * pointer chain to the settings struct.
   */
  initialize(): void {
    const patterns = MSFS2024_PATTERNS;

    this.scanner.attach(MSFS_PROCESS_NAME);

    const aobAddr = this.scanner.scanAOB(patterns.SETTINGS_AOB);
    if (aobAddr === null) {
      this.scanner.detach();
      throw new Error('LODPatcher: AOB pattern not found — is this a supported MSFS build?');
    }

    // Resolve RIP-relative address:
    //   target = (aobAddr + instructionLength) + displacement
    const displacement = this.scanner.readInt(aobAddr + patterns.RIP_OFFSET);
    // Instruction length for "MOV RAX, [rip+disp32]" is 7 bytes.
    const ripTarget = aobAddr + 7 + displacement;

    // Dereference the pointer at ripTarget + PTR_OFFSET.
    this.settingsBase = this.scanner.readPointer(ripTarget + patterns.PTR_OFFSET);

    if (!this.settingsBase) {
      this.scanner.detach();
      throw new Error('LODPatcher: resolved settings pointer is null');
    }

    // Snapshot originals so we can restore later.
    this.originalTLOD = this.getTLOD();
    this.originalOLOD = this.getOLOD();
  }

  /** Disconnect from MSFS. */
  detach(): void {
    this.settingsBase = null;
    this.originalTLOD = null;
    this.originalOLOD = null;
    this.scanner.detach();
  }

  // ── TLOD ───────────────────────────────────────────────

  getTLOD(): number {
    this.assertReady();
    return this.scanner.readFloat(this.settingsBase! + MSFS2024_PATTERNS.TLOD_OFFSET);
  }

  setTLOD(value: number): void {
    this.assertReady();
    const clamped = clamp(value, MSFS_TLOD_VALID_MIN, MSFS_TLOD_VALID_MAX);
    this.scanner.writeFloat(this.settingsBase! + MSFS2024_PATTERNS.TLOD_OFFSET, clamped);
  }

  // ── OLOD ───────────────────────────────────────────────

  getOLOD(): number {
    this.assertReady();
    return this.scanner.readFloat(this.settingsBase! + MSFS2024_PATTERNS.OLOD_OFFSET);
  }

  setOLOD(value: number): void {
    this.assertReady();
    const clamped = clamp(value, 10, 1000);
    this.scanner.writeFloat(this.settingsBase! + MSFS2024_PATTERNS.OLOD_OFFSET, clamped);
  }

  // ── Restore ────────────────────────────────────────────

  /** Write back the TLOD / OLOD values captured at init time. */
  restoreDefaults(): void {
    if (this.originalTLOD !== null) this.setTLOD(this.originalTLOD);
    if (this.originalOLOD !== null) this.setOLOD(this.originalOLOD);
  }

  // ── Internal ───────────────────────────────────────────

  private assertReady(): void {
    if (!this.isReady) {
      throw new Error('LODPatcher: not initialised — call initialize() first');
    }
  }
}
