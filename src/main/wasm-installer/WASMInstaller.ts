// ═══════════════════════════════════════════════════════
// AeroSphere Studio — WASM Auto-Installer
// Detects MSFS 2024 Community folder, installs/updates
// the aerosphere-cockpit-bridge WASM package.
// ═══════════════════════════════════════════════════════

import { execSync } from 'child_process';
import { existsSync, readFileSync, cpSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const PACKAGE_NAME = 'aerosphere-cockpit-bridge';
const WASM_SOURCE_DIR = join(__dirname, '../../wasm-module/PackageSources');

interface LayoutJson {
  content: { path: string; size: number; date: number }[];
}

interface ManifestJson {
  package_version: string;
  package_name: string;
  [key: string]: unknown;
}

// ── Registry helper ──

function regQuery(keyPath: string, valueName: string): string | null {
  try {
    const output = execSync(`reg query "${keyPath}" /v ${valueName}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // Output format: "    ValueName    REG_SZ    ValueData"
    const match = output.match(/REG_\w+\s+(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// ── Community folder detection strategies ──

function tryRegistryPath(): string | null {
  const installPath = regQuery(
    'HKLM\\SOFTWARE\\Microsoft\\FlightSimulator',
    'InstallPath',
  );
  if (!installPath) return null;
  const community = join(installPath, 'Community');
  return existsSync(community) ? community : null;
}

function trySteamPath(): string | null {
  const steamPath = regQuery(
    'HKCU\\SOFTWARE\\Valve\\Steam',
    'SteamPath',
  );
  if (!steamPath) return null;

  const community = join(
    steamPath.replace(/\//g, '\\'),
    'steamapps', 'common', 'MicrosoftFlightSimulator2024', 'Community',
  );
  return existsSync(community) ? community : null;
}

function tryMsStorePath(): string | null {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;

  const packagesDir = join(localAppData, 'Packages');
  if (!existsSync(packagesDir)) return null;

  try {
    const entries = readdirSync(packagesDir);
    const msfsDir = entries.find((e) => e.startsWith('Microsoft.Limitless'));
    if (!msfsDir) return null;

    const community = join(
      packagesDir, msfsDir, 'LocalCache', 'Packages', 'Community',
    );
    return existsSync(community) ? community : null;
  } catch {
    return null;
  }
}

// ── Public API ──

export function findCommunityFolder(userConfiguredPath?: string): string | null {
  // 1. Registry (direct install)
  const reg = tryRegistryPath();
  if (reg) return reg;

  // 2. Steam
  const steam = trySteamPath();
  if (steam) return steam;

  // 3. Microsoft Store
  const store = tryMsStorePath();
  if (store) return store;

  // 4. User-configured fallback
  if (userConfiguredPath && existsSync(userConfiguredPath)) {
    return resolve(userConfiguredPath);
  }

  return null;
}

export function isInstalled(communityFolder: string): boolean {
  const packageDir = join(communityFolder, PACKAGE_NAME);
  return existsSync(packageDir) && existsSync(join(packageDir, 'manifest.json'));
}

export function getInstalledVersion(communityFolder: string): string | null {
  const manifestPath = join(communityFolder, PACKAGE_NAME, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  try {
    const manifest: ManifestJson = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return manifest.package_version ?? null;
  } catch {
    return null;
  }
}

export function getSourceVersion(): string | null {
  const manifestPath = join(WASM_SOURCE_DIR, 'manifest.json');
  if (!existsSync(manifestPath)) return null;

  try {
    const manifest: ManifestJson = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    return manifest.package_version ?? null;
  } catch {
    return null;
  }
}

export function needsUpdate(communityFolder: string): boolean {
  const installed = getInstalledVersion(communityFolder);
  const source = getSourceVersion();
  if (!installed || !source) return true;
  return installed !== source;
}

export function install(communityFolder: string): void {
  if (!existsSync(WASM_SOURCE_DIR)) {
    throw new Error(`WASM source not found at ${WASM_SOURCE_DIR}`);
  }

  const targetDir = join(communityFolder, PACKAGE_NAME);
  cpSync(WASM_SOURCE_DIR, targetDir, { recursive: true });
}

export function getInstallStatus(communityFolder: string | null) {
  if (!communityFolder) {
    return { found: false, installed: false, version: null, needsUpdate: false } as const;
  }

  const installed = isInstalled(communityFolder);
  return {
    found: true,
    installed,
    version: installed ? getInstalledVersion(communityFolder) : null,
    needsUpdate: installed ? needsUpdate(communityFolder) : false,
  } as const;
}
