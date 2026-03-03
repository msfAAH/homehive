import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import CoverPhotoEditor from './CoverPhotoEditor';
import { apiPost, apiPut, apiUpload } from '../../api/client';
import type { Home } from '../../types';

interface HomeFormProps {
  home?: Home;
  onSave: () => void;
  onCancel: () => void;
}

export default function HomeForm({ home, onSave, onCancel }: HomeFormProps) {
  const [name, setName] = useState(home?.name ?? '');
  const [address, setAddress] = useState(home?.address ?? '');
  const [yearBuilt, setYearBuilt] = useState(home?.year_built?.toString() ?? '');
  const [yearBought, setYearBought] = useState(home?.year_bought?.toString() ?? '');
  const [notes, setNotes] = useState(home?.notes ?? '');
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError('');

    const body = {
      name: name.trim(),
      address: address.trim() || null,
      year_built: yearBuilt ? Number(yearBuilt) : null,
      year_bought: yearBought ? Number(yearBought) : null,
      notes: notes.trim() || null,
    };

    try {
      let savedId: number;
      if (home) {
        await apiPut(`/homes/${home.id}`, body);
        savedId = home.id;
      } else {
        const created = await apiPost<Home>('/homes', body);
        savedId = created.id;
      }

      if (pendingPhoto) {
        const formData = new FormData();
        formData.append('photo', pendingPhoto, 'cover.jpg');
        await apiUpload(`/homes/${savedId}/cover-photo`, formData);
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}
      <CoverPhotoEditor
        currentPhoto={home?.cover_photo ?? null}
        onCropReady={(blob) => setPendingPhoto(blob)}
      />
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="My House"
      />
      <Input
        label="Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="123 Main St"
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Year Built"
          type="number"
          value={yearBuilt}
          onChange={(e) => setYearBuilt(e.target.value)}
          placeholder="2000"
        />
        <Input
          label="Year Bought"
          type="number"
          value={yearBought}
          onChange={(e) => setYearBought(e.target.value)}
          placeholder="2020"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="home-notes" className="text-sm font-medium text-text-muted">
          Notes
        </label>
        <textarea
          id="home-notes"
          className="w-full rounded-lg border border-border px-3 py-2 min-h-[80px] bg-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this home..."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : home ? 'Update Home' : 'Add Home'}
        </Button>
      </div>
    </form>
  );
}
