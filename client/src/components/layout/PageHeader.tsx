import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  action?: ReactNode;
}

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="font-display text-2xl font-semibold text-navy">{title}</h1>
      {action && <div>{action}</div>}
    </div>
  );
}
