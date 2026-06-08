'use client';

interface CodeViewerProps {
  fileName: string | null;
  fileContent: string;
  onClose: () => void;
}

export function CodeViewer({ fileName, fileContent, onClose }: CodeViewerProps) {
  if (!fileName) {
    return (
      <div className="flex-1 flex items-center justify-center text-minimal-tertiary text-sm">
        点击左侧文件查看内容
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-9 bg-minimal-bg border-b border-minimal-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-xs text-minimal-secondary font-mono truncate">{fileName}</span>
        <button onClick={onClose} className="ml-auto p-1 hover:bg-minimal-border rounded-minimal text-minimal-tertiary hover:text-minimal-text transition-colors duration-300">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <pre className="flex-1 p-4 font-mono text-sm overflow-auto text-white/80 bg-minimal-text select-text whitespace-pre-wrap break-words">
        <code>{fileContent}</code>
      </pre>
    </div>
  );
}
