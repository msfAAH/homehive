import { useState } from 'react';
import Modal from '../ui/Modal';
import type { Attachment } from '../../types';

interface AttachmentGridProps {
  attachments: Attachment[];
  onDelete: (id: number) => void;
}

export default function AttachmentGrid({ attachments, onDelete }: AttachmentGridProps) {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  if (attachments.length === 0) return null;

  const photos = attachments.filter((a) => a.file_type === 'photo');
  const documents = attachments.filter((a) => a.file_type === 'document');

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              X
            </button>
            {att.caption && (
              <p className="mt-1 text-xs text-text-muted truncate">{att.caption}</p>
            )}
          </div>
        ))}

        {documents.map((att) => (
          <div key={att.id} className="group relative">
            <a
              href={`/uploads/documents/${att.stored_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center aspect-square rounded-lg border border-border bg-surface p-3 hover:bg-surface-dark transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-text-muted mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <span className="text-xs text-text text-center truncate w-full">
                {att.file_name}
              </span>
            </a>
            <button
              onClick={() => onDelete(att.id)}
              className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label={`Delete ${att.file_name}`}
            >
              X
            </button>
          </div>
        ))}
      </div>

      {/* Full-size photo preview modal */}
      <Modal
        isOpen={previewSrc !== null}
        onClose={() => setPreviewSrc(null)}
        title="Photo Preview"
      >
        {previewSrc && (
          <img
            src={previewSrc}
            alt="Full size preview"
            className="w-full rounded-lg"
          />
        )}
      </Modal>
    </>
  );
}
