import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { LODSettings, LODState, Telemetry } from '../shared/types';

const listeners = new Map<string, Map<(...args: any[]) => void, (_e: any, ...args: any[]) => void>>();

const api = {
  // Request/response
  getLODState: (): Promise<LODState> => ipcRenderer.invoke(IPC.LOD_STATE),
  getLODSettings: (): Promise<LODSettings> => ipcRenderer.invoke(IPC.LOD_GET_SETTINGS),
  setLODSettings: (settings: Partial<LODSettings>): Promise<LODSettings> =>
    ipcRenderer.invoke(IPC.LOD_SET_SETTINGS, settings),
  toggleLOD: (enabled: boolean): Promise<{ enabled: boolean }> =>
    ipcRenderer.invoke(IPC.LOD_TOGGLE, enabled),

  // Push subscriptions (main → renderer)
  onTelemetry: (cb: (data: Telemetry) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, data: Telemetry) => cb(data);
    ipcRenderer.on(IPC.SIM_TELEMETRY, handler);
    return () => ipcRenderer.removeListener(IPC.SIM_TELEMETRY, handler);
  },
  onLODState: (cb: (state: LODState) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: LODState) => cb(state);
    ipcRenderer.on(IPC.LOD_STATE, handler);
    return () => ipcRenderer.removeListener(IPC.LOD_STATE, handler);
  },
  onSimStatus: (cb: (connected: boolean) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, connected: boolean) => cb(connected);
    ipcRenderer.on(IPC.SIM_STATUS, handler);
    return () => ipcRenderer.removeListener(IPC.SIM_STATUS, handler);
  },

  // Window Controls
  minimize: (): Promise<void> => ipcRenderer.invoke(IPC.APP_MINIMIZE),
  close: (): Promise<void> => ipcRenderer.invoke(IPC.APP_CLOSE),

  // Authentication
  signUp: (email: string, password: string, username: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.AUTH_SIGN_UP, email, password, username),
  signIn: (email: string, password: string): Promise<unknown> =>
    ipcRenderer.invoke(IPC.AUTH_SIGN_IN, email, password),
  signOut: (): Promise<void> => ipcRenderer.invoke(IPC.AUTH_SIGN_OUT),
  getAuthState: (): Promise<unknown> => ipcRenderer.invoke(IPC.AUTH_STATE),
  onAuthState: (cb: (state: any) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, state: any) => cb(state);
    ipcRenderer.on(IPC.AUTH_STATE, handler);
    return () => ipcRenderer.removeListener(IPC.AUTH_STATE, handler);
  },

  // Generic IPC Bridge to support hooks
  getAppVersion: (): Promise<string> => ipcRenderer.invoke(IPC.APP_VERSION),
  invoke: (channel: string, ...args: any[]): Promise<any> => ipcRenderer.invoke(channel, ...args),
  on: (channel: string, cb: (...args: any[]) => void) => {
    const handler = (_e: any, ...args: any[]) => cb(...args);
    if (!listeners.has(channel)) {
      listeners.set(channel, new Map());
    }
    listeners.get(channel)!.set(cb, handler);
    ipcRenderer.on(channel, handler);
  },
  off: (channel: string, cb: (...args: any[]) => void) => {
    const channelListeners = listeners.get(channel);
    if (channelListeners) {
      const handler = channelListeners.get(cb);
      if (handler) {
        ipcRenderer.removeListener(channel, handler);
        channelListeners.delete(cb);
      }
    }
  },
} as const;

export type AeroSphereAPI = typeof api;

contextBridge.exposeInMainWorld('aerosphere', api);
