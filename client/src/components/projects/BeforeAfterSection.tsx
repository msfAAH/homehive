import { useState } from 'react';
import Modal from '../ui/Modal';
import AttachmentUpload from '../attachments/AttachmentUpload';
import type { Attachment } from '../../types';

interface BeforeAfterSectionProps {
  projectId: number;
  attachments: Attachment[];
  onUpdate: () => void;
  onDelete: (id: number) => void;
}

function PhotoColumn({
  label,
  photos,
  projectId,
  category,
  onDelete,
  onUpdate,
}: {
  label: string;
  photos: Attachment[];
  projectId: number;
  category: 'before' | 'after';
  onDelete: (id: number) => void;
  onUpdate: () => void;
}) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{label}</h3>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photos.map((att) => (
            <div key={att.id} className="group relative">
              <img
                src={`/uploads/photos/${att.stored_name}`}
                alt={att.caption || att.file_name}
                className="aspect-square w-full rounded-lg object-cover cursor-pointer"
                onClick={() => setPreviewSrc(`/uploads/photos/${att.stored_name}`)}
              />
              <button
                onClick={() => onDelete(att.id)}
                className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`Delete ${att.file_name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <AttachmentUpload
        entityType="project"
        entityId={projectId}
        photoCategory={category}
        label={`Upload ${label} photos`}
        onUpload={onUpdate}
      />

      <Modal isOpen={previewSrc !== null} onClose={() => setPreviewSrc(null)} title={`${label} Photo`}>
        {previewSrc && <img src={previewSrc} alt="Full size preview" className="w-full rounded-lg" />}
      </Modal>
    </div>
  );
}

export default function BeforeAfterSection({ projectId, attachments, onUpdate, onDelete }: BeforeAfterSectionProps) {
  const before = attachments.filter((a) => a.photo_category === 'before');
  const after = attachments.filter((a) => a.photo_category === 'after');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <PhotoColumn
        label="Before"
        photos={before}
        projectId={projectId}
        category="before"
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
      <PhotoColumn
        label="After"
        photos={after}
        projectId={projectId}
        category="after"
        onDelete={onDelete}
        onUpdate={onUpdate}
      />
    </div>
  );
}
