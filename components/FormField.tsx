'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  error,
  hint,
  required = false,
  className = '',
  children,
}: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block">
        <span className="text-sm font-semibold text-foreground">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      {children}
      {error && <p className="text-sm text-error mt-1">{error}</p>}
      {hint && <p className="text-sm text-secondary-light mt-1">{hint}</p>}
    </div>
  );
}

interface InputFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  inputClassName?: string;
}

export function InputField({
  label,
  error,
  hint,
  required = false,
  containerClassName = '',
  inputClassName = '',
  ...inputProps
}: InputFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <input
        {...inputProps}
        className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${inputClassName}`}
      />
    </FormField>
  );
}

interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label: string;
  options: Array<{ value: string | number; label: string }>;
  error?: string;
  hint?: string;
  containerClassName?: string;
  selectClassName?: string;
}

export function SelectField({
  label,
  options,
  error,
  hint,
  required = false,
  containerClassName = '',
  selectClassName = '',
  ...selectProps
}: SelectFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <select
        {...selectProps}
        className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${selectClassName}`}
      >
        <option value="">Sélectionnez une option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}

interface TextAreaFieldProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
  textareaClassName?: string;
}

export function TextAreaField({
  label,
  error,
  hint,
  required = false,
  containerClassName = '',
  textareaClassName = '',
  ...textareaProps
}: TextAreaFieldProps) {
  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={containerClassName}
    >
      <textarea
        {...textareaProps}
        className={`w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-colors focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-200 ${textareaClassName}`}
      />
    </FormField>
  );
}
