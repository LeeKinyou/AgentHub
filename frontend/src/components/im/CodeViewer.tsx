'use client';

interface CodeViewerProps {
  fileName: string | null;
  fileContent: string;
  onClose: () => void;
}

export function CodeViewer({ fileName, fileContent, onClose }: CodeViewerProps) {
  if (!fileName) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
        点击左侧文件查看内容
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-9 bg-zinc-900 border-b border-zinc-800 flex items-center px-3 gap-2 shrink-0">
        <span className="text-xs text-zinc-400 font-mono truncate">{fileName}</span>
        <button onClick={onClose} className="ml-auto p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors duration-150">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <pre className="flex-1 p-4 font-mono text-sm overflow-auto text-zinc-300 bg-zinc-950/50 select-text whitespace-pre-wrap break-words">
        <code>{fileContent}</code>
      </pre>
    </div>
  );
}
