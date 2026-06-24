// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Telemetry Poller
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import type { Telemetry } from '../../shared/types';
import { SimConnectManager } from './SimConnectManager';

export class TelemetryPoller extends EventEmitter {
  private manager: SimConnectManager;
  private latest: Telemetry | null = null;
  private interval: ReturnType<typeof setInterval> | null = null;
  private rateMs: number;

  constructor(manager: SimConnectManager, rateMs = 50) {
    super();
    this.manager = manager;
    this.rateMs = rateMs;
    this.manager.onTelemetry(this.handleTelemetry);
  }

  async start(): Promise<void> {
    await this.manager.connect();
    this.interval = setInterval(() => {
      if (this.latest) this.emit('telemetry', this.latest);
    }, this.rateMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.manager.disconnect();
  }

  getLatestTelemetry(): Telemetry | null {
    return this.latest;
  }

  setRate(ms: number): void {
    this.rateMs = ms;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = setInterval(() => {
        if (this.latest) this.emit('telemetry', this.latest);
      }, this.rateMs);
    }
  }

  private handleTelemetry = (t: Telemetry): void => {
    this.latest = t;
  };
}
