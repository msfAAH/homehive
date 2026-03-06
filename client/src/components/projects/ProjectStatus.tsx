import type { Project } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-sand/30 text-slate',
  in_progress: 'bg-primary/20 text-primary-dark',
  completed: 'bg-success/20 text-success',
};

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

export function StatusBadge({ status }: { status: Project['status'] }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function formatCost(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
