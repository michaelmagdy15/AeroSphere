import React, { useMemo } from 'react'
import './Gauge.css'

interface GaugeProps {
  value: number
  min: number
  max: number
  label: string
  unit?: string
  size?: number
  color?: string
  segments?: number
}

const ARC_DEGREES = 270
const START_ANGLE = 135

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

function resolveColor(pct: number, colorOverride?: string): string {
  if (colorOverride) return `var(${colorOverride})`
  if (pct < 0.5) return 'var(--accent-green)'
  if (pct < 0.8) return 'var(--accent-amber)'
  return 'var(--accent-red)'
}

export default function Gauge({
  value,
  min,
  max,
  label,
  unit = '',
  size = 180,
  color,
  segments,
}: GaugeProps) {
  const clamped = Math.max(min, Math.min(max, value))
  const pct = (clamped - min) / (max - min || 1)

  const cx = size / 2
  const cy = size / 2
  const strokeWidth = size * 0.08
  const r = (size - strokeWidth * 2) / 2

  const circumference = (ARC_DEGREES / 360) * 2 * Math.PI * r
  const dashOffset = circumference * (1 - pct)
  const activeColor = resolveColor(pct, color)

  const trackPath = useMemo(
    () => describeArc(cx, cy, r, START_ANGLE, START_ANGLE + ARC_DEGREES),
    [cx, cy, r],
  )

  const segmentMarks = useMemo(() => {
    if (!segments || segments < 2) return null
    const marks: React.ReactElement[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = START_ANGLE + (ARC_DEGREES / segments) * i
      const outer = polarToCartesian(cx, cy, r + strokeWidth * 0.6, angle)
      const inner = polarToCartesian(cx, cy, r - strokeWidth * 0.6, angle)
      marks.push(
        <line
          key={i}
          x1={outer.x}
          y1={outer.y}
          x2={inner.x}
          y2={inner.y}
          stroke="var(--text-muted)"
          strokeWidth={1.5}
          opacity={0.35}
        />,
      )
    }
    return marks
  }, [cx, cy, r, strokeWidth, segments])

  return (
    <div className="gauge-container" style={{ width: size, height: size + 28 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="gauge-svg"
      >
        {/* Background track */}
        <path
          className="gauge-track"
          d={trackPath}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Segment tick marks */}
        {segmentMarks}

        {/* Active arc */}
        <path
          className="gauge-arc"
          d={trackPath}
          fill="none"
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={
            {
              '--gauge-glow-color': activeColor,
            } as React.CSSProperties
          }
        />

        {/* Center value */}
        <text
          x={cx}
          y={cy - 2}
          className="gauge-value"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text-primary)"
          style={{ fontSize: size * 0.22 }}
        >
          {Math.round(clamped)}
          {unit && (
            <tspan className="gauge-unit" style={{ fontSize: size * 0.11 }}>
              {unit}
            </tspan>
          )}
        </text>
      </svg>

      <span className="gauge-label">{label}</span>
    </div>
  )
}
