// ═══════════════════════════════════════════════════════
// AeroSphere Studio — WebSocket Signaling Server
// Deploys to Google Cloud Run
// ═══════════════════════════════════════════════════════

import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'node:crypto';
import { createRoom, joinRoom, leaveRoom, findRoomByPeer, cleanExpired, type Peer } from './rooms.js';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HEARTBEAT_MS = 30_000;

interface SignalMessage {
  type: 'create' | 'join' | 'signal' | 'created' | 'joined' | 'peer-joined' | 'peer-left' | 'error';
  code?: string;
  name?: string;
  targetId?: string;
  senderId?: string;
  signal?: unknown;
  peers?: { id: string; name: string }[];
}

const wss = new WebSocketServer({ port: PORT });
const alive = new Map<WebSocket, boolean>();

function send(ws: WebSocket, msg: SignalMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

wss.on('connection', (ws: WebSocket) => {
  const peerId = randomUUID();
  alive.set(ws, true);

  ws.on('pong', () => alive.set(ws, true));

  ws.on('message', (raw: any) => {
    let msg: SignalMessage;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === 'create') {
      const peer: Peer = { id: peerId, ws, name: msg.name || 'Host' };
      const room = createRoom(peer);
      send(ws, { type: 'created', code: room.code, senderId: peerId });
    }

    else if (msg.type === 'join') {
      if (!msg.code) return send(ws, { type: 'error', signal: 'Missing room code' });
      const peer: Peer = { id: peerId, ws, name: msg.name || 'Guest' };
      const room = joinRoom(msg.code.toUpperCase(), peer);
      if (!room) return send(ws, { type: 'error', signal: 'Room not found' });

      // Tell the joiner about existing peers
      const peers = [
        { id: room.host.id, name: room.host.name },
        ...Array.from(room.guests.values())
          .filter(g => g.id !== peerId)
          .map(g => ({ id: g.id, name: g.name })),
      ];
      send(ws, { type: 'joined', code: room.code, senderId: peerId, peers });

      // Notify existing peers
      const joinMsg: SignalMessage = { type: 'peer-joined', senderId: peerId, name: peer.name };
      send(room.host.ws, joinMsg);
      for (const g of room.guests.values()) {
        if (g.id !== peerId) send(g.ws, joinMsg);
      }
    }

    else if (msg.type === 'signal') {
      if (!msg.targetId) return;
      const room = findRoomByPeer(peerId);
      if (!room) return;
      const target = room.host.id === msg.targetId
        ? room.host
        : room.guests.get(msg.targetId);
      if (target) send(target.ws, { type: 'signal', senderId: peerId, signal: msg.signal });
    }
  });

  ws.on('close', () => {
    const room = findRoomByPeer(peerId);
    leaveRoom(peerId);
    alive.delete(ws);
    if (!room) return;

    const leftMsg: SignalMessage = { type: 'peer-left', senderId: peerId };
    if (room.host.id === peerId) {
      // Host left — room is deleted, notify all guests
      for (const g of room.guests.values()) send(g.ws, leftMsg);
    } else {
      send(room.host.ws, leftMsg);
      for (const g of room.guests.values()) {
        if (g.id !== peerId) send(g.ws, leftMsg);
      }
    }
  });
});

// Heartbeat: detect dead connections
setInterval(() => {
  for (const [ws, isAlive] of alive) {
    if (!isAlive) { ws.terminate(); alive.delete(ws); continue; }
    alive.set(ws, false);
    ws.ping();
  }
}, HEARTBEAT_MS);

// Room expiry cleanup every 5 min
setInterval(cleanExpired, 5 * 60_000);

console.log(`Signaling server listening on :${PORT}`);
