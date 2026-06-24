// ═══════════════════════════════════════════════════════
// AeroSphere Studio — IPC Handlers (all subsystems)
// ═══════════════════════════════════════════════════════

import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import type { LODSettings, PilotRole } from '../../shared/types';
import type { SimConnectManager } from '../simconnect/SimConnectManager';
import type { LODPatcher } from '../memory/LODPatcher';
import type { DynamicLODController } from '../lod-engine/DynamicLODController';
import type { SignalingClient } from '../networking/SignalingClient';
import type { PeerManager } from '../networking/PeerManager';
import type AutoLearnEngine from '../shared-cockpit/AutoLearnEngine';
import type ControlAuthority from '../shared-cockpit/ControlAuthority';
import type ProfileManager from '../shared-cockpit/ProfileManager';
import type CareerDatabase from '../career/CareerDatabase';
import type { SettingsStore } from '../settings/SettingsStore';
import type { FirebaseAuthManager } from '../cloud/FirebaseAuthManager';

export interface Managers {
  simConnect: SimConnectManager;
  lodPatcher: LODPatcher;
  lodController: DynamicLODController;
  signaling: SignalingClient;
  peerManager: PeerManager;
  autoLearn: AutoLearnEngine;
  controlAuthority: ControlAuthority;
  profileManager: ProfileManager;
  careerDb: CareerDatabase;
  settings: SettingsStore;
  auth: FirebaseAuthManager;
}

export function registerAllHandlers(managers: Managers): void {
  const {
    lodPatcher, lodController, signaling, peerManager,
    autoLearn, controlAuthority, profileManager, careerDb, settings, auth,
  } = managers;

  // ── LOD ──

  ipcMain.handle(IPC.LOD_STATE, () => {
    try {
      return {
        currentTLOD: lodPatcher.isReady ? lodPatcher.getTLOD() : 0,
        currentOLOD: lodPatcher.isReady ? lodPatcher.getOLOD() : 0,
        isPatched: lodPatcher.isReady,
      };
    } catch {
      return { currentTLOD: 0, currentOLOD: 0, isPatched: false };
    }
  });

  ipcMain.handle(IPC.LOD_GET_SETTINGS, () => settings.getAll());

  ipcMain.handle(IPC.LOD_SET_SETTINGS, (_e, partial: Partial<LODSettings>) => {
    const merged: LODSettings = {
      targetFPS: partial.targetFPS ?? settings.get('lodTargetFPS'),
      minTLOD: partial.minTLOD ?? settings.get('lodMinTLOD'),
      maxTLOD: partial.maxTLOD ?? settings.get('lodMaxTLOD'),
      minOLOD: partial.minOLOD ?? settings.get('lodMinOLOD'),
      maxOLOD: partial.maxOLOD ?? settings.get('lodMaxOLOD'),
      enabled: partial.enabled ?? settings.get('lodEnabled'),
    };
    lodController.setSettings(merged);
    settings.setMany({
      lodTargetFPS: merged.targetFPS,
      lodMinTLOD: merged.minTLOD,
      lodMaxTLOD: merged.maxTLOD,
      lodMinOLOD: merged.minOLOD,
      lodMaxOLOD: merged.maxOLOD,
      lodEnabled: merged.enabled,
    });
    return merged;
  });

  ipcMain.handle(IPC.LOD_TOGGLE, (_e, enabled: boolean) => {
    settings.set('lodEnabled', enabled);
    return { enabled };
  });

  // ── Shared Cockpit ──

  ipcMain.handle(IPC.COCKPIT_CREATE_ROOM, (_e, name?: string) => {
    signaling.connect();
    signaling.once('connected', () => signaling.createRoom(name ?? settings.get('pilotName')));
  });

  ipcMain.handle(IPC.COCKPIT_JOIN_ROOM, (_e, code: string, name?: string) => {
    signaling.connect();
    signaling.once('connected', () => signaling.joinRoom(code, name ?? settings.get('pilotName')));
  });

  ipcMain.handle(IPC.COCKPIT_DISCONNECT, () => {
    peerManager.destroy();
    signaling.disconnect();
  });

  ipcMain.handle(IPC.COCKPIT_SET_ROLE, (_e, role: PilotRole) => {
    controlAuthority.setRole(role);
    return { role: controlAuthority.getRole() };
  });

  // ── Auto-Learn ──

  ipcMain.handle(IPC.LEARN_START, (_e, allVars: Record<string, number>) => {
    autoLearn.startLearning(allVars);
    return { started: true };
  });

  ipcMain.handle(IPC.LEARN_CAPTURE, (_e, allVars: Record<string, number>) => {
    return autoLearn.captureAfterClick(allVars);
  });

  ipcMain.handle(IPC.LEARN_EXPORT, (_e, aircraftTitle: string) => {
    const profile = autoLearn.exportProfile(aircraftTitle);
    profileManager.saveProfile(profile).catch(console.error);
    return profile;
  });

  // ── Career ──

  ipcMain.handle(IPC.CAREER_GET_PILOT, () => {
    try { return careerDb.getPilot() ?? null; } catch { return null; }
  });

  ipcMain.handle(IPC.CAREER_GET_MISSIONS, (_e, status?: string) => {
    try {
      return careerDb.getMissions(status as any);
    } catch { return []; }
  });

  ipcMain.handle(IPC.CAREER_ACCEPT_MISSION, (_e, missionId: number) => {
    try { return careerDb.getMission(missionId) ?? null; } catch { return null; }
  });

  ipcMain.handle(IPC.CAREER_GET_FLEET, () => {
    try { return careerDb.getFleet(); } catch { return []; }
  });

  ipcMain.handle(IPC.CAREER_GET_TRANSACTIONS, (_e, limit?: number) => {
    try { return careerDb.getTransactions(limit); } catch { return []; }
  });

  // ── App ──

  ipcMain.handle(IPC.APP_VERSION, () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { version } = require('../../../package.json') as { version: string };
    return version;
  });

  ipcMain.handle(IPC.APP_MINIMIZE, () => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
  });

  ipcMain.handle(IPC.APP_CLOSE, () => {
    const { BrowserWindow } = require('electron');
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
  });

  // ── Auth ──

  ipcMain.handle(IPC.AUTH_SIGN_UP, async (_e, email, password, username) => {
    return auth.signUpWithEmail(email, password, username);
  });

  ipcMain.handle(IPC.AUTH_SIGN_IN, async (_e, email, password) => {
    return auth.signInWithEmail(email, password);
  });

  ipcMain.handle(IPC.AUTH_SIGN_OUT, async () => {
    return auth.signOut();
  });

  ipcMain.handle(IPC.AUTH_STATE, () => {
    const user = auth.getCurrentUser();
    return {
      user: user ? { uid: user.uid, displayName: user.displayName, email: user.email } : null,
      loading: false,
    };
  });
}
