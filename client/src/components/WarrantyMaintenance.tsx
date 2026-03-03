import { useState } from 'react';
import { apiPost, apiDelete } from '../api/client';
import Button from './ui/Button';

interface WarrantyMaintenanceProps {
  entityType: 'item' | 'project';
  entityId: number;
  warrantyInfo: string | null;
  maintenanceInfo: string | null;
  hasAttachments: boolean;
  onUpdate: () => void;
}

export default function WarrantyMaintenance({
  entityType,
  entityId,
  warrantyInfo,
  maintenanceInfo,
  hasAttachments,
  onUpdate,
}: WarrantyMaintenanceProps) {
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasInfo = !!(warrantyInfo || maintenanceInfo);

  const handleExtract = async () => {
    setExtracting(true);
    setError(null);
    try {
      await apiPost(`/extract/${entityType}/${entityId}`, {});
      onUpdate();
    } catch (err: any) {
      setError(err.message ?? 'Extraction failed');
    } finally {
      setExtracting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear the extracted warranty and maintenance info?')) return;
    try {
      await apiDelete(`/extract/${entityType}/${entityId}`);
      onUpdate();
    } catch (err: any) {
      setError(err.message ?? 'Clear failed');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">Warranties &amp; Maintenance</h2>
        <div className="flex gap-2">
          {hasInfo && (
            <Button size="sm" variant="secondary" onClick={handleClear}>
              Clear
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleExtract}
            disabled={extracting || !hasAttachments}
            title={!hasAttachments ? 'Upload attachments first' : undefined}
          >
            {extracting ? 'Extracting…' : hasInfo ? 'Re-extract' : 'Extract from Attachments'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasAttachments && !hasInfo && (
        <p className="text-sm text-text-muted">
          Upload manuals, warranties, or contracts as attachments, then click "Extract from Attachments" to
          automatically pull out warranty and maintenance information.
        </p>
      )}

      {hasAttachments && !hasInfo && !extracting && (
        <p className="text-sm text-text-muted">
          Click "Extract from Attachments" to have AI read your uploaded files and summarize warranty coverage and
          maintenance schedules.
        </p>
      )}

      {extracting && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-text-muted">Reading attachments and extracting information…</p>
          <p className="mt-1 text-xs text-text-muted">This might take a minute if you have long attachments.</p>
        </div>
      )}

      {hasInfo && !extracting && (
        <div className="flex flex-col gap-4">
          {warrantyInfo && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-text">Warranty Coverage</h3>
              <p className="whitespace-pre-wrap text-sm text-text">{warrantyInfo}</p>
            </div>
          )}
          {maintenanceInfo && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <h3 className="mb-2 text-sm font-semibold text-text">Maintenance Schedule</h3>
              <p className="whitespace-pre-wrap text-sm text-text">{maintenanceInfo}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
