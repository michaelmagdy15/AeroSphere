// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Input Event Enumerator
// MSFS 2024 Input Events discovery and triggering via
// SimConnect SubscribeInputEvent / EnumerateInputEvents.
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import type { SimConnectConnection } from 'node-simconnect';

// ── Request IDs (offset from telemetry/LVar IDs) ────────

const REQUEST_ENUMERATE_INPUT_EVENTS = 300;
const REQUEST_SUBSCRIBE_INPUT_EVENT = 301;

// ── Single input event descriptor ───────────────────────

export interface InputEventDescriptor {
  /** FNV-1a hash used by SimConnect to identify the event */
  hash: bigint;
  /** Human-readable name, e.g. "ELECTRICAL_Battery_1_Switch" */
  name: string;
}

// ── Per-aircraft cache entry ────────────────────────────

interface CachedAircraft {
  title: string;
  events: InputEventDescriptor[];
}

// ═══════════════════════════════════════════════════════
// InputEventEnumerator
// ═══════════════════════════════════════════════════════

export class InputEventEnumerator extends EventEmitter {
  private handle: SimConnectConnection;
  private cache: CachedAircraft | null = null;
  private pendingResolve: ((events: InputEventDescriptor[]) => void) | null = null;
  private collected: InputEventDescriptor[] = [];

  constructor(handle: SimConnectConnection) {
    super();
    this.handle = handle;
    (this.handle as any).on('inputEventsList', this.onEnumerateResult);
    (this.handle as any).on('enumerateInputEventParams', this.onEnumerateParams);
  }

  // ── Enumerate all input events for current aircraft ───
  // Returns cached results if the aircraft title matches.

  async enumerateInputEvents(aircraftTitle?: string): Promise<InputEventDescriptor[]> {
    // Return cached if same aircraft
    if (this.cache && aircraftTitle && this.cache.title === aircraftTitle) {
      return this.cache.events;
    }

    return new Promise<InputEventDescriptor[]>((resolve) => {
      this.pendingResolve = resolve;
      this.collected = [];

      // SimConnect_EnumerateInputEvents sends back all input
      // events registered by the current aircraft's systems.
      // Results arrive via the 'enumerateInputEvents' callback.
      this.handle.enumerateInputEvents(REQUEST_ENUMERATE_INPUT_EVENTS);
    });
  }

  // ── Trigger an input event by hash ────────────────────

  triggerInputEvent(hash: bigint, value: number): void {
    // SimConnect_SetInputEvent takes the hash and a float value
    this.handle.setInputEvent(hash, value);
  }

  // ── Subscribe to an input event for change tracking ───

  subscribeInputEvent(hash: bigint): void {
    this.handle.subscribeInputEvent(hash);
  }

  // ── Handle enumeration results ────────────────────────
  // MSFS sends events in batches. Each callback contains
  // a chunk of events. We accumulate until done.

  private onEnumerateResult = (data: any): void => {
    if (data.requestID !== REQUEST_ENUMERATE_INPUT_EVENTS) return;

    for (const evt of data.inputEventDescriptors) {
      this.collected.push({
        hash: evt.inputEventIdHash,
        name: evt.name,
      });
    }

    // Check if this is the last batch
    if (data.entryNumber >= data.outOf - 1 && this.pendingResolve) {
      const events = [...this.collected];

      // Cache for this aircraft
      this.cache = {
        title: '', // will be set by caller if desired
        events,
      };

      this.pendingResolve(events);
      this.pendingResolve = null;
      this.emit('enumerated', events);
    }
  };

  // ── Handle input event parameter info ─────────────────
  // Optional: provides parameter metadata for input events.

  private onEnumerateParams = (data: any): void => {
    // Store parameter type info if needed in the future
    this.emit('inputEventParam', {
      hash: data.inputEventIdHash,
      type: data.value,
    });
  };

  // ── Update cache title ────────────────────────────────
  // Call after enumeration to associate results with an
  // aircraft title for cache invalidation.

  setCacheTitle(title: string): void {
    if (this.cache) {
      this.cache.title = title;
    }
  }

  // ── Clear cache (e.g. on aircraft change) ─────────────

  clearCache(): void {
    this.cache = null;
  }

  // ── Find event by name substring ──────────────────────

  findEvent(namePattern: string): InputEventDescriptor | undefined {
    const pattern = namePattern.toLowerCase();
    const events = this.cache?.events ?? this.collected;
    return events.find((e) => e.name.toLowerCase().includes(pattern));
  }

  // ── Find all events matching a pattern ────────────────

  findEvents(namePattern: string): InputEventDescriptor[] {
    const pattern = namePattern.toLowerCase();
    const events = this.cache?.events ?? this.collected;
    return events.filter((e) => e.name.toLowerCase().includes(pattern));
  }

  // ── Cleanup ───────────────────────────────────────────

  dispose(): void {
    (this.handle as any).off('inputEventsList', this.onEnumerateResult);
    (this.handle as any).off('enumerateInputEventParams', this.onEnumerateParams);
    this.pendingResolve = null;
    this.collected = [];
    this.cache = null;
    this.removeAllListeners();
  }
}
