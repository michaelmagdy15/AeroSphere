// ═══════════════════════════════════════════════════════
// AeroSphere Studio — VoIP / Voice Intercom Manager
// ═══════════════════════════════════════════════════════

import { EventEmitter } from 'node:events';

export type VoIPMode = 'push-to-talk' | 'open-mic';

export class VoIPManager extends EventEmitter {
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destNode: MediaStreamAudioDestinationNode | null = null;
  private bandpass: BiquadFilterNode | null = null;
  private _mode: VoIPMode = 'push-to-talk';
  private _muted = false;
  private _transmitting = false;

  get mode(): VoIPMode { return this._mode; }
  get muted(): boolean { return this._muted; }
  get transmitting(): boolean { return this._transmitting; }

  async init(): Promise<MediaStream> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.audioCtx = new AudioContext();
    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);
    this.gainNode = this.audioCtx.createGain();
    this.destNode = this.audioCtx.createMediaStreamDestination();

    // Default chain: source → gain → destination
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.destNode);

    // Start muted in PTT mode
    this.setTransmitting(false);
    return this.destNode.stream;
  }

  /** Get the processed output stream for WebRTC audio track */
  getOutputStream(): MediaStream | null {
    return this.destNode?.stream ?? null;
  }

  setMode(mode: VoIPMode): void {
    this._mode = mode;
    if (mode === 'open-mic') this.setTransmitting(true);
  }

  setVolume(level: number): void {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(2, level));
  }

  mute(): void {
    this._muted = true;
    this.setTrackEnabled(false);
  }

  unmute(): void {
    this._muted = false;
    if (this._mode === 'open-mic' || this._transmitting) this.setTrackEnabled(true);
  }

  /** Push-to-talk: call on key down */
  startTransmit(): void {
    if (this._mode === 'push-to-talk') this.setTransmitting(true);
  }

  /** Push-to-talk: call on key up */
  stopTransmit(): void {
    if (this._mode === 'push-to-talk') this.setTransmitting(false);
  }

  /** Toggle radio crackle effect — bandpass filter simulating aviation radio */
  setRadioFx(enabled: boolean): void {
    if (!this.audioCtx || !this.sourceNode || !this.gainNode) return;

    this.sourceNode.disconnect();
    this.bandpass?.disconnect();

    if (enabled) {
      this.bandpass = this.audioCtx.createBiquadFilter();
      this.bandpass.type = 'bandpass';
      this.bandpass.frequency.value = 2000;
      this.bandpass.Q.value = 0.8;
      this.sourceNode.connect(this.bandpass);
      this.bandpass.connect(this.gainNode);
    } else {
      this.sourceNode.connect(this.gainNode);
      this.bandpass = null;
    }
  }

  destroy(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.audioCtx?.close();
    this.stream = null;
    this.audioCtx = null;
  }

  private setTransmitting(on: boolean): void {
    this._transmitting = on;
    if (!this._muted) this.setTrackEnabled(on);
    this.emit('transmit', on);
  }

  private setTrackEnabled(enabled: boolean): void {
    this.stream?.getAudioTracks().forEach(t => { t.enabled = enabled; });
  }
}
