import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-primary hover:bg-primary-dark text-nav font-semibold shadow-sm',
  secondary: 'bg-transparent border-2 border-slate hover:bg-slate/10 text-slate shadow-sm',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-1.5 text-sm min-h-[36px] tracking-wide',
  md: 'px-6 py-2.5 text-sm font-semibold min-h-[44px] tracking-wide',
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
      className={`inline-flex items-center justify-center rounded-full font-medium transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
