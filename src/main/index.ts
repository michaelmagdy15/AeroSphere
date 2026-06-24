// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Main Process Entry Point
// Initialises ALL subsystem managers and wires IPC
// ═══════════════════════════════════════════════════════

import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { autoUpdater } from 'electron-updater';
import { IPC } from '../shared/ipc-channels';
import { SIMCONNECT_RETRY_MS, LOD_UPDATE_INTERVAL_MS } from '../shared/constants';
import type { Telemetry, LODSettings } from '../shared/types';

// ── Manager imports ──

import { SimConnectManager } from './simconnect/SimConnectManager';
import { LODPatcher } from './memory/LODPatcher';
import { DynamicLODController } from './lod-engine/DynamicLODController';
import { FPSMonitor } from './lod-engine/FPSMonitor';

import { SignalingClient } from './networking/SignalingClient';
import { PeerManager } from './networking/PeerManager';

import AutoLearnEngine from './shared-cockpit/AutoLearnEngine';
import ControlAuthority from './shared-cockpit/ControlAuthority';
import ProfileManager from './shared-cockpit/ProfileManager';

import CareerDatabase from './career/CareerDatabase';

import { getSettingsStore } from './settings/SettingsStore';
import * as WASMInstaller from './wasm-installer/WASMInstaller';
import { FirebaseAuthManager } from './cloud/FirebaseAuthManager';

import { registerAllHandlers, type Managers } from './ipc/handlers';

// ── App state ──

let mainWindow: BrowserWindow | null = null;
let reconnectTimer: ReturnType<typeof setInterval> | null = null;
let lodUpdateTimer: ReturnType<typeof setInterval> | null = null;
let lastTelemetry: Telemetry | null = null;

// ── Window ──

function createWindow(): BrowserWindow {
  const settings = getSettingsStore();
  const bounds = settings.get('windowBounds');

  const win = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    ...(bounds.x !== undefined && { x: bounds.x }),
    ...(bounds.y !== undefined && { y: bounds.y }),
    frame: false,
    backgroundColor: '#0a0e17',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // electron-vite: dev server vs production file
  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => win.show());

  // Persist window bounds on resize/move
  win.on('resized', () => settings.set('windowBounds', win.getBounds()));
  win.on('moved', () => settings.set('windowBounds', win.getBounds()));

  return win;
}

// ── SimConnect reconnect loop ──

function startReconnectLoop(simConnect: SimConnectManager): void {
  const tryConnect = async () => {
    if (simConnect.isConnected()) return;
    try {
      await simConnect.connect();
    } catch {
      // SimConnectManager handles its own reconnect scheduling,
      // but we still retry from the outer loop as a safety net.
    }
    mainWindow?.webContents.send(IPC.SIM_STATUS, simConnect.isConnected());
  };
  tryConnect();
  reconnectTimer = setInterval(tryConnect, SIMCONNECT_RETRY_MS);
}

// ── LOD update loop ──

function startLODUpdateLoop(
  simConnect: SimConnectManager,
  lodPatcher: LODPatcher,
  lodController: DynamicLODController,
  fpsMonitor: FPSMonitor,
): void {
  lodUpdateTimer = setInterval(() => {
    fpsMonitor.tick();
    if (!mainWindow || !simConnect.isConnected() || !lodPatcher.isReady) return;

    try {
      const fps = fpsMonitor.getCurrentFPS();
      const telemetry = lastTelemetry;
      if (!telemetry) return;

      const targets = lodController.update(telemetry, fps);
      lodPatcher.setTLOD(targets.tlod);
      lodPatcher.setOLOD(targets.olod);

      mainWindow.webContents.send(IPC.LOD_STATE, {
        currentTLOD: lodPatcher.getTLOD(),
        currentOLOD: lodPatcher.getOLOD(),
        currentFPS: fps,
        targetFPS: 0, // read from settings if needed
        phase: targets.phase,
        cloudQuality: targets.cloudQuality,
        isConnected: simConnect.isConnected(),
        isPatched: lodPatcher.isReady,
      });
    } catch (err) {
      console.error('[LODLoop]', err);
    }
  }, LOD_UPDATE_INTERVAL_MS);
}

// ── WASM auto-install ──

function autoInstallWASM(): void {
  const settings = getSettingsStore();
  try {
    const communityFolder = WASMInstaller.findCommunityFolder(
      settings.get('communityFolderPath') || undefined,
    );
    if (!communityFolder) {
      console.warn('[WASM] Community folder not found — skipping auto-install');
      return;
    }
    if (!WASMInstaller.isInstalled(communityFolder) || WASMInstaller.needsUpdate(communityFolder)) {
      console.log('[WASM] Installing/updating cockpit bridge module…');
      WASMInstaller.install(communityFolder);
      console.log('[WASM] Done.');
    }
  } catch (err) {
    console.error('[WASM] Auto-install failed:', err);
  }
}

// ── Cleanup ──

function cleanup(
  simConnect: SimConnectManager,
  lodPatcher: LODPatcher,
  signaling: SignalingClient,
  peerManager: PeerManager,
  careerDb: CareerDatabase,
): void {
  if (reconnectTimer) clearInterval(reconnectTimer);
  if (lodUpdateTimer) clearInterval(lodUpdateTimer);

  try { lodPatcher.restoreDefaults(); } catch { /* not initialised */ }
  try { lodPatcher.detach(); } catch { /* already detached */ }
  simConnect.disconnect();
  peerManager.destroy();
  signaling.disconnect();

  try { careerDb.close(); } catch { /* already closed */ }

  getSettingsStore().flush();
}

// ═══════════════════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════════════════

app.whenReady().then(() => {
  // 1. Settings (must be first — others read config from it)
  const settings = getSettingsStore();

  // 2. BrowserWindow
  mainWindow = createWindow();

  // 3. WASM auto-installer
  autoInstallWASM();

  // 4. SimConnect + LOD
  const simConnect = new SimConnectManager();
  const lodPatcher = new LODPatcher();
  const lodController = new DynamicLODController();
  const fpsMonitor = new FPSMonitor();

  // Apply persisted LOD settings
  const lodSettings: LODSettings = {
    targetFPS: settings.get('lodTargetFPS'),
    minTLOD: settings.get('lodMinTLOD'),
    maxTLOD: settings.get('lodMaxTLOD'),
    minOLOD: settings.get('lodMinOLOD'),
    maxOLOD: settings.get('lodMaxOLOD'),
    enabled: settings.get('lodEnabled'),
  };
  lodController.setSettings(lodSettings);

  // Cache telemetry for LOD loop
  simConnect.onTelemetry((t: Telemetry) => {
    lastTelemetry = t;
    mainWindow?.webContents.send(IPC.SIM_TELEMETRY, t);
  });

  // Attach LODPatcher once SimConnect connects (MSFS is running)
  simConnect.on('connected', () => {
    try {
      if (!lodPatcher.isReady) lodPatcher.initialize();
    } catch (err) {
      console.error('[LODPatcher] Init failed:', err);
    }
    mainWindow?.webContents.send(IPC.SIM_STATUS, true);
  });

  simConnect.on('disconnected', () => {
    mainWindow?.webContents.send(IPC.SIM_STATUS, false);
  });

  // 5. Networking
  const signalingUrl = settings.get('signalingServerUrl') || 'ws://localhost:8080';
  const signaling = new SignalingClient(signalingUrl);
  const peerManager = new PeerManager(signaling);

  // Forward connection state to renderer
  signaling.on('connected', () => {
    mainWindow?.webContents.send(IPC.COCKPIT_CONNECTION_STATE, { status: 'connected' });
  });
  signaling.on('disconnected', () => {
    mainWindow?.webContents.send(IPC.COCKPIT_CONNECTION_STATE, { status: 'disconnected' });
  });

  // 6. Career
  const careerDbPath = join(app.getPath('userData'), 'career.db');
  const careerDb = new CareerDatabase(careerDbPath);
  try {
    careerDb.runMigrations();
    careerDb.seedData();
  } catch (err) {
    console.error('[Career] DB init failed:', err);
  }

  // 7. Shared Cockpit subsystems
  const autoLearn = new AutoLearnEngine();
  const profileManager = new ProfileManager();
  const controlAuthority = new ControlAuthority();

  // Apply default role from settings
  controlAuthority.setRole(settings.get('defaultRole'));

  // 7b. Authentication Manager
  const auth = new FirebaseAuthManager();
  auth.onAuthStateChanged((state) => {
    mainWindow?.webContents.send(IPC.AUTH_STATE, state);
  });

  // 8. Register ALL IPC handlers
  const managers: Managers = {
    simConnect,
    lodPatcher,
    lodController,
    signaling,
    peerManager,
    autoLearn,
    controlAuthority,
    profileManager,
    careerDb,
    settings,
    auth,
  };
  registerAllHandlers(managers);

  // 9. Start loops
  startReconnectLoop(simConnect);
  startLODUpdateLoop(simConnect, lodPatcher, lodController, fpsMonitor);

  // 10. Auto-updater setup
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates...');
    mainWindow?.webContents.send('update:status', { status: 'checking' });
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    mainWindow?.webContents.send('update:status', { status: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Update not available.');
    mainWindow?.webContents.send('update:status', { status: 'not-available' });
  });
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error in auto-updater:', err);
    mainWindow?.webContents.send('update:status', { status: 'error', message: err.message });
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded. Will install on restart.');
    mainWindow?.webContents.send('update:status', { status: 'downloaded', version: info.version });
    setTimeout(() => {
      autoUpdater.quitAndInstall();
    }, 5000);
  });

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.error('[AutoUpdater] Check failed:', err);
    });
  } else {
    console.log('[AutoUpdater] Running in development mode. Auto-updater will check once packaged.');
  }

  // ── Cleanup on quit ──
  const doCleanup = () => cleanup(simConnect, lodPatcher, signaling, peerManager, careerDb);

  app.on('window-all-closed', () => {
    doCleanup();
    app.quit();
  });

  app.on('before-quit', doCleanup);
});
