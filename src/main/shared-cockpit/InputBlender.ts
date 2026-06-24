// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Input Blender
// Dual-control conflict resolution
// ═══════════════════════════════════════════════════════

import type { PilotRole } from '../../shared/types';

export interface BlendedInput {
  value: number;
  source: PilotRole;
  timestamp: number;
  forced: boolean;
}

export interface InputEvent {
  control: string;
  value: number;
  source: PilotRole;
  timestamp: number;
  isDiscrete: boolean;
  force?: boolean;
}

const PRIORITY: Record<PilotRole, number> = { pf: 3, pm: 2, observer: 1 };
const DEBOUNCE_MS = 100;

export default class InputBlender {
  private readonly lastInputs = new Map<string, InputEvent>();
  private readonly debounceTimestamps = new Map<string, number>();
  private priorityOverride: PilotRole | null = null;

  /**
   * Resolve a control input against existing state.
   * Returns the accepted BlendedInput, or null if the input was rejected.
   */
  resolve(event: InputEvent): BlendedInput | null {
    const { control, value, source, timestamp, isDiscrete, force } = event;

    // Observers can never write
    if (source === 'observer' && !force) return null;

    // Force flag: emergency takeover — always accept
    if (force) {
      this.accept(event);
      return { value, source, timestamp, forced: true };
    }

    // Priority override active: only that role's input is accepted
    if (this.priorityOverride && source !== this.priorityOverride) return null;

    if (isDiscrete) {
      return this.resolveDiscrete(event);
    }
    return this.resolveContinuous(event);
  }

  /** Emergency takeover: only this role's inputs are accepted. */
  setForceOverride(role: PilotRole): void {
    this.priorityOverride = role;
  }

  clearForceOverride(): void {
    this.priorityOverride = null;
  }

  getLastInput(control: string): InputEvent | undefined {
    return this.lastInputs.get(control);
  }

  reset(): void {
    this.lastInputs.clear();
    this.debounceTimestamps.clear();
    this.priorityOverride = null;
  }

  // ── Private ──

  private resolveDiscrete(event: InputEvent): BlendedInput | null {
    const { control, value, source, timestamp } = event;
    const lastTs = this.debounceTimestamps.get(control);

    // Debounce: reject rapid toggling within window
    if (lastTs && timestamp - lastTs < DEBOUNCE_MS) return null;

    // Higher priority wins
    const existing = this.lastInputs.get(control);
    if (existing && PRIORITY[source] < PRIORITY[existing.source] && timestamp - existing.timestamp < DEBOUNCE_MS) {
      return null;
    }

    this.accept(event);
    return { value, source, timestamp, forced: false };
  }

  private resolveContinuous(event: InputEvent): BlendedInput | null {
    // Last-input-wins for axes
    this.accept(event);
    return { value: event.value, source: event.source, timestamp: event.timestamp, forced: false };
  }

  private accept(event: InputEvent): void {
    this.lastInputs.set(event.control, event);
    this.debounceTimestamps.set(event.control, event.timestamp);
  }
}
