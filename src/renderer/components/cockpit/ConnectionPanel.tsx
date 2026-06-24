import React, { useState } from 'react';
import { ConnectionState, PeerInfo } from '@shared/types';
import Button from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { GlassPanel } from '../layout/GlassPanel';
import './ConnectionPanel.css';

export interface ConnectionPanelProps {
  connectionState?: ConnectionState['status'];
  roomCode?: string | null;
  peers?: PeerInfo[];
  onCreateRoom?: () => void;
  onJoinRoom?: (code: string) => void;
  onDisconnect?: () => void;
}

const ClipboardIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="2" width="9" height="11" rx="1.5" />
    <path d="M2 5v8a1.5 1.5 0 001.5 1.5H10" />
  </svg>
);

const CheckmarkIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8.5L6.5 12L13 4" />
  </svg>
);

const SpinnerIcon: React.FC = () => (
  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="var(--accent-blue)" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" strokeLinecap="round" />
  </svg>
);

function getPingColor(ping: number): string {
  if (ping < 50) return 'var(--accent-green)';
  if (ping < 100) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  connectionState = 'disconnected',
  roomCode = null,
  peers = [],
  onCreateRoom = () => {},
  onJoinRoom = () => {},
  onDisconnect = () => {},
}) => {
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const handleCopy = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoin = () => {
    if (joinCode.length === 6) {
      onJoinRoom(joinCode.toUpperCase());
    }
  };

  return (
    <GlassPanel className="connection-panel" glow>
      <div className="connection-panel__header animate-fade-in">
        <h3 className="connection-panel__title">Session</h3>
        <div className="connection-panel__status">
          {connectionState === 'disconnected' && (
            <span className="connection-panel__dot connection-panel__dot--disconnected" />
          )}
          {isConnecting && <SpinnerIcon />}
          {isConnected && (
            <span className="connection-panel__dot connection-panel__dot--connected animate-glow-green">
              <CheckmarkIcon />
            </span>
          )}
          <span className="connection-panel__status-label">
            {connectionState === 'disconnected' && 'Disconnected'}
            {isConnecting && 'Connecting…'}
            {isConnected && 'Connected'}
          </span>
        </div>
      </div>

      {!isConnected && (
        <>
          <div className="connection-panel__tabs animate-fade-in stagger-1">
            <button
              className={`connection-panel__tab ${mode === 'host' ? 'connection-panel__tab--active' : ''}`}
              onClick={() => setMode('host')}
            >
              Host Session
            </button>
            <button
              className={`connection-panel__tab ${mode === 'join' ? 'connection-panel__tab--active' : ''}`}
              onClick={() => setMode('join')}
            >
              Join Session
            </button>
          </div>

          <div className="connection-panel__body animate-fade-in-up stagger-2">
            {mode === 'host' && (
              <div className="connection-panel__host">
                {roomCode ? (
                  <div className="connection-panel__code-display">
                    <span className="connection-panel__code">{roomCode}</span>
                    <button
                      className="connection-panel__copy-btn hover-scale"
                      onClick={handleCopy}
                      title="Copy code"
                    >
                      {copied ? <CheckmarkIcon /> : <ClipboardIcon />}
                    </button>
                  </div>
                ) : (
                  <Button variant="primary" size="lg" onClick={onCreateRoom} disabled={isConnecting}>
                    Create Room
                  </Button>
                )}
              </div>
            )}

            {mode === 'join' && (
              <div className="connection-panel__join">
                <input
                  className="connection-panel__input"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  maxLength={6}
                  placeholder="XXXXXX"
                  spellCheck={false}
                  autoComplete="off"
                />
                <Button
                  variant="primary"
                  onClick={handleJoin}
                  disabled={joinCode.length !== 6 || isConnecting}
                >
                  Connect
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {isConnected && peers.length > 0 && (
        <div className="connection-panel__peers animate-fade-in-up">
          {peers.map((peer, i) => (
            <div key={peer.id ?? i} className={`connection-panel__peer-card stagger-${i + 1}`}>
              <div className="connection-panel__peer-name">{peer.name}</div>
              <StatusBadge status="online" label={peer.role} />
              <span
                className="connection-panel__ping"
                style={{ color: getPingColor(peer.ping ?? 0) }}
              >
                {peer.ping ?? '—'}ms
              </span>
            </div>
          ))}
          <Button variant="danger" onClick={onDisconnect}>
            Disconnect
          </Button>
        </div>
      )}
    </GlassPanel>
  );
};

export default ConnectionPanel;
