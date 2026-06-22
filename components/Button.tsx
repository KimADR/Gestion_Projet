interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'outline' | 'subtle' | 'ghost' | 'accent';
  className?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  loading?: boolean;
  form?: string;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  className = '',
  disabled = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  form,
}: ButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    subtle: 'btn-subtle',
    ghost: 'btn-ghost',
    accent: 'btn-accent',
  };

  const sizeClasses = {
    xs: 'px-3 py-1.5 text-xs',
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
    xl: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      form={form}
      className={`btn ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${disabled || loading ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
    >
      <span className="flex items-center justify-center gap-2">
        {loading && (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2"></circle>
            <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" opacity="0.75"></path>
          </svg>
        )}
        {icon && iconPosition === 'left' && !loading && <span className="flex items-center">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && !loading && <span className="flex items-center">{icon}</span>}
      </span>
    </button>
  );
}
