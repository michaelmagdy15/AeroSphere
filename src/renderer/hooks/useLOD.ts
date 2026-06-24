import { useState, useEffect, useCallback } from 'react';
import type { LODState, LODSettings } from '@shared/types';
import { IPC } from '@shared/ipc-channels';

interface AeroSphereAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): void;
  off(channel: string, callback: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    aerosphere?: AeroSphereAPI;
  }
}

const MOCK_LOD_STATE: LODState = {
  currentTLOD: 200,
  currentOLOD: 150,
  currentFPS: 38,
  targetFPS: 40,
  phase: 'cruise',
  cloudQuality: 'high',
  isConnected: true,
  isPatched: true,
};

const MOCK_SETTINGS: LODSettings = {
  targetFPS: 40,
  minTLOD: 50,
  maxTLOD: 400,
  minOLOD: 50,
  maxOLOD: 200,
  enabled: true,
};

export function useLOD() {
  const [lodState, setLodState] = useState<LODState>(MOCK_LOD_STATE);
  const [settings, setSettingsState] = useState<LODSettings>(MOCK_SETTINGS);

  useEffect(() => {
    const api = window.aerosphere;
    if (!api) return;

    api.invoke(IPC.LOD_GET_SETTINGS).then((s) => {
      if (s) setSettingsState(s as LODSettings);
    });

    const onState = (...args: unknown[]) => {
      const state = args[0] as LODState;
      setLodState(state);
    };

    api.on(IPC.LOD_STATE, onState);
    return () => {
      api.off(IPC.LOD_STATE, onState);
    };
  }, []);

  const setSettings = useCallback((partial: Partial<LODSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      window.aerosphere?.invoke(IPC.LOD_SET_SETTINGS, next);
      return next;
    });
  }, []);

  const toggleLOD = useCallback(() => {
    window.aerosphere?.invoke(IPC.LOD_TOGGLE);
    setSettingsState((prev) => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  return { lodState, settings, setSettings, toggleLOD };
}
