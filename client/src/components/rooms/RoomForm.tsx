import { useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { apiPost, apiPut } from '../../api/client';
import type { Room } from '../../types';

interface RoomFormProps {
  homeId: number;
  room?: Room;
  onSave: () => void;
  onCancel: () => void;
}

const floorPresets = [
  'Ground', 'Main', 'Bedroom Level', '1st', '2nd', '3rd',
  'Basement', 'Attic', 'Garage', 'Exterior',
];

const ROOM_ICONS: { emoji: string; label: string }[] = [
  { emoji: '🛋️', label: 'Living Room' },
  { emoji: '🛏️', label: 'Bedroom' },
  { emoji: '🍳', label: 'Kitchen' },
  { emoji: '🛁', label: 'Bathroom' },
  { emoji: '🚗', label: 'Garage' },
  { emoji: '🌳', label: 'Backyard' },
  { emoji: '🍽️', label: 'Dining Room' },
  { emoji: '💻', label: 'Office' },
  { emoji: '📦', label: 'Basement' },
  { emoji: '🧺', label: 'Laundry' },
  { emoji: '☀️', label: 'Patio / Deck' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🏊', label: 'Pool' },
  { emoji: '🍼', label: 'Nursery' },
  { emoji: '🚪', label: 'Hallway' },
  { emoji: '📚', label: 'Library' },
  { emoji: '🎮', label: 'Game Room' },
  { emoji: '🎨', label: 'Art Studio' },
  { emoji: '🌿', label: 'Garden' },
  { emoji: '🔧', label: 'Workshop' },
  { emoji: '🧸', label: 'Playroom' },
  { emoji: '👟', label: 'Mudroom' },
  { emoji: '🪟', label: 'Sunroom' },
  { emoji: '🏠', label: 'Other' },
];

// Ordered from most specific to least — first match wins
const ICON_KEYWORDS: { keywords: string[]; emoji: string }[] = [
  { keywords: ['living'], emoji: '🛋️' },
  { keywords: ['master', 'primary', 'guest', 'bedroom', 'bed'], emoji: '🛏️' },
  { keywords: ['kitchen'], emoji: '🍳' },
  { keywords: ['bath', 'powder', 'toilet', 'washroom', 'restroom', 'wc'], emoji: '🛁' },
  { keywords: ['garage'], emoji: '🚗' },
  { keywords: ['backyard', 'back yard', 'yard'], emoji: '🌳' },
  { keywords: ['dining'], emoji: '🍽️' },
  { keywords: ['office', 'study', 'den'], emoji: '💻' },
  { keywords: ['basement', 'cellar'], emoji: '📦' },
  { keywords: ['laundry', 'utility'], emoji: '🧺' },
  { keywords: ['patio', 'deck', 'terrace'], emoji: '☀️' },
  { keywords: ['gym', 'fitness', 'exercise', 'workout'], emoji: '🏋️' },
  { keywords: ['pool'], emoji: '🏊' },
  { keywords: ['nursery', 'baby'], emoji: '🍼' },
  { keywords: ['hallway', 'hall', 'foyer', 'entry', 'entryway'], emoji: '🚪' },
  { keywords: ['library'], emoji: '📚' },
  { keywords: ['game', 'media', 'theater', 'theatre', 'cinema', 'entertainment'], emoji: '🎮' },
  { keywords: ['art', 'studio', 'craft'], emoji: '🎨' },
  { keywords: ['garden'], emoji: '🌿' },
  { keywords: ['workshop', 'shop', 'tool'], emoji: '🔧' },
  { keywords: ['playroom', 'play room'], emoji: '🧸' },
  { keywords: ['mud', 'mudroom'], emoji: '👟' },
  { keywords: ['sunroom', 'sun room', 'solarium'], emoji: '🪟' },
];

function autoDetectIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, emoji } of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return emoji;
  }
  return '';
}

export default function RoomForm({ homeId, room, onSave, onCancel }: RoomFormProps) {
  const [name, setName] = useState(room?.name ?? '');
  const [icon, setIcon] = useState(room?.icon ?? '');
  const [manualIcon, setManualIcon] = useState(!!room?.icon);
  const [floor, setFloor] = useState(room?.floor ?? '');
  const [notes, setNotes] = useState(room?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleNameChange = (value: string) => {
    setName(value);
    if (!manualIcon) {
      setIcon(autoDetectIcon(value));
    }
  };

  const handleIconSelect = (emoji: string) => {
    const next = emoji === icon ? '' : emoji;
    setIcon(next);
    setManualIcon(next !== '');
    if (next !== '' && !name.trim()) {
      const iconEntry = ROOM_ICONS.find((r) => r.emoji === next);
      if (iconEntry) setName(iconEntry.label);
    }
  };

  const handleIconClear = () => {
    setIcon('');
    setManualIcon(false);
  };

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
      icon: icon || null,
      floor: floor || null,
      notes: notes.trim() || null,
    };

    try {
      if (room) {
        await apiPut(`/rooms/${room.id}`, body);
      } else {
        await apiPost(`/rooms/home/${homeId}`, body);
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

      <Input
        label="Name"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        required
        placeholder="Living Room"
      />

      {/* Icon Picker */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-muted">
          Icon
          {icon && (
            <button
              type="button"
              className="ml-2 text-xs text-text-muted underline hover:text-danger"
              onClick={handleIconClear}
            >
              clear
            </button>
          )}
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {ROOM_ICONS.map(({ emoji, label }) => (
            <button
              key={emoji}
              type="button"
              title={label}
              onClick={() => handleIconSelect(emoji)}
              className={`flex flex-col items-center justify-center rounded-lg border p-2 text-xl transition-colors ${
                icon === emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-surface-dark'
              }`}
            >
              <span>{emoji}</span>
              <span className="mt-0.5 text-[9px] leading-tight text-text-muted text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="room-floor" className="text-sm font-medium text-text-muted">
          Floor
        </label>
        <input
          id="room-floor"
          list="floor-options"
          className="w-full rounded-lg border border-border px-3 py-2 min-h-[44px] bg-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
          value={floor}
          onChange={(e) => setFloor(e.target.value)}
          placeholder="Select or type a floor..."
        />
        <datalist id="floor-options">
          {floorPresets.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="room-notes" className="text-sm font-medium text-text-muted">
          Notes
        </label>
        <textarea
          id="room-notes"
          className="w-full rounded-lg border border-border px-3 py-2 min-h-[80px] bg-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about this room..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : room ? 'Update Room' : 'Add Room'}
        </Button>
      </div>
    </form>
  );
}
