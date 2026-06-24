// ═══════════════════════════════════════════════════════
// AeroSphere Studio — SimConnect Manager
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import {
  open,
  Protocol,
  SimConnectPeriod,
  SimConnectDataType,
} from 'node-simconnect';
import { SIMCONNECT_APP_NAME, SIMCONNECT_RETRY_MS } from '../../shared/constants';
import type { Telemetry } from '../../shared/types';
import { DataDefinitionId, RequestId } from './types';

type SimHandle = Awaited<ReturnType<typeof open>>['handle'];

export class SimConnectManager extends EventEmitter {
  private handle: SimHandle | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  async connect(): Promise<void> {
    if (this.handle) return;
    try {
      const { handle } = await open(SIMCONNECT_APP_NAME, Protocol.KittyHawk);
      this.handle = handle;
      this.registerTelemetryDefinition();
      this.requestTelemetry();
      (this.handle as any).on('simObjectData', this.handleSimObjectData);
      this.handle.on('close', this.handleClose);
      this.handle.on('error', this.handleError);
      this.emit('connected');
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.disposed = true;
    this.clearReconnect();
    if (this.handle) {
      this.handle.close();
      this.handle = null;
    }
  }

  isConnected(): boolean {
    return this.handle !== null;
  }

  onTelemetry(cb: (t: Telemetry) => void): void {
    this.on('telemetry', cb);
  }

  // ── Data registration ──

  private registerTelemetryDefinition(): void {
    const h = this.handle!;
    const F = SimConnectDataType.FLOAT64;
    const I = SimConnectDataType.INT32;

    h.addToDataDefinition(DataDefinitionId.Telemetry, 'PLANE ALTITUDE', 'feet', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'VERTICAL SPEED', 'feet per minute', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'SIM ON GROUND', 'bool', I);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'AIRSPEED INDICATED', 'knots', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'HEADING INDICATOR', 'degrees', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'PLANE LATITUDE', 'degrees', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'PLANE LONGITUDE', 'degrees', F);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'SIM DISABLED', 'bool', I);
    h.addToDataDefinition(DataDefinitionId.Telemetry, 'SIMULATION RATE', 'number', F);
  }

  private requestTelemetry(): void {
    this.handle!.requestDataOnSimObject(
      RequestId.Telemetry,
      DataDefinitionId.Telemetry,
      0, // user object
      SimConnectPeriod.VISUAL_FRAME,
    );
  }

  // ── Event handlers ──

  private handleSimObjectData = (data: any): void => {
    if (data.requestID !== RequestId.Telemetry) return;

    const raw = data.data;
    // We must read in the EXACT order defined in registerTelemetryDefinition:
    // 1. PLANE ALTITUDE (FLOAT64)
    // 2. VERTICAL SPEED (FLOAT64)
    // 3. SIM ON GROUND (INT32)
    // 4. AIRSPEED INDICATED (FLOAT64)
    // 5. HEADING INDICATOR (FLOAT64)
    // 6. PLANE LATITUDE (FLOAT64)
    // 7. PLANE LONGITUDE (FLOAT64)
    // 8. SIM DISABLED (INT32)
    // 9. SIMULATION RATE (FLOAT64)

    const altitude = raw.readFloat64();
    const verticalSpeed = raw.readFloat64();
    const onGround = raw.readInt32() !== 0;
    const airspeed = raw.readFloat64();
    const heading = raw.readFloat64();
    const latitude = raw.readFloat64();
    const longitude = raw.readFloat64();
    const isPaused = raw.readInt32() !== 0;
    const simRate = raw.readFloat64();

    const telemetry: Telemetry = {
      altitude,
      altitudeAGL: 0, // not available via this definition
      verticalSpeed,
      airspeed,
      heading,
      latitude,
      longitude,
      onGround,
      isPaused,
      simRate,
    };

    this.emit('telemetry', telemetry);
  };

  private handleClose = (): void => {
    this.handle = null;
    this.emit('disconnected');
    if (!this.disposed) this.scheduleReconnect();
  };

  private handleError = (): void => {
    this.handle = null;
    this.emit('disconnected');
    if (!this.disposed) this.scheduleReconnect();
  };

  // ── Reconnection ──

  private scheduleReconnect(): void {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => this.connect(), SIMCONNECT_RETRY_MS);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
