// ═══════════════════════════════════════════════════════
// AeroSphere Studio — IPC Channel Definitions
// ═══════════════════════════════════════════════════════

export const IPC = {
  // SimConnect
  SIM_STATUS: 'sim:status',
  SIM_TELEMETRY: 'sim:telemetry',

  // LOD Engine
  LOD_STATE: 'lod:state',
  LOD_SET_SETTINGS: 'lod:set-settings',
  LOD_GET_SETTINGS: 'lod:get-settings',
  LOD_TOGGLE: 'lod:toggle',

  // Shared Cockpit
  COCKPIT_CONNECT: 'cockpit:connect',
  COCKPIT_DISCONNECT: 'cockpit:disconnect',
  COCKPIT_CREATE_ROOM: 'cockpit:create-room',
  COCKPIT_JOIN_ROOM: 'cockpit:join-room',
  COCKPIT_CONNECTION_STATE: 'cockpit:connection-state',
  COCKPIT_SET_ROLE: 'cockpit:set-role',

  // Auto-Learn
  LEARN_START: 'learn:start',
  LEARN_CAPTURE: 'learn:capture',
  LEARN_EXPORT: 'learn:export',
  LEARN_RESULT: 'learn:result',

  // Career
  CAREER_GET_PILOT: 'career:get-pilot',
  CAREER_GET_MISSIONS: 'career:get-missions',
  CAREER_ACCEPT_MISSION: 'career:accept-mission',
  CAREER_GET_FLEET: 'career:get-fleet',
  CAREER_GET_TRANSACTIONS: 'career:get-transactions',
  CAREER_FLIGHT_UPDATE: 'career:flight-update',

  // App
  APP_READY: 'app:ready',
  APP_VERSION: 'app:version',
} as const;

export type IPCChannel = typeof IPC[keyof typeof IPC];
