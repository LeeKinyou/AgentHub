'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { EditorTab } from '@/hooks/useEditorTabs';
import { TabBar } from './TabBar';

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTab: EditorTab | null;
  activeTabId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onChange: (id: string, content: string) => void;
  onSave: (tab: EditorTab) => void;
  onPinTab: (tabId: string) => void;
  onAcceptDiff: (tabId: string) => void;
  onRejectDiff: (tabId: string) => void;
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 dark:text-zinc-600">
      <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
        <svg className="w-8 h-8 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">尚未打开任何文件</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">在左侧文件树中点击文件开始编辑</p>
      </div>
    </div>
  );
}

function DiffView({ tab, onAccept, onReject }: { tab: EditorTab; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="h-8 bg-zinc-100 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-zinc-500 font-mono truncate flex-1">{tab.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Diff Review</span>
      </div>
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur border border-zinc-200 dark:border-zinc-800 rounded-full shadow-lg z-20 text-xs">
        <button onClick={onAccept} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30 transition-colors">
          <span>✅</span><span>Accept</span>
        </button>
        <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
        <button onClick={onReject} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/30 transition-colors">
          <span>❌</span><span>Reject</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 pt-16 font-mono text-sm">
        {(tab.diffLines ?? []).map((line, i) => (
          <div key={i} className={`flex ${line.type === 'removed' ? 'bg-red-500/10 dark:bg-red-950/30' : line.type === 'added' ? 'bg-emerald-500/10 dark:bg-emerald-950/30' : ''}`}>
            <span className={`w-8 text-right pr-2 shrink-0 select-none ${line.type === 'removed' ? 'text-red-400' : line.type === 'added' ? 'text-emerald-400' : 'text-zinc-500'}`}>
              {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
            </span>
            <span className={`whitespace-pre ${line.type === 'removed' ? 'text-red-600 dark:text-red-400' : line.type === 'added' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {line.content}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditorContent({ tab, onChange, onSave, onPinTab }: { tab: EditorTab; onChange: (c: string) => void; onSave: () => void; onPinTab: () => void }) {
  const isMarkdown = tab.name.endsWith('.md');
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const handleChange = (value: string) => {
    if (tab.isTransient) onPinTab();
    onChange(value);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-8 bg-zinc-100 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-zinc-500 font-mono truncate flex-1">{tab.name}</span>
        {isMarkdown && (
          <button onClick={() => setIsPreview((p) => !p)} className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${isPreview ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}>
            <span>👁️</span><span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
        )}
        <button onClick={onSave} className={`px-2 py-0.5 text-[10px] rounded transition-colors flex items-center gap-1 ${tab.isDirty ? 'bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-600/30' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          {tab.isDirty ? '保存' : '已保存'}
        </button>
      </div>
      {isMarkdown && isPreview ? (
        <div className="prose dark:prose-invert max-w-none p-6 overflow-y-auto h-full bg-white dark:bg-zinc-950 text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              pre({ children, ...props }) {
                const codeChild = children as any;
                if (codeChild?.props?.className?.includes('language-mermaid')) {
                  const codeValue = String(codeChild.props.children || '').replace(/\n$/, '');
                  return (
                    <div className="my-4 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900 p-4 font-mono text-xs">
                      <div className="flex items-center justify-between text-zinc-400 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                        <span>📊 Mermaid Diagram</span>
                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">Preview Mode</span>
                      </div>
                      <pre className="overflow-x-auto text-zinc-600 dark:text-zinc-400">{codeValue}</pre>
                    </div>
                  );
                }
                return <pre {...props}>{children}</pre>;
              },
            }}
          >
            {tab.content}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea value={tab.content} onChange={(e) => handleChange(e.target.value)} className="flex-1 font-mono select-text bg-zinc-50 dark:bg-zinc-950/20 text-zinc-800 dark:text-zinc-300 w-full h-full p-4 resize-none focus:outline-none whitespace-pre overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700" spellCheck={false} />
      )}
    </div>
  );
}

export function CodeEditor({ tabs, activeTab, activeTabId, onSwitch, onClose, onChange, onSave, onPinTab, onAcceptDiff, onRejectDiff }: CodeEditorProps) {
  if (tabs.length === 0) return <EmptyState />;
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={onSwitch} onClose={onClose} onPinTab={onPinTab} />
      {activeTab ? (
        activeTab.isDiffMode ? (
          <DiffView tab={activeTab} onAccept={() => onAcceptDiff(activeTab.id)} onReject={() => onRejectDiff(activeTab.id)} />
        ) : (
          <EditorContent key={activeTab.id} tab={activeTab} onChange={(c) => onChange(activeTab.id, c)} onSave={() => onSave(activeTab)} onPinTab={() => onPinTab(activeTab.id)} />
        )
      ) : (
        <EmptyState />
      )}
    </div>
  );
}