import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { Contractor } from '../types';

interface ContractorWithProject extends Contractor {
  project_name: string;
  project_id: number;
}

export default function HomeContractorsPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const id = Number(homeId);

  const [contractors, setContractors] = useState<ContractorWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<ContractorWithProject[]>(`/contractors/home/${id}`)
      .then(setContractors)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Group contractors by project
  const byProject = contractors.reduce<Record<string, ContractorWithProject[]>>((acc, c) => {
    const key = c.project_name;
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  return (
    <div>
      <Link to={`/homes/${id}`} className="mb-4 inline-block text-sm text-primary hover:underline">
        &larr; Back to Home
      </Link>

      <h1 className="mb-6 text-2xl font-bold text-text">Contractors</h1>

      {loading && <p className="text-text-muted">Loading...</p>}

      {!loading && contractors.length === 0 && (
        <p className="text-text-muted">No contractors have been added to any projects yet.</p>
      )}

      {!loading && contractors.length > 0 && (
        <div className="flex flex-col gap-8">
          {Object.entries(byProject).map(([projectName, group]) => (
            <div key={projectName}>
              <Link
                to={`/projects/${group[0].project_id}`}
                className="mb-3 inline-block text-base font-semibold text-primary hover:underline"
              >
                {projectName}
              </Link>
              <div className="flex flex-col gap-3">
                {group.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text">{c.company_name}</span>
                          {c.contractor_type && (
                            <span className="rounded bg-surface-dark px-2 py-0.5 text-xs font-medium text-text-muted">
                              {c.contractor_type}
                            </span>
                          )}
                        </div>
                        {c.contact_name && (
                          <span className="text-sm text-text-muted">{c.contact_name}</span>
                        )}
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-text-muted">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="hover:text-primary">
                              {c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="hover:text-primary">
                              {c.email}
                            </a>
                          )}
                          {c.website && (
                            <a
                              href={c.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-primary"
                            >
                              {c.website}
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
