// ═══════════════════════════════════════════════════════
// AeroSphere Studio — WebRTC PeerConnection Manager
// ═══════════════════════════════════════════════════════

import SimplePeer from 'simple-peer';
import { EventEmitter } from 'node:events';
import { STUN_SERVERS } from '../../shared/constants';
import type { SignalingClient, SignalMessage } from './SignalingClient';
import { detectMode, type ConnectionMode } from './ConnectionModes';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: STUN_SERVERS.map(url => ({ urls: url })),
};

const CHANNEL_CONFIG = { ordered: false, maxRetransmits: 0 };
const PING_INTERVAL_MS = 2000;

export class PeerManager extends EventEmitter {
  private peer: SimplePeer.Instance | null = null;
  private signaling: SignalingClient;
  private targetPeerId: string | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private lastPingSent = 0;
  private _ping = 0;
  private _mode: ConnectionMode = 'p2p';

  get ping(): number { return this._ping; }
  get mode(): ConnectionMode { return this._mode; }

  constructor(signaling: SignalingClient) {
    super();
    this.signaling = signaling;

    // Receive signals forwarded by the signaling server
    this.signaling.on('signal', (msg: SignalMessage) => {
      if (msg.signal) this.peer?.signal(msg.signal as SimplePeer.SignalData);
      if (msg.senderId && !this.targetPeerId) this.targetPeerId = msg.senderId;
    });

    // When a peer joins, record their ID for signaling
    this.signaling.on('peer-joined', (msg: SignalMessage) => {
      if (msg.senderId) this.targetPeerId = msg.senderId;
    });

    // When we join, record the host's ID
    this.signaling.on('joined', (msg: SignalMessage) => {
      if (msg.peers?.[0]) this.targetPeerId = msg.peers[0].id;
    });
  }

  createHost(): void {
    this.createPeer(true);
  }

  joinAsGuest(): void {
    this.createPeer(false);
  }

  sendData(buffer: Uint8Array): void {
    if (this.peer?.connected) this.peer.send(buffer);
  }

  destroy(): void {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    this.peer?.destroy();
    this.peer = null;
    this.targetPeerId = null;
  }

  private createPeer(initiator: boolean): void {
    this.destroy();
    this.peer = new SimplePeer({
      initiator,
      trickle: true,
      config: ICE_CONFIG,
      channelConfig: CHANNEL_CONFIG,
    });

    this.peer.on('signal', (data) => {
      if (this.targetPeerId) this.signaling.sendSignal(this.targetPeerId, data);
    });

    this.peer.on('connect', () => {
      this.emit('connected');
      this.startPingLoop();
    });

    this.peer.on('data', (data: Uint8Array) => {
      // Handle ping/pong internally (type byte 0x05, 9 bytes total)
      if (data.length === 9 && data[0] === 0x05) {
        this.handlePingPong(data);
        return;
      }
      this.emit('data', data);
    });

    this.peer.on('close', () => { this.emit('disconnected'); this.destroy(); });
    this.peer.on('error', (err) => this.emit('error', err));
  }

  private startPingLoop(): void {
    this.pingTimer = setInterval(() => {
      const buf = new Uint8Array(9);
      buf[0] = 0x05;
      const view = new DataView(buf.buffer);
      this.lastPingSent = performance.now();
      view.setFloat64(1, this.lastPingSent);
      this.sendData(buf);
    }, PING_INTERVAL_MS);
  }

  private handlePingPong(data: Uint8Array): void {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const timestamp = view.getFloat64(1);

    // If this wasn't our ping, echo it back
    if (Math.abs(timestamp - this.lastPingSent) > 1) {
      this.sendData(data);
      return;
    }

    // Our ping returned — calculate RTT
    this._ping = Math.round(performance.now() - timestamp);
    this.emit('ping', this._ping);
  }
}
