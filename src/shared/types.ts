// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Shared Type Definitions
// ═══════════════════════════════════════════════════════

// ── Telemetry ──
export interface Telemetry {
  altitude: number;        // feet MSL
  altitudeAGL: number;     // feet AGL
  verticalSpeed: number;   // feet per minute
  airspeed: number;        // knots indicated
  heading: number;         // degrees magnetic
  latitude: number;
  longitude: number;
  onGround: boolean;
  isPaused: boolean;
  simRate: number;
}

// ── LOD Engine ──
export type FlightPhase = 'ground' | 'takeoff' | 'climb' | 'cruise' | 'descent' | 'approach';

export type CloudQuality = 'ultra' | 'high' | 'medium' | 'low';

export interface LODTargets {
  tlod: number;
  olod: number;
  cloudQuality: CloudQuality;
  phase: FlightPhase;
}

export interface LODSettings {
  targetFPS: number;
  minTLOD: number;
  maxTLOD: number;
  minOLOD: number;
  maxOLOD: number;
  enabled: boolean;
  vrMode?: boolean;
}

export interface LODState {
  currentTLOD: number;
  currentOLOD: number;
  currentFPS: number;
  targetFPS: number;
  phase: FlightPhase;
  cloudQuality: CloudQuality;
  isConnected: boolean;
  isPatched: boolean;
}

// ── Shared Cockpit ──
export type PilotRole = 'pf' | 'pm' | 'observer';

export interface VarChange {
  varId: number;
  value: number;
}

export interface CockpitStateDelta {
  sequence: number;
  timestamp: number;
  changes: VarChange[];
}

export interface PeerInfo {
  id: string;
  name: string;
  role: PilotRole;
  ping: number;
  latencyMs?: number;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected';
  mode: 'p2p' | 'relay' | 'direct';
  roomCode: string | null;
  peers: PeerInfo[];
}

export interface ControlMapping {
  varName: string;
  varType: 'lvar' | 'simvar' | 'input_event' | 'kevent';
  canonicalControl: string;
  syncMode: 'continuous' | 'on-change';
  interpolate: boolean;
  confidence: number;
  oldValue?: number;
  newValue?: number;
  isDiscrete?: boolean;
}

export interface AircraftProfile {
  aircraftTitle: string;
  /** Alias for aircraftTitle — used by UI components */
  title?: string;
  version: number;
  createdAt: string;
  verified: boolean;
  mappings: ControlMapping[];
  [key: string]: unknown;
}

// ── Career Mode ──
export interface Airport {
  icao: string;
  name: string;
  latitude: number;
  longitude: number;
  elevation_ft: number;
  type: string;
  country: string;
  region: string;
  municipality: string;
  has_jeta: boolean;
  has_avgas: boolean;
  jeta_price: number | null;
  avgas_price: number | null;
}

export type MissionType = 'cargo' | 'passenger' | 'charter' | 'medical' | 'vip' | 'tour';
export type MissionStatus = 'available' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface Mission {
  mission_id?: number;
  type: MissionType;
  origin_icao: string;
  dest_icao: string;
  distance_nm: number;
  payload_lbs: number;
  pax_count: number;
  payout: number;
  deadline: string;
  min_aircraft_category?: string;
  status: MissionStatus;
  description?: string;
}

export interface Aircraft {
  aircraft_id: number;
  type_id: number;
  registration: string;
  location_icao: string;
  condition_pct: number;
  total_hours: number;
  hours_since_mx: number;
  fuel_onboard_gal: number;
  status: 'available' | 'in_flight' | 'maintenance' | 'grounded';
}

export interface Pilot {
  pilot_id: number;
  name: string;
  balance: number;
  xp: number;
  reputation: number;
  license: 'SPL' | 'PPL' | 'CPL' | 'ATPL';
  home_base: string;
  current_location: string;
  total_flights: number;
  total_hours: number;
}

export interface FlightRecord {
  flight_id: number;
  mission_id: number | null;
  aircraft_id: number;
  departure_icao: string;
  arrival_icao: string;
  flight_time_hrs: number;
  fuel_used_gal: number;
  fuel_cost: number;
  landing_rate_fpm: number;
  status: 'completed' | 'diverted' | 'crashed' | 'aborted';
}

export type TransactionCategory =
  | 'mission_payout' | 'fuel' | 'maintenance' | 'landing_fee'
  | 'hangar_rent' | 'aircraft_purchase' | 'aircraft_sale'
  | 'lease_payment' | 'crew_salary' | 'insurance' | 'penalty' | 'bonus';

export interface Transaction {
  txn_id: number;
  category: TransactionCategory;
  amount: number;
  balance_after: number;
  description: string;
  timestamp: string;
}
