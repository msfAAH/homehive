import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function Input({ label, id, className = '', ...rest }: InputProps) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-text-muted">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-lg border border-border px-3 py-2 min-h-[44px] bg-white text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-slate/30 focus:border-slate transition-colors ${className}`}
        {...rest}
      />
    </div>
  );
}
