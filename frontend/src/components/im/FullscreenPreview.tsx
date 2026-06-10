'use client';

import { useEffect } from 'react';
import type { DocumentType } from './DocumentPreview';
import { DocumentPreview } from './DocumentPreview';

interface FullscreenPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  type: DocumentType;
  title?: string;
  onEdit?: () => void;
  children?: React.ReactNode;
}

export function FullscreenPreview({ isOpen, onClose, content, type, title, onEdit, children }: FullscreenPreviewProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative w-[90vw] h-[90vh] bg-minimal-glass/80 backdrop-blur-xl rounded-minimal overflow-hidden shadow-minimal-glass flex flex-col shadow-minimal-glow">
        <header className="flex items-center justify-between px-6 py-4 border-b border-minimal-glass-border bg-minimal-glass/40 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-minimal-text">
              {title ?? '预览'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm bg-minimal-border text-minimal-text rounded-minimal hover:bg-minimal-border transition-colors duration-300"
              >
                编辑
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-minimal hover:bg-minimal-border text-minimal-secondary hover:text-minimal-text transition-colors duration-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          {children ?? (
            <div className="h-full overflow-auto p-6">
              <DocumentPreview content={content} type={type} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
