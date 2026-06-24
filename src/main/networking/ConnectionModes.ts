// ═══════════════════════════════════════════════════════
// AeroSphere Studio — Connection Mode Detection
// ═══════════════════════════════════════════════════════

export type ConnectionMode = 'p2p' | 'relay' | 'direct';

export function detectMode(candidate: RTCIceCandidate): ConnectionMode {
  if (candidate.type === 'relay') return 'relay';
  if (candidate.type === 'host') return 'direct';
  return 'p2p';
}
