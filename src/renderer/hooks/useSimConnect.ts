import { useState, useEffect } from 'react';
import type { Telemetry } from '@shared/types';
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

const MOCK_TELEMETRY: Telemetry = {
  altitude: 35000,
  altitudeAGL: 34500,
  verticalSpeed: 0,
  airspeed: 280,
  heading: 270,
  latitude: 47.4,
  longitude: -122.3,
  onGround: false,
  isPaused: false,
  simRate: 1,
};

export function useSimConnect() {
  const [telemetry, setTelemetry] = useState<Telemetry>(MOCK_TELEMETRY);
  const [isConnected, setIsConnected] = useState(!!window.aerosphere);

  useEffect(() => {
    const api = window.aerosphere;
    if (!api) return;

    const onTelemetry = (...args: unknown[]) => {
      setTelemetry(args[0] as Telemetry);
    };

    const onStatus = (...args: unknown[]) => {
      const status = args[0] as { connected: boolean };
      setIsConnected(status.connected);
    };

    api.on(IPC.SIM_TELEMETRY, onTelemetry);
    api.on(IPC.SIM_STATUS, onStatus);

    return () => {
      api.off(IPC.SIM_TELEMETRY, onTelemetry);
      api.off(IPC.SIM_STATUS, onStatus);
    };
  }, []);

  return { telemetry, isConnected };
}
