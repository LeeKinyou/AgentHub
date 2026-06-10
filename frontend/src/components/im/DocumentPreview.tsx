'use client';

import { useState } from 'react';

export type DocumentType = 'markdown' | 'json' | 'text' | 'html' | 'ppt';

interface DocumentPreviewProps {
  content: string;
  type: DocumentType;
  title?: string;
  onExpand?: () => void;
  onEdit?: () => void;
}

function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none">
      <pre className="whitespace-pre-wrap text-sm text-minimal-text">{content}</pre>
    </div>
  );
}

function JsonRenderer({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    return (
      <pre className="text-xs font-mono text-minimal-text overflow-auto">
        {formatted}
      </pre>
    );
  } catch {
    return <pre className="text-xs text-minimal-error">Invalid JSON: {content}</pre>;
  }
}

function TextRenderer({ content }: { content: string }) {
  return (
    <pre className="text-sm text-minimal-text whitespace-pre-wrap">
      {content}
    </pre>
  );
}

function HtmlRenderer({ content }: { content: string }) {
  return (
    <iframe
      srcDoc={content}
      className="w-full h-full bg-white rounded border-0"
      sandbox="allow-scripts"
      title="HTML Preview"
    />
  );
}

function PptRenderer({ content }: { content: string }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = content.split('---slide---').filter(Boolean);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 bg-minimal-glass/40 backdrop-blur-xl border-b border-minimal-glass-border">
        <button
          onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
          disabled={currentSlide === 0}
          className="px-2 py-1 text-xs bg-minimal-border rounded-minimal disabled:opacity-50 transition-colors duration-300"
        >
          上一页
        </button>
        <span className="text-xs text-minimal-secondary">{currentSlide + 1} / {slides.length}</span>
        <button
          onClick={() => setCurrentSlide((p) => Math.min(slides.length - 1, p + 1))}
          disabled={currentSlide === slides.length - 1}
          className="px-2 py-1 text-xs bg-minimal-border rounded-minimal disabled:opacity-50 transition-colors duration-300"
        >
          下一页
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white rounded-minimal p-6 min-h-[300px]">
          <pre className="whitespace-pre-wrap text-sm">{slides[currentSlide]}</pre>
        </div>
      </div>
    </div>
  );
}

const RENDERERS: Record<DocumentType, React.ComponentType<{ content: string }>> = {
  markdown: MarkdownRenderer,
  json: JsonRenderer,
  text: TextRenderer,
  html: HtmlRenderer,
  ppt: PptRenderer,
};

const TYPE_ICONS: Record<DocumentType, string> = {
  markdown: '📝',
  json: '📋',
  text: '📄',
  html: '🌐',
  ppt: '📊',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  text: 'Text',
  html: 'HTML',
  ppt: 'PPT',
};

export function DocumentPreview({ content, type, title, onExpand, onEdit }: DocumentPreviewProps) {
  const Renderer = RENDERERS[type];

  return (
    <div className="border border-minimal-border rounded-minimal overflow-hidden bg-white">
      <div className="flex items-center justify-between px-3 py-2 bg-minimal-bg border-b border-minimal-border">
        <div className="flex items-center gap-2">
          <span>{TYPE_ICONS[type]}</span>
          <span className="text-xs font-medium text-minimal-secondary">
            {title ?? TYPE_LABELS[type]}
          </span>
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
          {onExpand && (
            <button
              onClick={onExpand}
              className="px-2 py-1 text-[10px] bg-minimal-accent/10 text-minimal-accent rounded hover:bg-minimal-accent/20 transition-colors duration-300"
            >
              全屏
            </button>
          )}
        </div>
      </div>
      <div className={`${type === 'html' ? 'h-[350px]' : 'max-h-[350px] overflow-auto'} p-3`}>
        <Renderer content={content} />
      </div>
    </div>
  );
}
