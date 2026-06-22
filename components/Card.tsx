import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'elevated' | 'hover';
  footer?: ReactNode;
}

export function Card({
  children,
  className = '',
  title,
  subtitle,
  variant = 'default',
  footer,
}: CardProps) {
  const variantClasses = {
    default: 'card',
    elevated: 'card-elevated',
    hover: 'card-hover',
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
      )}
      <div className="space-y-3">{children}</div>
      {footer && <div className="mt-4 border-t border-slate-200 pt-4">{footer}</div>}
    </div>
  );
}
