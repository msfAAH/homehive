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

const ROOM_ICONS: { icon: string; label: string }[] = [
  { icon: 'weekend', label: 'Living Room' },
  { icon: 'bed', label: 'Bedroom' },
  { icon: 'cooking', label: 'Kitchen' },
  { icon: 'bathtub', label: 'Bathroom' },
  { icon: 'garage', label: 'Garage' },
  { icon: 'park', label: 'Backyard' },
  { icon: 'dining', label: 'Dining Room' },
  { icon: 'desktop_windows', label: 'Office' },
  { icon: 'warehouse', label: 'Basement' },
  { icon: 'local_laundry_service', label: 'Laundry' },
  { icon: 'deck', label: 'Patio / Deck' },
  { icon: 'fitness_center', label: 'Gym' },
  { icon: 'pool', label: 'Pool' },
  { icon: 'crib', label: 'Nursery' },
  { icon: 'door_front', label: 'Hallway' },
  { icon: 'menu_book', label: 'Library' },
  { icon: 'sports_esports', label: 'Game Room' },
  { icon: 'palette', label: 'Art Studio' },
  { icon: 'yard', label: 'Garden' },
  { icon: 'construction', label: 'Workshop' },
  { icon: 'toys', label: 'Playroom' },
  { icon: 'footprint', label: 'Mudroom' },
  { icon: 'wb_sunny', label: 'Sunroom' },
  { icon: 'home', label: 'Other' },
];

// Ordered from most specific to least — first match wins
const ICON_KEYWORDS: { keywords: string[]; icon: string }[] = [
  { keywords: ['living'], icon: 'weekend' },
  { keywords: ['master', 'primary', 'guest', 'bedroom', 'bed'], icon: 'bed' },
  { keywords: ['kitchen'], icon: 'cooking' },
  { keywords: ['bath', 'powder', 'toilet', 'washroom', 'restroom', 'wc'], icon: 'bathtub' },
  { keywords: ['garage'], icon: 'garage' },
  { keywords: ['backyard', 'back yard', 'yard'], icon: 'park' },
  { keywords: ['dining'], icon: 'dining' },
  { keywords: ['office', 'study', 'den'], icon: 'desktop_windows' },
  { keywords: ['basement', 'cellar'], icon: 'warehouse' },
  { keywords: ['laundry', 'utility'], icon: 'local_laundry_service' },
  { keywords: ['patio', 'deck', 'terrace'], icon: 'deck' },
  { keywords: ['gym', 'fitness', 'exercise', 'workout'], icon: 'fitness_center' },
  { keywords: ['pool'], icon: 'pool' },
  { keywords: ['nursery', 'baby'], icon: 'crib' },
  { keywords: ['hallway', 'hall', 'foyer', 'entry', 'entryway'], icon: 'door_front' },
  { keywords: ['library'], icon: 'menu_book' },
  { keywords: ['game', 'media', 'theater', 'theatre', 'cinema', 'entertainment'], icon: 'sports_esports' },
  { keywords: ['art', 'studio', 'craft'], icon: 'palette' },
  { keywords: ['garden'], icon: 'yard' },
  { keywords: ['workshop', 'shop', 'tool'], icon: 'construction' },
  { keywords: ['playroom', 'play room'], icon: 'toys' },
  { keywords: ['mud', 'mudroom'], icon: 'footprint' },
  { keywords: ['sunroom', 'sun room', 'solarium'], icon: 'wb_sunny' },
];

function autoDetectIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, icon } of ICON_KEYWORDS) {
    if (keywords.some((kw) => lower.includes(kw))) return icon;
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

  const handleIconSelect = (selectedIcon: string) => {
    const next = selectedIcon === icon ? '' : selectedIcon;
    setIcon(next);
    setManualIcon(next !== '');
    if (next !== '' && !name.trim()) {
      const iconEntry = ROOM_ICONS.find((r) => r.icon === next);
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
        <label className="text-sm font-medium text-slate">
          Icon
          {icon && (
            <button
              type="button"
              className="ml-2 text-xs text-slate underline hover:text-danger"
              onClick={handleIconClear}
            >
              clear
            </button>
          )}
        </label>
        <div className="grid grid-cols-6 gap-1.5">
          {ROOM_ICONS.map(({ icon: iconName, label }) => (
            <button
              key={iconName}
              type="button"
              title={label}
              onClick={() => handleIconSelect(iconName)}
              className={`flex flex-col items-center justify-center rounded-lg border p-2 transition-colors ${
                icon === iconName
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50 hover:bg-surface-dark'
              }`}
            >
              <span className="material-symbols-rounded text-[22px] text-navy">{iconName}</span>
              <span className="mt-0.5 text-[9px] leading-tight text-slate text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="room-floor" className="text-sm font-medium text-slate">
          Floor
        </label>
        <input
          id="room-floor"
          list="floor-options"
          className="w-full rounded-lg border border-border px-3 py-2 min-h-[44px] bg-warm-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
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
        <label htmlFor="room-notes" className="text-sm font-medium text-slate">
          Notes
        </label>
        <textarea
          id="room-notes"
          className="w-full rounded-lg border border-border px-3 py-2 min-h-[80px] bg-warm-white text-text focus:outline-primary focus:ring-1 focus:ring-primary"
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
