import { useCallback, useId } from 'react'
import './Slider.css'

interface SliderProps {
  value: number
  min: number
  max: number
  step?: number
  label?: string
  unit?: string
  onChange: (value: number) => void
}

export default function Slider({
  value,
  min,
  max,
  step = 1,
  label,
  unit = '',
  onChange,
}: SliderProps) {
  const id = useId()
  const fill = ((value - min) / (max - min || 1)) * 100

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.target.value))
    },
    [onChange],
  )

  return (
    <div className="slider-container">
      {label && (
        <div className="slider-header">
          <label className="slider-label" htmlFor={id}>
            {label}
          </label>
          <span className="slider-readout">
            {value}
            {unit && <span className="slider-unit">{unit}</span>}
          </span>
        </div>
      )}
      <input
        id={id}
        className="slider-input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{ '--fill': `${fill}%` } as React.CSSProperties}
      />
    </div>
  )
}
