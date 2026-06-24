// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Constants & Enums
// ═══════════════════════════════════════════════════════

export const APP_NAME = 'AeroSphere Studio';
export const APP_VERSION = '0.1.0';

// SimConnect
export const SIMCONNECT_RETRY_MS = 5000;
export const SIMCONNECT_APP_NAME = 'AeroSphere';

// LOD Engine
export const LOD_UPDATE_INTERVAL_MS = 1000;
export const LOD_DEFAULT_TARGET_FPS = 40;
export const LOD_MIN_TLOD = 10;
export const LOD_MAX_TLOD = 1000;
export const LOD_MIN_OLOD = 10;
export const LOD_MAX_OLOD = 500;

// PID Controller Gains
export const PID_KP = 2.0;
export const PID_KI = 0.1;
export const PID_KD = 0.5;

// Memory Scanner
export const MSFS_PROCESS_NAME = 'FlightSimulator.exe';
export const MSFS_TLOD_VALID_MIN = 10;
export const MSFS_TLOD_VALID_MAX = 1500;

// Networking
export const SIGNALING_URL = 'wss://signal.aerosphere.app';
export const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
];
export const JOIN_CODE_LENGTH = 6;
export const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const SYNC_RATE_HZ = 30;
export const STATE_EPSILON = 0.001;

// Career
export const STARTING_BALANCE = 25000;
export const MISSION_BATCH_SIZE = 10;
export const MISSION_EXPIRE_HOURS = 24;
export const FUEL_PRICE_UPDATE_HOURS = 6;
export const HAVERSINE_EARTH_RADIUS_NM = 3440.065;
