import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const scrollEl = document.getElementById('main-scroll');
    if (!scrollEl) return;
    if (isOpen) {
      scrollEl.style.overflow = 'hidden';
    } else {
      scrollEl.style.overflow = '';
    }
    return () => {
      scrollEl.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-navy/60 transition-opacity"
        onClick={onClose}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg rounded-[12px] bg-warm-white shadow-xl transition-all overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 2rem)', padding: '1.5rem', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="font-display text-lg font-bold text-navy">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate hover:bg-surface-dark transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
