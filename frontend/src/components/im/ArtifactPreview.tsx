'use client';

import { useState } from 'react';
import type { DocumentType } from './DocumentPreview';
import { DocumentPreview } from './DocumentPreview';
import { FullscreenPreview } from './FullscreenPreview';

interface ArtifactPreviewProps {
  htmlCode?: string;
  content?: string;
  type?: DocumentType | 'html';
  title?: string;
  onEdit?: () => void;
}

export function ArtifactPreview({ htmlCode, content, type = 'html', title, onEdit }: ArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const displayContent = content ?? htmlCode ?? '';
  const isHtml = type === 'html';

  return (
    <>
      <div className="mt-2 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-1">
            {isHtml && (
              <>
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
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-2 py-1 text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                ✏️ 编辑
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-2 py-1 text-[10px] bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30 transition-colors"
            >
              ⛶ 全屏
            </button>
          </div>
        </div>
        {isHtml ? (
          activeTab === 'code' ? (
            <div className="max-h-[350px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
              <pre className="p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre leading-relaxed">
                {displayContent}
              </pre>
            </div>
          ) : (
            <div className="p-3 bg-zinc-50 dark:bg-zinc-950">
              <iframe
                srcDoc={displayContent}
                className="w-full h-[350px] bg-white rounded-lg border border-zinc-200 dark:border-zinc-800"
                sandbox="allow-scripts"
                title="Artifact Preview"
              />
            </div>
          )
        ) : (
          <div className="max-h-[350px] overflow-auto">
            <DocumentPreview content={displayContent} type={type as DocumentType} title={title} />
          </div>
        )}
      </div>

      <FullscreenPreview
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        content={displayContent}
        type={isHtml ? 'html' : (type as DocumentType)}
        title={title}
        onEdit={onEdit}
      />
    </>
  );
}