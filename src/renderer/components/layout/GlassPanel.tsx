import type { ReactNode } from 'react';
import './GlassPanel.css';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassPanel({ children, className = '', glow = false }: GlassPanelProps) {
  const classes = [
    'glass-panel',
    glow && 'glass-panel--glow',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {children}
    </div>
  );
}
