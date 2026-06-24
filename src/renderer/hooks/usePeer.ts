import { useState, useEffect, useCallback } from 'react';
import type { PilotRole, PeerInfo, ConnectionState } from '@shared/types';
import { IPC } from '@shared/ipc-channels';
import { JOIN_CODE_CHARS } from '@shared/constants';

const MOCK_CONNECTION_STATE: ConnectionState = {
  status: 'disconnected',
  mode: 'p2p',
  roomCode: null,
  peers: [],
};

const MOCK_PEER: PeerInfo = {
  id: 'mock-peer-1',
  name: 'Captain Rodriguez',
  role: 'pm' as PilotRole,
  ping: 24,
};

function generateMockCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
  }
  return code;
}

export function usePeer() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(MOCK_CONNECTION_STATE);

  useEffect(() => {
    const api = window.aerosphere;
    if (!api) return;

    const onState = (...args: unknown[]) => {
      const state = args[0] as ConnectionState;
      setConnectionState(state);
    };

    api.on(IPC.COCKPIT_CONNECTION_STATE, onState);
    return () => {
      api.off(IPC.COCKPIT_CONNECTION_STATE, onState);
    };
  }, []);

  const createRoom = useCallback(() => {
    const api = window.aerosphere;
    if (api) {
      api.invoke(IPC.COCKPIT_CREATE_ROOM);
      api.on(IPC.COCKPIT_CONNECTION_STATE, (...args: unknown[]) => {
        setConnectionState(args[0] as ConnectionState);
      });
      return;
    }

    const code = generateMockCode();
    setConnectionState((prev) => ({ ...prev, status: 'connecting', roomCode: code }));
    setTimeout(() => {
      setConnectionState({
        status: 'connected',
        mode: 'p2p',
        roomCode: code,
        peers: [MOCK_PEER],
      });
    }, 1500);
  }, []);

  const joinRoom = useCallback((code: string) => {
    if (code.length !== 6) return;

    const api = window.aerosphere;
    if (api) {
      api.invoke(IPC.COCKPIT_JOIN_ROOM, code);
      return;
    }

    setConnectionState((prev) => ({ ...prev, status: 'connecting', roomCode: code }));
    setTimeout(() => {
      setConnectionState({
        status: 'connected',
        mode: 'p2p',
        roomCode: code,
        peers: [MOCK_PEER],
      });
    }, 1500);
  }, []);

  const disconnect = useCallback(() => {
    const api = window.aerosphere;
    if (api) {
      api.invoke(IPC.COCKPIT_DISCONNECT);
      return;
    }

    setConnectionState(MOCK_CONNECTION_STATE);
  }, []);

  const setRole = useCallback((role: PilotRole) => {
    window.aerosphere?.invoke(IPC.COCKPIT_SET_ROLE, role);
  }, []);

  return {
    connectionState,
    roomCode: connectionState.roomCode,
    peers: connectionState.peers,
    createRoom,
    joinRoom,
    disconnect,
    setRole,
  };
}
