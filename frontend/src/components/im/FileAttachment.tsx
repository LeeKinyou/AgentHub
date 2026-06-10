'use client';

interface FileAttachmentProps {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  onDownload?: () => void;
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

function getFileIcon(mimeType: string): string {
  return FILE_ICONS[mimeType] || '📎';
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function FileAttachment({ url, filename, size, mimeType, onDownload }: FileAttachmentProps) {
  const icon = getFileIcon(mimeType);
  const isImageFile = isImage(mimeType);

  return (
    <div className="border border-minimal-border dark:border-minimal-dark-border rounded-minimal overflow-hidden bg-white dark:bg-minimal-dark-surface max-w-xs">
      {isImageFile && (
        <div className="w-full aspect-video bg-minimal-bg dark:bg-minimal-dark-bg overflow-hidden">
          <img
            src={url}
            alt={filename}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex items-center gap-3 p-3">
        <span className="text-2xl shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text truncate">
            {filename}
          </p>
          <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">
            {formatFileSize(size)}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <a
            href={url}
            download={filename}
            onClick={onDownload}
            className="p-1.5 rounded hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-200"
            title="下载"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
