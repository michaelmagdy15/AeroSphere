// ═══════════════════════════════════════════════════════
// AeroSphere Studio — DataChannel Message Router
// ═══════════════════════════════════════════════════════

export const MessageType = {
  STATE_SYNC: 0x01,
  FULL_STATE: 0x02,
  ROLE_CHANGE: 0x03,
  VOICE: 0x04,
  PING: 0x05,
} as const;

export type MessageTypeValue = typeof MessageType[keyof typeof MessageType];
export type MessageHandler = (payload: Uint8Array) => void;

export class DataChannelRouter {
  private handlers = new Map<number, MessageHandler>();

  register(type: MessageTypeValue, handler: MessageHandler): void {
    this.handlers.set(type, handler);
  }

  route(data: Uint8Array): void {
    if (data.length === 0) return;
    const handler = this.handlers.get(data[0]);
    if (handler) handler(data.subarray(1));
  }

  /** Wraps payload with a type byte prefix */
  static pack(type: MessageTypeValue, payload: Uint8Array): Uint8Array {
    const out = new Uint8Array(1 + payload.length);
    out[0] = type;
    out.set(payload, 1);
    return out;
  }
}
