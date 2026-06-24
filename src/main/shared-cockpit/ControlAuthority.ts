// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Control Authority
// PF / PM / Observer role-based control access
// ═══════════════════════════════════════════════════════

import type { PilotRole, ControlMapping } from '../../shared/types';

export type ControlCategory = 'flight' | 'systems' | 'shared';

interface TransferRecord {
  from: PilotRole;
  to: PilotRole;
  timestamp: number;
}

/** PF owns flight-critical controls. */
const DEFAULT_PF_CONTROLS = new Set<string>([
  'THROTTLE', 'MIXTURE', 'PROP_RPM', 'FLAPS', 'GEAR_HANDLE', 'SPOILERS',
  'PARKING_BRAKE', 'AUTOBRAKE', 'TRIM_ELEVATOR', 'TRIM_AILERON', 'TRIM_RUDDER',
  'AUTOPILOT_MASTER', 'AUTOTHROTTLE', 'HEADING_BUG', 'ALTITUDE_BUG',
  'SPEED_BUG', 'VS_BUG', 'NAV_MODE', 'APPROACH_MODE', 'FD_SWITCH',
]);

/** PM owns systems, radios, lights. */
const DEFAULT_PM_CONTROLS = new Set<string>([
  'LANDING_LIGHTS', 'TAXI_LIGHTS', 'NAV_LIGHTS', 'BEACON_LIGHTS',
  'STROBE_LIGHTS', 'WING_LIGHTS', 'LOGO_LIGHTS', 'RUNWAY_TURNOFF_LIGHTS',
  'DOME_LIGHT', 'PANEL_LIGHTS', 'PEDESTAL_LIGHTS', 'FLOOD_LIGHTS',
  'NAV1_FREQ', 'NAV2_FREQ', 'COM1_FREQ', 'COM2_FREQ', 'ADF1_FREQ',
  'TRANSPONDER_CODE', 'BAROMETER_SETTING', 'SEATBELT_SIGN', 'NO_SMOKING_SIGN',
  'ECAM_PAGE', 'FMS_1', 'DOOR_MAIN', 'DOOR_CARGO', 'WIPER',
  'ENGINE_STARTER_1', 'ENGINE_STARTER_2', 'ENGINE_STARTER_3', 'ENGINE_STARTER_4',
  'ENGINE_MASTER_1', 'ENGINE_MASTER_2',
  'FUEL_PUMP_1', 'FUEL_PUMP_2', 'FUEL_CROSSFEED',
  'APU_MASTER', 'APU_BLEED', 'IGNITION',
  'PACK_1', 'PACK_2', 'BLEED_1', 'BLEED_2',
  'HYD_PUMP_1', 'HYD_PUMP_2', 'HYD_PUMP_3',
  'ELEC_GEN_1', 'ELEC_GEN_2', 'BATTERY_MASTER',
  'MASTER_CAUTION', 'MASTER_WARNING',
  'CABIN_TEMP', 'COURSE_1', 'COURSE_2',
]);

export default class ControlAuthority {
  private currentRole: PilotRole = 'pf';
  private readonly overrides = new Map<string, PilotRole>();
  private readonly systemGroupOverrides = new Map<string, PilotRole>();
  private readonly transferLog: TransferRecord[] = [];

  setRole(role: PilotRole): void {
    this.currentRole = role;
  }

  getRole(): PilotRole {
    return this.currentRole;
  }

  /**
   * Check whether a given role can modify a canonical control.
   * Observer can NEVER modify anything.
   * Per-control overrides take priority, then system-group overrides, then defaults.
   */
  canControl(canonicalControl: string, role: PilotRole): boolean {
    if (role === 'observer') return false;

    // Per-control override
    const override = this.overrides.get(canonicalControl);
    if (override) return role === override;

    // Default authority sets
    if (DEFAULT_PF_CONTROLS.has(canonicalControl)) return role === 'pf';
    if (DEFAULT_PM_CONTROLS.has(canonicalControl)) return role === 'pm';

    // Unknown controls are shared — both PF and PM can use
    return true;
  }

  /** Mid-flight role swap (e.g., Captain hands over to FO). */
  transferControl(fromRole: PilotRole, toRole: PilotRole): void {
    this.transferLog.push({ from: fromRole, to: toRole, timestamp: Date.now() });
    if (this.currentRole === fromRole) {
      this.currentRole = toRole;
    }
  }

  /** Set a per-control override (e.g., PM takes gear during training). */
  setOverride(canonicalControl: string, role: PilotRole): void {
    this.overrides.set(canonicalControl, role);
  }

  clearOverride(canonicalControl: string): void {
    this.overrides.delete(canonicalControl);
  }

  /** Bulk clear all overrides. */
  clearAllOverrides(): void {
    this.overrides.clear();
    this.systemGroupOverrides.clear();
  }

  /** Load custom authority rules from a profile's mappings (future: systemGroup field). */
  loadOverridesFromProfile(_mappings: ControlMapping[]): void {
    // Reserved for per-system-group authority from profile data
  }

  getControlCategory(canonicalControl: string): ControlCategory {
    if (DEFAULT_PF_CONTROLS.has(canonicalControl)) return 'flight';
    if (DEFAULT_PM_CONTROLS.has(canonicalControl)) return 'systems';
    return 'shared';
  }

  getTransferLog(): readonly TransferRecord[] {
    return this.transferLog;
  }
}
