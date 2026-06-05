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
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">{content}</pre>
    </div>
  );
}

function JsonRenderer({ content }: { content: string }) {
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    return (
      <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-auto">
        {formatted}
      </pre>
    );
  } catch {
    return <pre className="text-xs text-red-400">Invalid JSON: {content}</pre>;
  }
}

function TextRenderer({ content }: { content: string }) {
  return (
    <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
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
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
          disabled={currentSlide === 0}
          className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 rounded disabled:opacity-50"
        >
          ← 上一页
        </button>
        <span className="text-xs text-zinc-500">{currentSlide + 1} / {slides.length}</span>
        <button
          onClick={() => setCurrentSlide((p) => Math.min(slides.length - 1, p + 1))}
          disabled={currentSlide === slides.length - 1}
          className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 rounded disabled:opacity-50"
        >
          下一页 →
        </button>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 min-h-[300px]">
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
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span>{TYPE_ICONS[type]}</span>
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {title ?? TYPE_LABELS[type]}
          </span>
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
          {onExpand && (
            <button
              onClick={onExpand}
              className="px-2 py-1 text-[10px] bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30 transition-colors"
            >
              ⛶ 全屏
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