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
      <div className="mt-2 rounded-minimal border border-minimal-glass-border overflow-hidden bg-white/80 backdrop-blur-sm shadow-minimal-glow">
        <div className="flex items-center justify-between px-3 py-1.5 bg-minimal-glass/40 backdrop-blur-xl border-b border-minimal-glass-border">
          <div className="flex items-center gap-1">
            {isHtml && (
              <>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`px-2.5 py-1 text-xs rounded-minimal transition-colors duration-300 ${
                    activeTab === 'code'
                      ? 'bg-white text-minimal-text shadow-apple'
                      : 'text-minimal-secondary hover:text-minimal-text'
                  }`}
                >
                  Code
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 text-xs rounded-minimal transition-colors duration-300 ${
                    activeTab === 'preview'
                      ? 'bg-white text-minimal-text shadow-apple'
                      : 'text-minimal-secondary hover:text-minimal-text'
                  }`}
                >
                  Preview
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-2 py-1 text-[10px] bg-minimal-border text-minimal-secondary rounded hover:bg-minimal-border transition-colors duration-300"
              >
                编辑
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-2 py-1 text-[10px] bg-minimal-accent/10 text-minimal-accent rounded hover:bg-minimal-accent/20 transition-colors duration-300"
            >
              全屏
            </button>
          </div>
        </div>
        {isHtml ? (
          activeTab === 'code' ? (
            <div className="max-h-[350px] overflow-auto scrollbar-thin scrollbar-thumb-zinc-300">
              <pre className="p-4 text-xs font-mono text-minimal-text whitespace-pre leading-relaxed">
                {displayContent}
              </pre>
            </div>
          ) : (
            <div className="p-3 bg-minimal-bg">
              <iframe
                srcDoc={displayContent}
                className="w-full h-[350px] bg-white rounded-minimal border border-minimal-border"
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
