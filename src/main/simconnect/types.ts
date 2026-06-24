// ═══════════════════════════════════════════════════════
// AeroSphere Studio — SimConnect Type Definitions
// ═══════════════════════════════════════════════════════

export const enum DataDefinitionId {
  Telemetry = 0,
}

export const enum RequestId {
  Telemetry = 0,
}

/** Ordered fields matching addToDataDefinition registration order. */
export interface RawTelemetryStruct {
  altitude: number;
  verticalSpeed: number;
  simOnGround: number;
  airspeed: number;
  heading: number;
  latitude: number;
  longitude: number;
  simDisabled: number;
  simRate: number;
}
