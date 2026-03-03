import { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import Button from '../ui/Button';

interface CoverPhotoEditorProps {
  currentPhoto: string | null;
  onCropReady: (blob: Blob) => void;
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve) => { image.onload = () => resolve(); });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas empty'))), 'image/jpeg', 0.9)
  );
}

export default function CoverPhotoEditor({ currentPhoto, onCropReady }: CoverPhotoEditorProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setPreview(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApply = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    const previewUrl = URL.createObjectURL(blob);
    setPreview(previewUrl);
    setImageSrc(null);
    onCropReady(blob);
  };

  const handleCancel = () => {
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const displayPhoto = preview ?? (currentPhoto ? `/uploads/photos/${currentPhoto}` : null);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-text-muted">Cover Photo</label>

      {/* Crop editor */}
      {imageSrc ? (
        <div className="flex flex-col gap-3">
          <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ height: 280 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Zoom"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={handleApply}>Apply</Button>
            <Button type="button" variant="secondary" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {/* Square preview */}
          <div className="relative shrink-0 h-24 w-24 rounded-xl overflow-hidden border border-border bg-surface-dark">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Cover" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              {displayPhoto ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <p className="mt-1 text-xs text-text-muted">Square crop · drag to reposition</p>
          </div>
        </div>
      )}
    </div>
  );
}
