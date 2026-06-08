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
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-minimal-secondary dark:text-minimal-dark-secondary">
      <div className="w-16 h-16 rounded-minimal bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border flex items-center justify-center">
        <svg className="w-8 h-8 text-minimal-border dark:text-minimal-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-minimal-text dark:text-minimal-dark-text">尚未打开任何文件</p>
        <p className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary">在左侧文件树中点击文件开始编辑</p>
      </div>
    </div>
  );
}

function DiffView({ tab, onAccept, onReject }: { tab: EditorTab; onAccept: () => void; onReject: () => void }) {
  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="h-8 bg-minimal-bg dark:bg-minimal-dark-bg border-b border-minimal-border dark:border-minimal-dark-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono truncate flex-1">{tab.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-minimal-warning/10 text-minimal-warning">Diff Review</span>
      </div>
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-minimal-dark-surface/80 backdrop-blur border border-minimal-border dark:border-minimal-dark-border rounded-full shadow-apple z-20 text-xs">
        <button onClick={onAccept} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-minimal-success/10 text-minimal-success hover:bg-minimal-success/20 transition-colors duration-300">
          <span>✅</span><span>Accept</span>
        </button>
        <div className="w-px h-4 bg-minimal-border" />
        <button onClick={onReject} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-minimal-error/10 text-minimal-error hover:bg-minimal-error/20 transition-colors duration-300">
          <span>❌</span><span>Reject</span>
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 pt-16 font-mono text-sm">
        {(tab.diffLines ?? []).map((line, i) => (
          <div key={i} className={`flex ${line.type === 'removed' ? 'bg-minimal-error/5' : line.type === 'added' ? 'bg-minimal-success/5' : ''}`}>
            <span className={`w-8 text-right pr-2 shrink-0 select-none ${line.type === 'removed' ? 'text-minimal-error' : line.type === 'added' ? 'text-minimal-success' : 'text-minimal-secondary dark:text-minimal-dark-secondary'}`}>
              {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
            </span>
            <span className={`whitespace-pre ${line.type === 'removed' ? 'text-minimal-error' : line.type === 'added' ? 'text-minimal-success' : 'text-minimal-text dark:text-minimal-dark-text'}`}>
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
      <div className="h-8 bg-minimal-bg dark:bg-minimal-dark-bg border-b border-minimal-border dark:border-minimal-dark-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono truncate flex-1">{tab.name}</span>
        {isMarkdown && (
          <button onClick={() => setIsPreview((p) => !p)} className={`px-2 py-0.5 text-[10px] rounded transition-colors duration-300 flex items-center gap-1 ${isPreview ? 'bg-minimal-accent/10 text-minimal-accent' : 'bg-minimal-border dark:bg-minimal-dark-border text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text'}`}>
            <span>👁️</span><span>{isPreview ? 'Edit' : 'Preview'}</span>
          </button>
        )}
        <button onClick={onSave} className={`px-2 py-0.5 text-[10px] rounded transition-colors duration-300 flex items-center gap-1 ${tab.isDirty ? 'bg-minimal-accent/10 text-minimal-accent hover:bg-minimal-accent/20' : 'bg-minimal-border dark:bg-minimal-dark-border text-minimal-tertiary dark:text-minimal-dark-tertiary hover:bg-minimal-border dark:hover:bg-minimal-dark-border'}`}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          {tab.isDirty ? '保存' : '已保存'}
        </button>
      </div>
      {isMarkdown && isPreview ? (
        <div className="prose max-w-none p-6 overflow-y-auto h-full bg-white dark:bg-minimal-dark-surface text-sm leading-relaxed">
          <ReactMarkdown
            components={{
              pre({ children, ...props }) {
                const codeChild = children as any;
                if (codeChild?.props?.className?.includes('language-mermaid')) {
                  const codeValue = String(codeChild.props.children || '').replace(/\n$/, '');
                  return (
                    <div className="my-4 border border-minimal-border dark:border-minimal-dark-border rounded-minimal overflow-hidden bg-minimal-bg dark:bg-minimal-dark-bg p-4 font-mono text-xs">
                      <div className="flex items-center justify-between text-minimal-tertiary dark:text-minimal-dark-tertiary mb-2 border-b border-minimal-border dark:border-minimal-dark-border pb-2">
                        <span>📊 Mermaid Diagram</span>
                        <span className="text-[10px] bg-minimal-border dark:bg-minimal-dark-border px-1.5 py-0.5 rounded text-minimal-secondary dark:text-minimal-dark-secondary">Preview Mode</span>
                      </div>
                      <pre className="overflow-x-auto text-minimal-secondary dark:text-minimal-dark-secondary">{codeValue}</pre>
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
        <textarea value={tab.content} onChange={(e) => handleChange(e.target.value)} className="flex-1 font-mono select-text bg-white dark:bg-minimal-dark-surface text-minimal-text dark:text-minimal-dark-text w-full h-full p-4 resize-none focus:outline-none whitespace-pre overflow-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600" spellCheck={false} />
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
