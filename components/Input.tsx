interface InputProps {
  label?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  required?: boolean;
  name?: string;
  step?: string;
  min?: string;
  max?: string;
  error?: string;
  help?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  required = false,
  name,
  step,
  min,
  max,
  error,
  help,
  icon,
}: InputProps) {
  return (
    <div className={className}>
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-light">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          name={name}
          step={step}
          min={min}
          max={max}
          className={`input ${icon ? 'pl-10' : ''} ${error ? 'border-error focus:ring-error' : ''}`}
        />
      </div>
      {error && <p className="text-error text-xs mt-1 font-medium">{error}</p>}
      {help && <p className="input-help">{help}</p>}
    </div>
  );
}
