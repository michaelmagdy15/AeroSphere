import React from 'react';
import './StatusBadge.css';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'error';
  label?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => (
  <span className="status-badge">
    <span className={`status-dot status-dot--${status}`} />
    {label && <span className="status-label">{label}</span>}
  </span>
);

export { StatusBadge };
export default StatusBadge;
