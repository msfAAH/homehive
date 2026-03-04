import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import { uploadsUrl } from '../../api/client';
import type { Home } from '../../types';

interface HomeCardProps {
  home: Home;
}

export default function HomeCard({ home }: HomeCardProps) {
  const navigate = useNavigate();

  return (
    <Card onClick={() => navigate(`/homes/${home.id}`)} className={home.cover_photo ? 'overflow-hidden' : ''}>
      {home.cover_photo && (
        <div className="mb-3 -mx-4 -mt-4 h-36">
          <img
            src={uploadsUrl(`photos/${home.cover_photo}`)}
            alt={home.name}
            className="h-full w-full object-cover"
          />
        </div>
      )}
      <h3 className="text-lg font-semibold text-text">{home.name}</h3>
      {home.address && (
        <p className="mt-1 text-sm text-text-muted">{home.address}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-text-muted">
        {home.year_built && <span>Built {home.year_built}</span>}
        {home.room_count !== undefined && (
          <span>{home.room_count} {home.room_count === 1 ? 'room' : 'rooms'}</span>
        )}
        {home.project_count !== undefined && (
          <span>{home.project_count} {home.project_count === 1 ? 'project' : 'projects'}</span>
        )}
      </div>
    </Card>
  );
}
