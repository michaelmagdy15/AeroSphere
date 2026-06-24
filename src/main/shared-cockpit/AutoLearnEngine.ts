// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Auto-Learn Engine (APG)
// Differential state watcher for control discovery
// ═══════════════════════════════════════════════════════

import type { AircraftProfile, ControlMapping } from '../../shared/types';
import SemanticClassifier from './SemanticClassifier';

export type SimVarSnapshot = Map<string, number>;

/** Control type detection — inspired by YourControls categories. */
export type ControlType = 'toggle_switch' | 'num_set' | 'num_increment' | 'var' | 'event';

/** Prefixes that produce continuous noise — never meaningful user input. */
const NOISE_PREFIXES: readonly string[] = [
  'GENERAL_ENG_RPM', 'ENG_N1', 'ENG_N2', 'FUEL_TOTAL', 'AMBIENT_',
  'TOTAL_AIR_TEMP', 'GPS_POSITION', 'INDICATED_', 'VELOCITY_',
  'PLANE_ALTITUDE', 'PLANE_LATITUDE', 'PLANE_LONGITUDE', 'PLANE_HEADING',
  'AIRSPEED_', 'VERTICAL_SPEED', 'G_FORCE', 'STRUCT_', 'SIM_ON_GROUND',
  'GEAR_POSITION', 'ACCELERATION_',
] as const;

export default class AutoLearnEngine {
  private snapshot: SimVarSnapshot | null = null;
  private readonly classifier = new SemanticClassifier();
  private readonly discoveredMappings = new Map<string, ControlMapping>();

  /** Freeze current state — call right before the user clicks a control. */
  startLearning(allVars: Record<string, number>): void {
    this.snapshot = new Map(Object.entries(allVars));
  }

  /**
   * Diff current state against the snapshot.
   * Returns only the NEW mappings discovered in this capture.
   */
  captureAfterClick(allVars: Record<string, number>): ControlMapping[] {
    if (!this.snapshot) return [];

    const newMappings: ControlMapping[] = [];

    for (const [key, newVal] of Object.entries(allVars)) {
      if (this.isNoise(key)) continue;

      const oldVal = this.snapshot.get(key);
      if (oldVal === undefined || oldVal === newVal) continue;
      if (this.discoveredMappings.has(key)) continue;

      const result = this.classifier.classify(key);
      const discrete = this.isDiscrete(oldVal, newVal);

      const mapping: ControlMapping = {
        varName: key,
        varType: key.startsWith('L:') || key.includes('_') ? 'lvar' : 'simvar',
        canonicalControl: result.name,
        syncMode: discrete ? 'on-change' : 'continuous',
        interpolate: !discrete,
        confidence: result.confidence,
        oldValue: oldVal,
        newValue: newVal,
        isDiscrete: discrete,
      };

      this.discoveredMappings.set(key, mapping);
      newMappings.push(mapping);
    }

    // Reset snapshot to current state for next capture
    this.snapshot = new Map(Object.entries(allVars));
    return newMappings;
  }

  /** Export all discovered mappings as a complete profile. */
  exportProfile(aircraftTitle: string): AircraftProfile {
    return {
      aircraftTitle,
      version: 1,
      createdAt: new Date().toISOString(),
      verified: false,
      mappings: Array.from(this.discoveredMappings.values()).map(
        ({ oldValue, newValue, ...clean }) => clean
      ),
    };
  }

  /** Clear all state for a fresh learning session. */
  reset(): void {
    this.snapshot = null;
    this.discoveredMappings.clear();
  }

  get mappingCount(): number {
    return this.discoveredMappings.size;
  }

  // ── Private helpers ──

  private isNoise(varName: string): boolean {
    const upper = varName.toUpperCase();
    return NOISE_PREFIXES.some((p) => upper.startsWith(p));
  }

  private isDiscrete(oldVal: number, newVal: number): boolean {
    // Boolean toggle
    if ((oldVal === 0 && newVal === 1) || (oldVal === 1 && newVal === 0)) return true;
    // Integer stepping
    if (Number.isInteger(oldVal) && Number.isInteger(newVal) && Number.isInteger(newVal - oldVal)) {
      return true;
    }
    return false;
  }

  /** Detect YourControls-style control type from value patterns. */
  static detectControlType(oldVal: number, newVal: number): ControlType {
    if ((oldVal === 0 && newVal === 1) || (oldVal === 1 && newVal === 0)) return 'toggle_switch';
    if (Number.isInteger(oldVal) && Number.isInteger(newVal)) {
      return Math.abs(newVal - oldVal) === 1 ? 'num_increment' : 'num_set';
    }
    return 'var';
  }
}
