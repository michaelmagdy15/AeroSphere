// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Profile Schema Validation
// ═══════════════════════════════════════════════════════

import type { AircraftProfile, ControlMapping } from '../../../shared/types';

export const CURRENT_SCHEMA_VERSION = 1;

const VALID_SYNC_MODES = new Set(['continuous', 'on-change']);
const VALID_VAR_TYPES = new Set(['lvar', 'simvar', 'input_event', 'kevent']);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate arbitrary data against the AircraftProfile schema. */
export function validateProfile(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Profile must be a non-null object'] };
  }

  const obj = data as Record<string, unknown>;

  // Required top-level fields
  if (typeof obj.aircraftTitle !== 'string' || !obj.aircraftTitle) {
    errors.push('aircraftTitle must be a non-empty string');
  }

  if (typeof obj.version !== 'number') {
    errors.push('version must be a number');
  } else if (obj.version > CURRENT_SCHEMA_VERSION) {
    errors.push(`version ${obj.version} exceeds current schema version ${CURRENT_SCHEMA_VERSION}`);
  }

  if (obj.createdAt !== undefined) {
    if (typeof obj.createdAt !== 'string' || isNaN(Date.parse(obj.createdAt))) {
      errors.push('createdAt must be a valid ISO 8601 date string');
    }
  }

  if (!Array.isArray(obj.mappings)) {
    errors.push('mappings must be an array');
    return { valid: errors.length === 0, errors };
  }

  // Validate each mapping
  const seen = new Set<string>();
  for (let i = 0; i < obj.mappings.length; i++) {
    const m = obj.mappings[i] as Record<string, unknown>;
    const prefix = `mappings[${i}]`;

    if (!m || typeof m !== 'object') {
      errors.push(`${prefix}: must be an object`);
      continue;
    }

    if (typeof m.varName !== 'string' || !m.varName) {
      errors.push(`${prefix}.varName: must be a non-empty string`);
    } else if (seen.has(m.varName)) {
      errors.push(`${prefix}.varName: duplicate entry '${m.varName}'`);
    } else {
      seen.add(m.varName);
    }

    if (typeof m.varType !== 'string' || !VALID_VAR_TYPES.has(m.varType)) {
      errors.push(`${prefix}.varType: must be one of ${[...VALID_VAR_TYPES].join(', ')}`);
    }

    if (typeof m.canonicalControl !== 'string' || !m.canonicalControl) {
      errors.push(`${prefix}.canonicalControl: must be a non-empty string`);
    }

    if (typeof m.syncMode !== 'string' || !VALID_SYNC_MODES.has(m.syncMode)) {
      errors.push(`${prefix}.syncMode: must be one of ${[...VALID_SYNC_MODES].join(', ')}`);
    }

    if (m.confidence !== undefined) {
      if (typeof m.confidence !== 'number' || m.confidence < 0 || m.confidence > 1) {
        errors.push(`${prefix}.confidence: must be a number between 0 and 1`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Coerce raw data to a valid AircraftProfile, filling in defaults. */
export function sanitizeProfile(data: Record<string, unknown>): AircraftProfile {
  const mappings: ControlMapping[] = [];

  if (Array.isArray(data.mappings)) {
    for (const raw of data.mappings) {
      if (!raw || typeof raw !== 'object') continue;
      const m = raw as Record<string, unknown>;
      mappings.push({
        varName: String(m.varName ?? ''),
        varType: VALID_VAR_TYPES.has(String(m.varType)) ? (m.varType as ControlMapping['varType']) : 'lvar',
        canonicalControl: String(m.canonicalControl ?? ''),
        syncMode: VALID_SYNC_MODES.has(String(m.syncMode)) ? (m.syncMode as ControlMapping['syncMode']) : 'on-change',
        interpolate: Boolean(m.interpolate),
        confidence: typeof m.confidence === 'number' ? Math.max(0, Math.min(1, m.confidence)) : 0.5,
        isDiscrete: m.isDiscrete !== undefined ? Boolean(m.isDiscrete) : true,
      });
    }
  }

  return {
    aircraftTitle: String(data.aircraftTitle ?? 'Unknown Aircraft'),
    version: typeof data.version === 'number' ? data.version : CURRENT_SCHEMA_VERSION,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    verified: Boolean(data.verified),
    mappings,
  };
}
