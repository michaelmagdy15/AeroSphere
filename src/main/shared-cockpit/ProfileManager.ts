// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Profile Manager
// CRUD + cloud sync for aircraft profiles
// ═══════════════════════════════════════════════════════

import { promises as fs } from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { AircraftProfile } from '../../shared/types';
import { validateProfile } from './profiles/ProfileSchema';

const DEFAULTS_DIR = path.join(__dirname, 'profiles', 'defaults');
const USER_DIR = path.join(app.getPath('userData'), 'profiles');
const CLOUD_API_BASE = 'https://api.aerosphere.studio/v1/profiles';

export default class ProfileManager {
  constructor() {
    // Ensure user profile directory exists
    const { mkdirSync } = require('fs') as typeof import('fs');
    mkdirSync(USER_DIR, { recursive: true });
  }

  /** Load a profile by aircraft title — checks user dir first, then defaults. */
  async loadProfile(aircraftTitle: string): Promise<AircraftProfile | null> {
    const filename = this.titleToFilename(aircraftTitle);

    // User profiles take priority
    const userPath = path.join(USER_DIR, filename);
    const profile = await this.readProfile(userPath);
    if (profile) return profile;

    // Fall back to built-in defaults
    const defaultPath = path.join(DEFAULTS_DIR, filename);
    return this.readProfile(defaultPath);
  }

  /** Save a profile to the user profiles directory. */
  async saveProfile(profile: AircraftProfile): Promise<void> {
    const result = validateProfile(profile);
    if (!result.valid) {
      throw new Error(`Invalid profile: ${result.errors.join('; ')}`);
    }
    const filename = this.titleToFilename(profile.aircraftTitle);
    const filePath = path.join(USER_DIR, filename);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2), 'utf-8');
  }

  /** List all available profiles from both directories. */
  async listProfiles(): Promise<Array<{ title: string; source: 'default' | 'user'; verified: boolean }>> {
    const results: Array<{ title: string; source: 'default' | 'user'; verified: boolean }> = [];
    const seen = new Set<string>();

    // User profiles first (they override defaults in the list)
    for (const { dir, source } of [
      { dir: USER_DIR, source: 'user' as const },
      { dir: DEFAULTS_DIR, source: 'default' as const },
    ]) {
      const files = await this.safeReadDir(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const profile = await this.readProfile(path.join(dir, file));
        if (profile && !seen.has(profile.aircraftTitle)) {
          seen.add(profile.aircraftTitle);
          results.push({ title: profile.aircraftTitle, source, verified: profile.verified });
        }
      }
    }

    return results;
  }

  /** Delete a user-created profile. Cannot delete built-in defaults. */
  async deleteProfile(aircraftTitle: string): Promise<boolean> {
    const filename = this.titleToFilename(aircraftTitle);
    const filePath = path.join(USER_DIR, filename);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /** Stub: Download a profile from cloud. */
  async downloadProfile(aircraftTitle: string): Promise<AircraftProfile | null> {
    try {
      console.log(`[ProfileManager] Cloud download stub: ${CLOUD_API_BASE}/${encodeURIComponent(aircraftTitle)}`);
      const res = await fetch(`${CLOUD_API_BASE}/${encodeURIComponent(aircraftTitle)}`);
      if (!res.ok) return null;
      const data: unknown = await res.json();
      const result = validateProfile(data);
      return result.valid ? (data as AircraftProfile) : null;
    } catch {
      console.warn('[ProfileManager] Cloud API unavailable — running in offline mode');
      return null;
    }
  }

  /** Stub: Upload a profile to cloud. */
  async uploadProfile(profile: AircraftProfile): Promise<boolean> {
    try {
      console.log(`[ProfileManager] Cloud upload stub: ${CLOUD_API_BASE}`);
      const res = await fetch(CLOUD_API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      return res.ok;
    } catch {
      console.warn('[ProfileManager] Cloud API unavailable — running in offline mode');
      return false;
    }
  }

  // ── Private helpers ──

  private titleToFilename(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '') + '.json';
  }

  private async readProfile(filePath: string): Promise<AircraftProfile | null> {
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      const data: unknown = JSON.parse(raw);
      const result = validateProfile(data);
      return result.valid ? (data as AircraftProfile) : null;
    } catch {
      return null;
    }
  }

  private async safeReadDir(dir: string): Promise<string[]> {
    try {
      return await fs.readdir(dir);
    } catch {
      return [];
    }
  }
}
