import { useState } from 'react';
import Button from '../ui/Button';
import { apiPost, apiPut, apiDelete } from '../../api/client';
import type { Contractor } from '../../types';

const CONTRACTOR_TYPES = [
  'Roofing', 'Electrical', 'Plumbing', 'HVAC', 'GC', 'Carpentry',
  'Landscaping', 'Solar', 'Design', 'Architecture', 'Engineering',
  'Painting', 'Mason',
];

interface ContractorTableProps {
  projectId: number;
  contractors: Contractor[];
  onUpdate: () => void;
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

export default function ContractorTable({ projectId, contractors, onUpdate }: ContractorTableProps) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editData, setEditData] = useState<EditRow>(emptyRow);
  const [saving, setSaving] = useState(false);

  const startEdit = (c: Contractor) => {
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

  const startAdd = () => {
    setEditingId('new');
    setEditData({ ...emptyRow });
  };

  const cancel = () => {
    setEditingId(null);
    setEditData(emptyRow);
  };

  const save = async () => {
    if (!editData.company_name.trim()) return;
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

      if (editingId === 'new') {
        await apiPost(`/contractors/project/${projectId}`, body);
      } else {
        await apiPut(`/contractors/${editingId}`, body);
      }
      setEditingId(null);
      setEditData(emptyRow);
      onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
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
      className="w-full rounded border border-border px-2 py-1 text-sm bg-white text-text"
      value={editData.contractor_type}
      onChange={(e) => setEditData({ ...editData, contractor_type: e.target.value })}
    >
      <option value="">Type (optional)</option>
      {CONTRACTOR_TYPES.map((t) => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  );

  const editForm = (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {field('company_name', 'Company name')}
        {typeSelect}
        {field('contact_name', 'Main contact')}
        {field('phone', 'Phone', 'tel')}
        {field('email', 'Email', 'email')}
        {field('website', 'Website (https://...)', 'url')}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !editData.company_name.trim()}>
          {saving ? '...' : 'Save'}
        </Button>
        <Button size="sm" variant="secondary" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {contractors.length > 0 && (
        <div className="flex flex-col gap-3 mb-3">
          {contractors.map((c) =>
            editingId === c.id ? (
              <div key={c.id} className="rounded-lg border border-border p-3">
                {editForm}
              </div>
            ) : (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text">{c.company_name}</span>
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
                        <a href={`tel:${c.phone}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {c.phone}
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {c.email}
                        </a>
                      )}
                      {c.website && (
                        <a href={c.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary" onClick={(e) => e.stopPropagation()}>
                          {c.website}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(c)} disabled={editingId !== null}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(c.id)} disabled={editingId !== null}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {editingId === 'new' && (
        <div className="rounded-lg border border-border p-3 mb-3">
          {editForm}
        </div>
      )}

      {editingId === null && (
        <Button size="sm" variant="secondary" onClick={startAdd}>
          Add Contractor
        </Button>
      )}
    </div>
  );

  function handleDelete(id: number) {
    if (!window.confirm('Remove this contractor?')) return;
    apiDelete(`/contractors/${id}`).then(onUpdate).catch(console.error);
  }
}
