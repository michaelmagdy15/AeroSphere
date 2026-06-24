import { useCallback, useId } from 'react';
import './TextInput.css';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  type?: 'text' | 'number' | 'password';
  disabled?: boolean;
}

export default function TextInput({
  value,
  onChange,
  placeholder,
  label,
  type = 'text',
  disabled = false,
}: TextInputProps) {
  const id = useId();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  );

  return (
    <div className="text-input-container">
      {label && (
        <label className="text-input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        className="text-input"
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
