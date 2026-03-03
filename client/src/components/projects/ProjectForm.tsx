import { useState, useEffect, type FormEvent } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { apiGet, apiPost, apiPut } from '../../api/client';
import type { Project, Category, Room } from '../../types';

interface ProjectFormProps {
  homeId: number;
  project?: Project;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProjectForm({ homeId, project, onSave, onCancel }: ProjectFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [name, setName] = useState(project?.name ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [categoryId, setCategoryId] = useState(String(project?.category_id ?? ''));
  const [status, setStatus] = useState<string>(project?.status ?? 'planned');
  const [roomId, setRoomId] = useState(String(project?.room_id ?? ''));
  const [yearCreated, setYearCreated] = useState(project?.year_created ? String(project.year_created) : '');
  const [estimatedCost, setEstimatedCost] = useState(project?.estimated_cost ? String(project.estimated_cost) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Category[]>('/categories').then(setCategories).catch(console.error);
    apiGet<Room[]>(`/rooms/home/${homeId}`).then(setRooms).catch(console.error);
  }, [homeId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        category_id: categoryId ? Number(categoryId) : null,
        status,
        room_id: roomId ? Number(roomId) : null,
        year_created: yearCreated ? Number(yearCreated) : null,
        estimated_cost: estimatedCost ? Number(estimatedCost) : 0,
      };

      if (project) {
        await apiPut(`/projects/${project.id}`, body);
      } else {
        await apiPost(`/projects/home/${homeId}`, body);
      }
      onSave();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const categoryOptions = [
    { value: '', label: 'No category' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  const statusOptions = [
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const roomOptions = [
    { value: '', label: 'No room' },
    ...rooms.map((r) => ({ value: String(r.id), label: r.name })),
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-text-muted">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border px-3 py-2 bg-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      <Select
        label="Category"
        options={categoryOptions}
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
      />

      <Select
        label="Status"
        options={statusOptions}
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      />

      <Select
        label="Room"
        options={roomOptions}
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />

      <Input
        label="Year"
        type="number"
        value={yearCreated}
        onChange={(e) => setYearCreated(e.target.value)}
      />

      <Input
        label="Estimated Cost"
        type="number"
        step="0.01"
        value={estimatedCost}
        onChange={(e) => setEstimatedCost(e.target.value)}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : project ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
