import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc-channels';
import type { LODSettings, LODState, Telemetry } from '../shared/types';

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
} as const;

export type AeroSphereAPI = typeof api;

contextBridge.exposeInMainWorld('aerosphere', api);
