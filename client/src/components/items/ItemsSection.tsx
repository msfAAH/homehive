import { useState } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import AttachmentUpload from '../attachments/AttachmentUpload';
import WarrantyMaintenance from '../WarrantyMaintenance';
import { apiPost, apiPut, apiDelete, uploadsUrl } from '../../api/client';
import type { Item, Attachment } from '../../types';

const CATEGORIES = ['Appliance', 'Tool', 'Electronics', 'Fixture', 'HVAC', 'Plumbing', 'Electrical', 'Other'];

const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface ItemFormState {
  name: string;
  category: string;
  brand: string;
  model: string;
  serial_number: string;
  purchase_date: string;
  purchase_price: string;
  warranty_expiry: string;
  notes: string;
}

const emptyForm: ItemFormState = {
  name: '', category: '', brand: '', model: '',
  serial_number: '', purchase_date: '', purchase_price: '',
  warranty_expiry: '', notes: '',
};

function itemToForm(item: Item): ItemFormState {
  return {
    name: item.name,
    category: item.category ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    serial_number: item.serial_number ?? '',
    purchase_date: item.purchase_date ?? '',
    purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
    warranty_expiry: item.warranty_expiry ?? '',
    notes: item.notes ?? '',
  };
}

interface ItemFormProps {
  initial: ItemFormState;
  onSave: (data: ItemFormState) => Promise<void>;
  onCancel: () => void;
}

function ItemForm({ initial, onSave, onCancel }: ItemFormProps) {
  const [form, setForm] = useState<ItemFormState>(initial);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof ItemFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const inputClass = 'w-full rounded-lg border border-border px-3 py-2 text-sm bg-white text-text focus:outline-primary focus:ring-1 focus:ring-primary';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Name *</label>
          <input className={inputClass} value={form.name} onChange={set('name')} placeholder="Refrigerator" required />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Category</label>
          <select className={inputClass} value={form.category} onChange={set('category')}>
            <option value="">— select —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Brand</label>
          <input className={inputClass} value={form.brand} onChange={set('brand')} placeholder="Samsung" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Model</label>
          <input className={inputClass} value={form.model} onChange={set('model')} placeholder="RF28R6201SR" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Serial Number</label>
          <input className={inputClass} value={form.serial_number} onChange={set('serial_number')} placeholder="SN1234567" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Purchase Date</label>
          <input className={inputClass} type="date" value={form.purchase_date} onChange={set('purchase_date')} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Purchase Price</label>
          <input className={inputClass} type="number" step="0.01" value={form.purchase_price} onChange={set('purchase_price')} placeholder="1200" />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Warranty Expiry</label>
          <input className={inputClass} type="date" value={form.warranty_expiry} onChange={set('warranty_expiry')} />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Notes</label>
          <textarea className={`${inputClass} min-h-[64px]`} value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </form>
  );
}

function PhotoGrid({ attachments, onDelete }: { attachments: Attachment[]; onDelete: (id: number) => void }) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const photos = attachments.filter((a) => a.file_type === 'photo');
  if (photos.length === 0) return null;
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-2">
        {photos.map((att) => (
          <div key={att.id} className="group relative">
            <img
              src={uploadsUrl(`photos/${att.stored_name}`)}
              alt={att.file_name}
              className="aspect-square w-full rounded-lg object-cover cursor-pointer"
              onClick={() => setPreviewSrc(uploadsUrl(`photos/${att.stored_name}`))}
            />
            <button
              onClick={() => onDelete(att.id)}
              className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >✕</button>
          </div>
        ))}
      </div>
      <Modal isOpen={!!previewSrc} onClose={() => setPreviewSrc(null)} title="Photo">
        {previewSrc && <img src={previewSrc} alt="preview" className="w-full rounded-lg" />}
      </Modal>
    </>
  );
}

function DocList({ attachments, onDelete }: { attachments: Attachment[]; onDelete: (id: number) => void }) {
  const docs = attachments.filter((a) => a.file_type === 'document');
  if (docs.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 mb-2">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <a
            href={uploadsUrl(`documents/${doc.stored_name}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate"
          >{doc.file_name}</a>
          <button
            onClick={() => onDelete(doc.id)}
            className="ml-2 shrink-0 text-text-muted hover:text-danger transition-colors text-xs"
          >✕</button>
        </div>
      ))}
    </div>
  );
}

interface ItemsSectionProps {
  roomId: number;
  items: Item[];
  onUpdate: () => void;
}

export default function ItemsSection({ roomId, items, onUpdate }: ItemsSectionProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);

  const handleAdd = async (data: ItemFormState) => {
    await apiPost(`/items/room/${roomId}`, {
      ...data,
      purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
      category: data.category || null,
      purchase_date: data.purchase_date || null,
      warranty_expiry: data.warranty_expiry || null,
    });
    setEditingId(null);
    onUpdate();
  };

  const handleEdit = async (item: Item, data: ItemFormState) => {
    await apiPut(`/items/${item.id}`, {
      ...data,
      purchase_price: data.purchase_price ? Number(data.purchase_price) : null,
      category: data.category || null,
      purchase_date: data.purchase_date || null,
      warranty_expiry: data.warranty_expiry || null,
    });
    setEditingId(null);
    onUpdate();
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this item and all its files?')) return;
    await apiDelete(`/items/${id}`);
    if (expandedId === id) setExpandedId(null);
    onUpdate();
  };

  const handleDeleteAttachment = async (id: number) => {
    if (!window.confirm('Delete this file?')) return;
    await apiDelete(`/attachments/${id}`);
    onUpdate();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Appliances &amp; Tools</h2>
        {editingId !== 'new' && (
          <Button size="sm" onClick={() => { setEditingId('new'); setExpandedId(null); }}>Add Item</Button>
        )}
      </div>

      {editingId === 'new' && (
        <div className="mb-3 rounded-xl border border-border bg-surface p-4">
          <ItemForm
            initial={emptyForm}
            onSave={handleAdd}
            onCancel={() => setEditingId(null)}
          />
        </div>
      )}

      {items.length === 0 && editingId !== 'new' && (
        <p className="text-sm text-text-muted">No appliances or tools added yet.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isExpanded = expandedId === item.id;
          const isEditing = editingId === item.id;
          const atts = item.attachments ?? [];

          return (
            <div key={item.id} className="rounded-xl border border-border bg-surface">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2 p-4">
                <button
                  className="flex-1 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text">{item.name}</span>
                    {item.category && (
                      <span className="rounded bg-surface-dark px-2 py-0.5 text-xs font-medium text-text-muted">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {(item.brand || item.model) && (
                    <p className="mt-0.5 text-sm text-text-muted">
                      {[item.brand, item.model].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
                    {item.serial_number && <span>S/N: {item.serial_number}</span>}
                    {item.purchase_date && <span>Purchased: {item.purchase_date}</span>}
                    {item.purchase_price != null && <span>{fmt(item.purchase_price)}</span>}
                    {item.warranty_expiry && <span>Warranty: {item.warranty_expiry}</span>}
                    {atts.length > 0 && (
                      <span>{atts.length} file{atts.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={() => { setEditingId(item.id); setExpandedId(null); }}
                    disabled={editingId !== null}>Edit</Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}
                    disabled={editingId !== null}>Delete</Button>
                  <span className="ml-1 text-text-muted text-sm">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Edit form */}
              {isEditing && (
                <div className="border-t border-border p-4">
                  <ItemForm
                    initial={itemToForm(item)}
                    onSave={(data) => handleEdit(item, data)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              )}

              {/* Expanded: notes + attachments + warranty */}
              {isExpanded && !isEditing && (
                <div className="border-t border-border p-4 flex flex-col gap-4">
                  {item.notes && <p className="text-sm text-text">{item.notes}</p>}
                  <PhotoGrid attachments={atts} onDelete={handleDeleteAttachment} />
                  <DocList attachments={atts} onDelete={handleDeleteAttachment} />
                  <AttachmentUpload
                    entityType="item"
                    entityId={item.id}
                    onUpload={onUpdate}
                    label="Upload photos, manuals, warranties…"
                  />
                  <div className="border-t border-border pt-4">
                    <WarrantyMaintenance
                      entityType="item"
                      entityId={item.id}
                      warrantyInfo={item.warranty_info ?? null}
                      maintenanceInfo={item.maintenance_info ?? null}
                      hasAttachments={atts.length > 0}
                      onUpdate={onUpdate}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
