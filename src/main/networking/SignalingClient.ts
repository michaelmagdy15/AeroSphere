// ═══════════════════════════════════════════════════════
// AeroSphere Studio — WebSocket Signaling Client
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'node:events';
import { SIGNALING_URL } from '../../shared/constants';

export interface SignalMessage {
  type: string;
  code?: string;
  name?: string;
  targetId?: string;
  senderId?: string;
  signal?: unknown;
  peers?: { id: string; name: string }[];
}

export class SignalingClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _peerId: string | null = null;

  get peerId(): string | null { return this._peerId; }

  constructor(url = SIGNALING_URL) {
    super();
    this.url = url;
  }

  connect(): void {
    this.cleanup();
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => this.emit('connected');

    this.ws.onmessage = (ev) => {
      const msg: SignalMessage = JSON.parse(ev.data as string);
      if (msg.senderId && !this._peerId && (msg.type === 'created' || msg.type === 'joined')) {
        this._peerId = msg.senderId;
      }
      this.emit('message', msg);
      this.emit(msg.type, msg);
    };

    this.ws.onclose = () => {
      this.emit('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => this.ws?.close();
  }

  disconnect(): void {
    this.cleanup();
    this._peerId = null;
  }

  createRoom(name = 'Host'): void {
    this.send({ type: 'create', name });
  }

  joinRoom(code: string, name = 'Guest'): void {
    this.send({ type: 'join', code: code.toUpperCase(), name });
  }

  sendSignal(targetId: string, signal: unknown): void {
    this.send({ type: 'signal', targetId, signal });
  }

  private send(msg: SignalMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private cleanup(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.onclose = null; this.ws.close(); this.ws = null; }
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => this.connect(), 3000);
  }
}
