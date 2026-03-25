import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet, apiPut, apiDelete } from '../api/client';
import Button from '../components/ui/Button';
import type { Contractor } from '../types';

const CONTRACTOR_TYPES = [
  'Roofing', 'Electrical', 'Plumbing', 'HVAC', 'GC', 'Carpentry',
  'Landscaping', 'Solar', 'Design', 'Architecture', 'Engineering',
  'Painting', 'Mason',
];

interface ContractorWithProject extends Contractor {
  project_name: string;
  project_id: number;
}

interface EditRow {
  company_name: string;
  contractor_type: string;
  contact_name: string;
  phone: string;
  email: string;
  website: string;
}

const emptyRow: EditRow = {
  company_name: '',
  contractor_type: '',
  contact_name: '',
  phone: '',
  email: '',
  website: '',
};

export default function HomeContractorsPage() {
  const { homeId } = useParams<{ homeId: string }>();
  const id = Number(homeId);

  const [contractors, setContractors] = useState<ContractorWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<EditRow>(emptyRow);
  const [saving, setSaving] = useState(false);

  const fetchContractors = () => {
    apiGet<ContractorWithProject[]>(`/contractors/home/${id}`)
      .then(setContractors)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchContractors();
  }, [id]);

  const startEdit = (c: ContractorWithProject) => {
    setEditingId(c.id);
    setEditData({
      company_name: c.company_name,
      contractor_type: c.contractor_type ?? '',
      contact_name: c.contact_name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
    });
  };

  const cancel = () => {
    setEditingId(null);
    setEditData(emptyRow);
  };

  const save = async () => {
    if (!editData.company_name.trim() || editingId === null) return;
    setSaving(true);
    try {
      const body = {
        company_name: editData.company_name.trim(),
        contractor_type: editData.contractor_type || null,
        contact_name: editData.contact_name.trim() || null,
        phone: editData.phone.trim() || null,
        email: editData.email.trim() || null,
        website: editData.website.trim() || null,
      };
      await apiPut(`/contractors/${editingId}`, body);
      setEditingId(null);
      setEditData(emptyRow);
      fetchContractors();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (contractorId: number) => {
    if (!window.confirm('Remove this contractor?')) return;
    apiDelete(`/contractors/${contractorId}`).then(fetchContractors).catch(console.error);
  };

  const field = (key: keyof EditRow, placeholder: string, type = 'text') => (
    <input
      className="w-full rounded border border-border px-2 py-1 text-sm"
      type={type}
      placeholder={placeholder}
      value={editData[key]}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
    />
  );

  const typeSelect = (
    <select
      className="w-full rounded border border-border px-2 py-1 text-sm bg-warm-white text-text"
      value={editData.contractor_type}
      onChange={(e) => setEditData({ ...editData, contractor_type: e.target.value })}
    >
      <option value="">Type (optional)</option>
      {CONTRACTOR_TYPES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );

  const editForm = (contractorId: number) => (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {field('company_name', 'Company name')}
        {typeSelect}
        {field('contact_name', 'Main contact')}
        {field('phone', 'Phone', 'tel')}
        {field('email', 'Email', 'email')}
        {field('website', 'Website (https://...)', 'url')}
      </div>
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving || !editData.company_name.trim()}>
            {saving ? '...' : 'Save'}
          </Button>
          <Button size="sm" variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        </div>
        <Button size="sm" variant="danger" onClick={() => { cancel(); handleDelete(contractorId); }}>Remove</Button>
      </div>
    </div>
  );

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

      <h1 className="mb-6 font-display text-2xl font-semibold text-navy">Contractors</h1>

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
                {group.map((c) =>
                  editingId === c.id ? (
                    <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                      {editForm(c.id)}
                    </div>
                  ) : (
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
                        <div className="flex shrink-0">
                          <Button size="sm" variant="secondary" onClick={() => startEdit(c)} disabled={editingId !== null}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
