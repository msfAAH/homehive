import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import type { Project } from '../../types';

const fmt = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusStyles: Record<string, string> = {
  planned: 'bg-border text-text-muted',
  in_progress: 'bg-primary/20 text-nav',
  completed: 'bg-success/20 text-success',
};

const statusLabels: Record<string, string> = {
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
};

interface ProjectCardProps {
  project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/projects/${project.id}`)}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-text">{project.name}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[project.status]}`}
        >
          {statusLabels[project.status]}
        </span>
      </div>

      {project.category_name && (
        <span className="mt-1 inline-block rounded-full bg-info/15 px-2.5 py-0.5 text-xs font-medium text-slate">
          {project.category_name}
        </span>
      )}

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
        {project.estimated_cost > 0 && (
          <span>Estimated: {fmt(project.estimated_cost)}</span>
        )}
        {project.actual_cost > 0 && (
          <span>Actual: {fmt(project.actual_cost)}</span>
        )}
      </div>
    </Card>
  );
}
