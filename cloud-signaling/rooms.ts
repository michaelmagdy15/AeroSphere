// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Signaling Room State
// ═══════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';
import type { WebSocket } from 'ws';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const ROOM_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

export interface Peer {
  id: string;
  ws: WebSocket;
  name: string;
}

export interface Room {
  code: string;
  host: Peer;
  guests: Map<string, Peer>;
  createdAt: number;
}

const rooms = new Map<string, Room>();

export function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return rooms.has(code) ? generateCode() : code;
}

export function createRoom(host: Peer): Room {
  const room: Room = { code: generateCode(), host, guests: new Map(), createdAt: Date.now() };
  rooms.set(room.code, room);
  return room;
}

export function joinRoom(code: string, guest: Peer): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  room.guests.set(guest.id, guest);
  return room;
}

export function leaveRoom(peerId: string): void {
  for (const [code, room] of rooms) {
    if (room.host.id === peerId) { rooms.delete(code); return; }
    room.guests.delete(peerId);
  }
}

export function findRoomByPeer(peerId: string): Room | null {
  for (const room of rooms.values()) {
    if (room.host.id === peerId || room.guests.has(peerId)) return room;
  }
  return null;
}

export function cleanExpired(): void {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > ROOM_EXPIRY_MS) rooms.delete(code);
  }
}
