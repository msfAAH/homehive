import { useState, useRef, type ChangeEvent } from 'react';
import { apiUpload } from '../../api/client';
import type { Attachment } from '../../types';

interface AttachmentUploadProps {
  entityType: 'home' | 'room' | 'project' | 'item';
  entityId: number;
  onUpload: () => void;
  photoCategory?: 'before' | 'after';
  label?: string;
}

export default function AttachmentUpload({ entityType, entityId, onUpload, photoCategory, label }: AttachmentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isImage = file.type.startsWith('image/');
        const fileType = isImage ? 'photo' : 'document';

        const formData = new FormData();
        formData.append('files', file);
        formData.append('fileType', fileType);

        if (entityType === 'home') formData.append('homeId', String(entityId));
        if (entityType === 'room') formData.append('roomId', String(entityId));
        if (entityType === 'project') formData.append('projectId', String(entityId));
        if (entityType === 'item') formData.append('itemId', String(entityId));
        if (photoCategory) formData.append('photoCategory', photoCategory);

        await apiUpload<Attachment>('/attachments', formData);
      }
      onUpload();
    } catch (err: any) {
      // Try to extract a clean message from the error
      let msg: string = err?.message ?? 'Upload failed';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.error) msg = parsed.error;
      } catch {
        // If it's not JSON (e.g. HTML error page), show a generic message
        if (msg.startsWith('<') || msg.length > 200) {
          msg = 'Upload failed. Check file type and size (max 10 MB).';
        }
      }
      setError(msg);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary hover:bg-surface transition-colors"
        onClick={() => { setError(null); inputRef.current?.click(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setError(null);
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
          onChange={handleFiles}
          className="hidden"
        />
        {uploading ? (
          <p className="text-sm text-text-muted">Uploading...</p>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-text-muted mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm text-text-muted">{label ?? 'Click or drag to upload'}</p>
            <p className="mt-1 text-xs text-text-muted">Images, PDF, DOC, TXT — max 10 MB</p>
          </>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 rounded-lg border border-red-200 bg-red-50 px-3 py-2">{error}</p>
      )}
    </div>
  );
}
