import { useState } from 'react';
import Button from '../ui/Button';
import { apiPost, apiPut, apiDelete } from '../../api/client';
import type { LineItem } from '../../types';

const fmt = (n: number | string) =>
  '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface CostTableProps {
  projectId: number;
  lineItems: LineItem[];
  estimatedCost: number;
  onUpdate: () => void;
}

interface EditRow {
  description: string;
  quantity: string;
  unit_cost: string;
  vendor: string;
  notes: string;
}

const emptyRow: EditRow = {
  description: '',
  quantity: '1',
  unit_cost: '0',
  vendor: '',
  notes: '',
};

export default function CostTable({ projectId, lineItems, estimatedCost, onUpdate }: CostTableProps) {
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [editData, setEditData] = useState<EditRow>(emptyRow);
  const [saving, setSaving] = useState(false);

  const actualTotal = lineItems.reduce((sum, li) => sum + Number(li.total_cost), 0);

  const startEdit = (item: LineItem) => {
    setEditingId(item.id);
    setEditData({
      description: item.description,
      quantity: String(item.quantity),
      unit_cost: String(item.unit_cost),
      vendor: item.vendor ?? '',
      notes: item.notes ?? '',
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
    if (!editData.description.trim()) return;
    setSaving(true);
    try {
      const body = {
        description: editData.description.trim(),
        quantity: Number(editData.quantity) || 1,
        unit_cost: Number(editData.unit_cost) || 0,
        vendor: editData.vendor.trim() || null,
        notes: editData.notes.trim() || null,
      };

      if (editingId === 'new') {
        await apiPost(`/line-items/project/${projectId}`, body);
      } else {
        await apiPut(`/line-items/${editingId}`, body);
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

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this line item?')) return;
    try {
      await apiDelete(`/line-items/${id}`);
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const renderEditCells = () => (
    <>
      <td className="px-3 py-2">
        <input
          className="w-full rounded border border-border px-2 py-1 text-sm"
          value={editData.description}
          onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          placeholder="Description"
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-20 rounded border border-border px-2 py-1 text-sm text-right"
          type="number"
          value={editData.quantity}
          onChange={(e) => setEditData({ ...editData, quantity: e.target.value })}
        />
      </td>
      <td className="px-3 py-2">
        <input
          className="w-24 rounded border border-border px-2 py-1 text-sm text-right"
          type="number"
          step="0.01"
          value={editData.unit_cost}
          onChange={(e) => setEditData({ ...editData, unit_cost: e.target.value })}
        />
      </td>
      <td className="px-3 py-2 text-right text-sm">
        {fmt((Number(editData.quantity) || 0) * (Number(editData.unit_cost) || 0))}
      </td>
      <td className="px-3 py-2">
        <input
          className="w-full rounded border border-border px-2 py-1 text-sm"
          value={editData.vendor}
          onChange={(e) => setEditData({ ...editData, vendor: e.target.value })}
          placeholder="Vendor"
        />
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" onClick={save} disabled={saving || !editData.description.trim()}>
            {saving ? '...' : 'Save'}
          </Button>
          <Button size="sm" variant="secondary" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </td>
    </>
  );

  return (
    <div>
      <div className="mb-3 text-sm text-text-muted">
        Estimated Cost: <span className="font-medium text-text">{fmt(estimatedCost)}</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-dark">
            <tr>
              <th className="px-3 py-2 font-medium text-text-muted">Description</th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">Qty</th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">Unit Cost</th>
              <th className="px-3 py-2 font-medium text-text-muted text-right">Total</th>
              <th className="px-3 py-2 font-medium text-text-muted">Vendor</th>
              <th className="px-3 py-2 font-medium text-text-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id} className="border-t border-border">
                {editingId === item.id ? (
                  renderEditCells()
                ) : (
                  <>
                    <td className="px-3 py-2 text-text">{item.description}</td>
                    <td className="px-3 py-2 text-right text-text">{item.quantity}</td>
                    <td className="px-3 py-2 text-right text-text">{fmt(item.unit_cost)}</td>
                    <td className="px-3 py-2 text-right text-text">{fmt(item.total_cost)}</td>
                    <td className="px-3 py-2 text-text">{item.vendor ?? '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEdit(item)}
                          disabled={editingId !== null}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleDelete(item.id)}
                          disabled={editingId !== null}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}

            {editingId === 'new' && (
              <tr className="border-t border-border">{renderEditCells()}</tr>
            )}

            {/* Footer: Actual Total */}
            <tr className="border-t-2 border-border bg-surface-dark font-medium">
              <td className="px-3 py-2 text-text" colSpan={3}>
                Actual Total
              </td>
              <td className="px-3 py-2 text-right text-text">{fmt(actualTotal)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>

      {editingId === null && (
        <div className="mt-3">
          <Button size="sm" variant="secondary" onClick={startAdd}>
            Add Item
          </Button>
        </div>
      )}
    </div>
  );
}
