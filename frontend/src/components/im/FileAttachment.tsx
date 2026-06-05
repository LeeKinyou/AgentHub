'use client';

import type { FileAttachment as FileAttachmentType } from '@agenthub/shared/types/entities';

interface FileAttachmentProps {
  attachment: FileAttachmentType;
  onDownload?: (attachment: FileAttachmentType) => void;
  onPreview?: (attachment: FileAttachmentType) => void;
}

const FILE_ICONS: Record<string, string> = {
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
  'image/gif': '🖼️',
  'image/svg+xml': '🖼️',
  'application/pdf': '📄',
  'text/plain': '📝',
  'text/markdown': '📝',
  'application/json': '📋',
  'application/zip': '📦',
  'application/javascript': '⚡',
  'text/html': '🌐',
  'text/css': '🎨',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(type: string): string {
  return FILE_ICONS[type] || '📎';
}

function isImage(type: string): boolean {
  return type.startsWith('image/');
}

export function FileAttachment({ attachment, onDownload, onPreview }: FileAttachmentProps) {
  const icon = getFileIcon(attachment.type);
  const isImageFile = isImage(attachment.type);

  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 max-w-xs">
      {isImageFile && attachment.thumbnailUrl ? (
        <button
          onClick={() => onPreview?.(attachment)}
          className="w-full aspect-video bg-zinc-100 dark:bg-zinc-900 overflow-hidden hover:opacity-90 transition-opacity"
        >
          <img
            src={attachment.thumbnailUrl}
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        </button>
      ) : null}
      <div className="flex items-center gap-3 p-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 truncate">
            {attachment.name}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {formatFileSize(attachment.size)}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {onPreview && (
            <button
              onClick={() => onPreview(attachment)}
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="预览"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          )}
          {onDownload && (
            <button
              onClick={() => onDownload(attachment)}
              className="p-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="下载"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}