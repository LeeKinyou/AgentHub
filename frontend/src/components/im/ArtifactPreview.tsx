'use client';

import { useState } from 'react';

interface ArtifactPreviewProps {
  htmlCode: string;
}

export function ArtifactPreview({ htmlCode }: ArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');

  return (
    <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('code')}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors duration-150 ${
            activeTab === 'code'
              ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          📄 Code
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-2.5 py-1 text-xs rounded-md transition-colors duration-150 ${
            activeTab === 'preview'
              ? 'bg-white dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          👁️ Preview
        </button>
      </div>
      {activeTab === 'code' ? (
        <div className="max-h-[350px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
          <pre className="p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre leading-relaxed">
            {htmlCode}
          </pre>
        </div>
      ) : (
        <div className="p-3 bg-zinc-50 dark:bg-zinc-950">
          <iframe
            srcDoc={htmlCode}
            className="w-full h-[350px] bg-white rounded-lg border border-zinc-200 dark:border-zinc-800"
            sandbox="allow-scripts"
            title="Artifact Preview"
          />
        </div>
      )}
    </div>
  );
}