import { useCallback } from 'react'
import './Toggle.css'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  const handleClick = useCallback(() => {
    onChange(!checked)
  }, [checked, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        onChange(!checked)
      }
    },
    [checked, onChange],
  )

  return (
    <div className="toggle-wrapper">
      <div
        className="toggle-track"
        role="switch"
        aria-checked={checked}
        tabIndex={0}
        data-checked={checked}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <div className="toggle-thumb">
          <div className="toggle-dot" />
        </div>
      </div>
      {label && <span className="toggle-label">{label}</span>}
    </div>
  )
}
