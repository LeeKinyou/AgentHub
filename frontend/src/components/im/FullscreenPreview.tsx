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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-[90vw] h-[90vh] bg-white dark:bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
              {title ?? '预览'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                ✏️ 编辑
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
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