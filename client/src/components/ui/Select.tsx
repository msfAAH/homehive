import type { SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
}

export default function Select({ label, options, id, className = '', ...rest }: SelectProps) {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-text-muted">
        {label}
      </label>
      <select
        id={selectId}
        className={`w-full rounded-xl border border-border px-3 py-2 min-h-[44px] bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
