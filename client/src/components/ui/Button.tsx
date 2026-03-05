import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm',
  secondary: 'bg-white border border-border hover:bg-surface-dark text-text shadow-sm',
  danger: 'bg-danger text-white hover:bg-red-700 shadow-sm',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-3.5 py-1.5 text-sm min-h-[36px] tracking-wide',
  md: 'px-5 py-2.5 text-sm font-semibold min-h-[44px] tracking-wide',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
