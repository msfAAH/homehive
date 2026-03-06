import type { Project } from '../../types';

const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
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
