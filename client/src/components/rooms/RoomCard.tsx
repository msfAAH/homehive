import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import type { Room, Project } from '../../types';

interface RoomCardProps {
  room: Room;
  projects?: Project[];
}

function formatCost(value: number): string {
  return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function RoomCard({ room, projects = [] }: RoomCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/homes/${room.home_id}/rooms/${room.id}`)}>
      <h3 className="text-lg font-semibold text-text flex items-center gap-2">
        {room.icon && <span className="material-symbols-rounded text-xl leading-none text-slate">{room.icon}</span>}
        {room.name}
      </h3>
      <div className="mt-2 flex flex-wrap gap-4 text-sm text-text-muted">
        {room.floor && <span>{room.floor}</span>}
        {room.project_count !== undefined && (
          <span>{room.project_count} {room.project_count === 1 ? 'project' : 'projects'}</span>
        )}
        {!!room.item_count && (
          <span>{room.item_count} {room.item_count === 1 ? 'appliance' : 'appliances'}</span>
        )}
      </div>
      {projects.length > 0 && (
        <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
          {Object.entries(
            projects.reduce<Record<string, Project[]>>((acc, p) => {
              const key = p.year_created ? String(p.year_created) : 'No Year';
              (acc[key] ??= []).push(p);
              return acc;
            }, {})
          )
            .sort(([a], [b]) => {
              if (a === 'No Year') return 1;
              if (b === 'No Year') return -1;
              return Number(b) - Number(a);
            })
            .map(([year, yearProjects]) => (
              <div key={year}>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">{year}</p>
                <ul className="flex flex-col gap-1">
                  {yearProjects.map((project) => {
                    const cost = project.actual_cost > 0 ? project.actual_cost : project.estimated_cost;
                    return (
                      <li key={project.id} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-text truncate mr-2">{project.name}</span>
                        {cost > 0 && <span className="shrink-0 text-text-muted">{formatCost(cost)}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
