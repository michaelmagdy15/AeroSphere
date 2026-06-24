import React from 'react';
import { PilotRole } from '@shared/types';
import './RoleSelector.css';

export interface RoleSelectorProps {
  selectedRole?: PilotRole;
  onSelectRole?: (role: PilotRole) => void;
  disabled?: boolean;
}

const SteeringWheelIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="role-selector__icon">
    <circle cx="20" cy="20" r="14" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2.5" />
    <line x1="20" y1="6" x2="20" y2="34" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" />
    <line x1="6" y1="20" x2="34" y2="20" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" />
    <circle cx="20" cy="20" r="4" fill={active ? 'var(--accent-blue)' : 'var(--text-muted)'} />
  </svg>
);

const GaugeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="role-selector__icon">
    <rect x="4" y="6" width="32" height="24" rx="3" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" />
    <path d="M20 26V14" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" />
    <path d="M14 22l6-8 6 8" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="14" y1="34" x2="26" y2="34" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const EyeIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" className="role-selector__icon">
    <path d="M4 20c0 0 7-10 16-10s16 10 16 10-7 10-16 10S4 20 4 20z" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" />
    <circle cx="20" cy="20" r="5" stroke={active ? 'var(--accent-blue)' : 'var(--text-muted)'} strokeWidth="2" />
    <circle cx="20" cy="20" r="2" fill={active ? 'var(--accent-blue)' : 'var(--text-muted)'} />
  </svg>
);

const roles: Array<{
  id: PilotRole;
  label: string;
  description: string;
  Icon: React.FC<{ active: boolean }>;
}> = [
  { id: 'pf', label: 'Pilot Flying', description: 'Full flight controls, throttle, and navigation', Icon: SteeringWheelIcon },
  { id: 'pm', label: 'Pilot Monitoring', description: 'Instruments, radio, and systems management', Icon: GaugeIcon },
  { id: 'observer', label: 'Observer', description: 'View-only access with no control inputs', Icon: EyeIcon },
];

const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole = 'observer', onSelectRole = () => {}, disabled }) => {
  return (
    <div className={`role-selector ${disabled ? 'role-selector--disabled' : ''}`}>
      {roles.map((role, i) => {
        const isActive = selectedRole === role.id;
        return (
          <button
            key={role.id}
            className={`role-selector__card transition-all stagger-${i + 1} ${isActive ? 'role-selector__card--active' : ''}`}
            onClick={() => onSelectRole(role.id)}
            disabled={disabled}
            type="button"
          >
            <role.Icon active={isActive} />
            <span className="role-selector__label">{role.label}</span>
            <span className="role-selector__desc">{role.description}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RoleSelector;
