// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Persistent Settings Store
// JSON-backed config in %APPDATA%/AeroSphere Studio
// ═══════════════════════════════════════════════════════

import { readFileSync, writeFileSync, mkdirSync, existsSync, watchFile, unwatchFile } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import type { PilotRole } from '../../shared/types';

// ── Settings Schema ──

export interface AppSettings {
  // General
  theme: 'dark';
  communityFolderPath: string;
  autoStart: boolean;

  // LOD Engine
  lodTargetFPS: number;
  lodMinTLOD: number;
  lodMaxTLOD: number;
  lodMinOLOD: number;
  lodMaxOLOD: number;
  lodEnabled: boolean;

  // Shared Cockpit
  defaultRole: PilotRole;
  signalingServerUrl: string;
  pushToTalkKey: string;

  // Career
  pilotName: string;
  startingBalance: number;

  // Internal
  windowBounds: { width: number; height: number; x?: number; y?: number };
}

const DEFAULTS: AppSettings = {
  theme: 'dark',
  communityFolderPath: '',
  autoStart: false,

  lodTargetFPS: 40,
  lodMinTLOD: 100,
  lodMaxTLOD: 400,
  lodMinOLOD: 100,
  lodMaxOLOD: 300,
  lodEnabled: false,

  defaultRole: 'pf',
  signalingServerUrl: 'wss://signal.aerosphere.app',
  pushToTalkKey: 'CapsLock',

  pilotName: 'Pilot',
  startingBalance: 25_000,

  windowBounds: { width: 1280, height: 820 },
};

// ── Store ──

type SettingsKey = keyof AppSettings;

export class SettingsStore {
  private data: AppSettings;
  private readonly filePath: string;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 500;

  constructor() {
    const dir = join(app.getPath('appData'), 'AeroSphere Studio');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.filePath = join(dir, 'settings.json');
    this.data = this.load();
  }

  // ── Public API ──

  get<K extends SettingsKey>(key: K): AppSettings[K] {
    return this.data[key];
  }

  set<K extends SettingsKey>(key: K, value: AppSettings[K]): void {
    this.data[key] = value;
    this.scheduleSave();
  }

  getAll(): Readonly<AppSettings> {
    return { ...this.data };
  }

  setMany(partial: Partial<AppSettings>): void {
    Object.assign(this.data, partial);
    this.scheduleSave();
  }

  reset(): void {
    this.data = { ...DEFAULTS };
    this.saveNow();
  }

  // ── Persistence ──

  private load(): AppSettings {
    if (!existsSync(this.filePath)) {
      const defaults = { ...DEFAULTS };
      this.saveSync(defaults);
      return defaults;
    }

    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      // Merge with defaults so new keys are always present
      return { ...DEFAULTS, ...parsed };
    } catch {
      return { ...DEFAULTS };
    }
  }

  private scheduleSave(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => this.saveNow(), this.DEBOUNCE_MS);
  }

  private saveNow(): void {
    this.saveSync(this.data);
  }

  private saveSync(data: AppSettings): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[SettingsStore] Failed to write settings:', err);
    }
  }

  /** Flush any pending writes (call on app quit). */
  flush(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    this.saveNow();
  }
}

// Singleton
let instance: SettingsStore | null = null;

export function getSettingsStore(): SettingsStore {
  if (!instance) instance = new SettingsStore();
  return instance;
}
