import React from 'react';
import Slider from '../common/Slider';
import Toggle from '../common/Toggle';
import './VoIPControls.css';

interface VoIPControlsProps {
  isMuted: boolean;
  isSpeaking: boolean;
  volume: number;
  isPushToTalk: boolean;
  isRadioCrackle: boolean;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onTogglePTT: (v: boolean) => void;
  onToggleCrackle: (v: boolean) => void;
}

const MicIcon: React.FC<{ muted: boolean }> = ({ muted }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="6" height="9" rx="3" />
    <path d="M3 9a6 6 0 0012 0" />
    <line x1="9" y1="15" x2="9" y2="17" />
    <line x1="6" y1="17" x2="12" y2="17" />
    {muted && <line x1="3" y1="3" x2="15" y2="15" strokeWidth="2" />}
  </svg>
);

const VoIPControls: React.FC<VoIPControlsProps> = ({
  isMuted,
  isSpeaking,
  volume,
  isPushToTalk,
  isRadioCrackle,
  onToggleMute,
  onVolumeChange,
  onTogglePTT,
  onToggleCrackle,
}) => {
  return (
    <div className="voip-controls animate-fade-in">
      {/* Mic indicator */}
      <div className="voip-controls__indicator">
        {isMuted ? (
          <span className="voip-controls__dot voip-controls__dot--muted" />
        ) : isSpeaking ? (
          <div className="voip-controls__waveform">
            <span className="voip-controls__bar voip-controls__bar--1" />
            <span className="voip-controls__bar voip-controls__bar--2" />
            <span className="voip-controls__bar voip-controls__bar--3" />
          </div>
        ) : (
          <span className="voip-controls__dot voip-controls__dot--idle" />
        )}
      </div>

      {/* Mute button */}
      <button
        className={`voip-controls__mute-btn ${isMuted ? 'voip-controls__mute-btn--muted' : 'voip-controls__mute-btn--live'}`}
        onClick={onToggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        type="button"
      >
        <MicIcon muted={isMuted} />
      </button>

      <span className="voip-controls__divider" />

      {/* Volume slider */}
      <div className="voip-controls__volume">
        <Slider value={volume} min={0} max={100} step={1} label="" unit="" onChange={onVolumeChange} />
      </div>

      <span className="voip-controls__divider" />

      {/* PTT toggle */}
      <div className="voip-controls__toggle">
        <Toggle checked={isPushToTalk} onChange={onTogglePTT} label="PTT" />
      </div>

      {/* Radio crackle toggle */}
      <div className="voip-controls__toggle">
        <Toggle checked={isRadioCrackle} onChange={onToggleCrackle} label="Crackle" />
      </div>
    </div>
  );
};

export default VoIPControls;
