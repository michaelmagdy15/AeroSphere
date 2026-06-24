import React, { useState } from 'react';
import { ControlMapping } from '@shared/types';
import Button from '../common/Button';
import { GlassPanel } from '../layout/GlassPanel';
import './AutoLearnPanel.css';

export interface AutoLearnPanelProps {
  step?: number;
  detectedMappings?: ControlMapping[];
  onStartCapture?: () => void;
  onExportProfile?: (name: string) => void;
  onStepChange?: (step: number) => void;
}

const CheckSvg: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" />
  </svg>
);

const TOTAL_STEPS = 4;

const defaultMappings: ControlMapping[] = [
  { varName: 'LVAR:APU_SWITCH', varType: 'lvar', canonicalControl: 'APU Switch', confidence: 0.95, syncMode: 'on-change', interpolate: false, isDiscrete: true },
  { varName: 'LVAR:THROTTLE_1', varType: 'lvar', canonicalControl: 'Throttle 1', confidence: 0.88, syncMode: 'continuous', interpolate: true, isDiscrete: false },
  { varName: 'LVAR:GEAR_HANDLE', varType: 'lvar', canonicalControl: 'Gear Lever', confidence: 0.92, syncMode: 'on-change', interpolate: false, isDiscrete: true },
  { varName: 'LVAR:FLAPS_POS', varType: 'lvar', canonicalControl: 'Flaps Handle', confidence: 0.73, syncMode: 'on-change', interpolate: false, isDiscrete: true },
  { varName: 'LVAR:SPD_BRAKE', varType: 'lvar', canonicalControl: 'Speed Brake', confidence: 0.41, syncMode: 'continuous', interpolate: true, isDiscrete: false },
];

function confidenceColor(c: number): string {
  if (c > 0.8) return 'var(--accent-green)';
  if (c > 0.5) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

function confidenceBg(c: number): string {
  if (c > 0.8) return 'var(--accent-green-dim)';
  if (c > 0.5) return 'var(--accent-amber-dim)';
  return 'var(--accent-red-dim)';
}

const AutoLearnPanel: React.FC<AutoLearnPanelProps> = ({
  step: propStep,
  detectedMappings: propDetectedMappings = [],
  onStartCapture = () => {},
  onExportProfile = () => {},
  onStepChange,
}) => {
  const [localStep, setLocalStep] = useState(1);
  const step = propStep ?? localStep;
  const handleStepChange = onStepChange ?? setLocalStep;

  const detectedMappings = propDetectedMappings ?? [];
  const [profileName, setProfileName] = useState('');
  const [approved, setApproved] = useState<Set<number>>(new Set(detectedMappings.map((_, i) => i)));

  const mappings = detectedMappings.length > 0 ? detectedMappings : defaultMappings;

  const toggleApproval = (idx: number) => {
    setApproved((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <GlassPanel className="auto-learn-panel">
      <h3 className="auto-learn-panel__title animate-fade-in">Auto‑Learn Wizard</h3>

      {/* ── Step indicator ── */}
      <div className="auto-learn-panel__steps animate-fade-in stagger-1">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => {
          const num = i + 1;
          const isCompleted = num < step;
          const isCurrent = num === step;
          return (
            <React.Fragment key={num}>
              {i > 0 && (
                <div className={`auto-learn-panel__line ${isCompleted || isCurrent ? 'auto-learn-panel__line--done' : ''}`} />
              )}
              <button
                className={`auto-learn-panel__step-circle ${isCompleted ? 'auto-learn-panel__step-circle--done' : ''} ${isCurrent ? 'auto-learn-panel__step-circle--current animate-pulse' : ''}`}
                onClick={() => handleStepChange(num)}
                type="button"
              >
                {isCompleted ? <CheckSvg /> : num}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Step content ── */}
      <div className="auto-learn-panel__content animate-fade-in-up stagger-2">

        {step === 1 && (
          <div className="auto-learn-panel__intro">
            <p className="auto-learn-panel__text">
              Move every control in the cockpit once. AeroSphere will detect and classify each input automatically.
            </p>
            <Button variant="primary" size="lg" onClick={onStartCapture}>
              Start Capture
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="auto-learn-panel__detect">
            <p className="auto-learn-panel__text">
              Interact with controls in the simulator. Detected mappings appear below in real time.
            </p>
            <span className="auto-learn-panel__counter">{mappings.length} controls detected</span>
            <ul className="auto-learn-panel__mapping-list">
              {mappings.map((m, i) => (
                <li key={m.varName} className={`auto-learn-panel__mapping-row animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}>
                  <code className="auto-learn-panel__var">{m.varName}</code>
                  <span className="auto-learn-panel__arrow">→</span>
                  <span className="auto-learn-panel__canon">{m.canonicalControl}</span>
                  <span
                    className="auto-learn-panel__confidence"
                    style={{ color: confidenceColor(m.confidence), background: confidenceBg(m.confidence) }}
                  >
                    {Math.round(m.confidence * 100)}%
                  </span>
                  <span className={`auto-learn-panel__type-badge ${m.isDiscrete ? 'auto-learn-panel__type-badge--discrete' : 'auto-learn-panel__type-badge--continuous'}`}>
                    {m.isDiscrete ? 'discrete' : 'continuous'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {step === 3 && (
          <div className="auto-learn-panel__review">
            <p className="auto-learn-panel__text">Review detected mappings. Accept or reject each one.</p>
            <table className="auto-learn-panel__table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Control</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m, i) => (
                  <tr key={m.varName} className={approved.has(i) ? '' : 'auto-learn-panel__row--rejected'}>
                    <td><code>{m.varName}</code></td>
                    <td>{m.canonicalControl}</td>
                    <td style={{ color: confidenceColor(m.confidence) }}>{Math.round(m.confidence * 100)}%</td>
                    <td>
                      <button
                        className={`auto-learn-panel__approve-btn ${approved.has(i) ? 'auto-learn-panel__approve-btn--yes' : 'auto-learn-panel__approve-btn--no'}`}
                        onClick={() => toggleApproval(i)}
                        type="button"
                      >
                        {approved.has(i) ? '✓' : '✕'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {step === 4 && (
          <div className="auto-learn-panel__export">
            <p className="auto-learn-panel__text">Name your profile and save it.</p>
            <input
              className="auto-learn-panel__name-input"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. PMDG 737-800"
            />
            <Button
              variant="primary"
              onClick={() => profileName.trim() && onExportProfile(profileName.trim())}
              disabled={!profileName.trim()}
            >
              Save &amp; Export
            </Button>
          </div>
        )}
      </div>
    </GlassPanel>
  );
};

export default AutoLearnPanel;
