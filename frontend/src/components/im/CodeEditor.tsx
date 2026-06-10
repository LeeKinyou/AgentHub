'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { EditorTab } from '@/hooks/useEditorTabs';
import { TabBar } from './TabBar';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), { ssr: false });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.DiffEditor), { ssr: false });

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

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    json: 'json', md: 'markdown', html: 'html', css: 'css', scss: 'scss',
    yml: 'yaml', yaml: 'yaml', sh: 'shell', bash: 'shell', sql: 'sql',
  };
  return map[ext] ?? 'plaintext';
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
  const original = useMemo(() => (tab.diffLines ?? []).filter((l) => l.type !== 'added').map((l) => l.content).join('\n'), [tab.diffLines]);
  const modified = useMemo(() => (tab.diffLines ?? []).filter((l) => l.type !== 'removed').map((l) => l.content).join('\n'), [tab.diffLines]);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="h-8 bg-minimal-bg dark:bg-minimal-dark-bg border-b border-minimal-border dark:border-minimal-dark-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono truncate flex-1">{tab.name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-minimal-warning/10 text-minimal-warning">Diff Review</span>
      </div>
      <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 bg-white/80 dark:bg-minimal-dark-surface/80 backdrop-blur border border-minimal-border dark:border-minimal-dark-border rounded-full z-20 text-xs">
        <button onClick={onAccept} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-minimal-success/10 text-minimal-success hover:bg-minimal-success/20 transition-colors duration-200">Accept</button>
        <div className="w-px h-4 bg-minimal-border" />
        <button onClick={onReject} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-minimal-error/10 text-minimal-error hover:bg-minimal-error/20 transition-colors duration-200">Reject</button>
      </div>
      <div className="flex-1 pt-12">
        <MonacoDiffEditor
          language={getLanguage(tab.name)}
          original={original}
          modified={modified}
          theme="vs-dark"
          options={{ readOnly: true, automaticLayout: true }}
        />
      </div>
    </div>
  );
}

function EditorContent({ tab, onChange, onSave, onPinTab, isDark }: { tab: EditorTab; onChange: (c: string) => void; onSave: () => void; onPinTab: () => void; isDark: boolean }) {
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); onSave(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  const handleChange = useCallback((value: string | undefined) => {
    if (tab.isTransient) onPinTab();
    onChange(value ?? '');
  }, [tab.isTransient, onPinTab, onChange]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="h-8 bg-minimal-bg dark:bg-minimal-dark-bg border-b border-minimal-border dark:border-minimal-dark-border flex items-center px-3 gap-2 shrink-0">
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono truncate flex-1">{tab.name}</span>
        <button onClick={onSave} className={`px-2 py-0.5 text-[10px] rounded transition-colors duration-200 flex items-center gap-1 ${tab.isDirty ? 'bg-minimal-accent/10 text-minimal-accent hover:bg-minimal-accent/20' : 'bg-minimal-border dark:bg-minimal-dark-border text-minimal-tertiary dark:text-minimal-dark-tertiary'}`}>
          {tab.isDirty ? '保存' : '已保存'}
        </button>
      </div>
      <MonacoEditor
        language={getLanguage(tab.name)}
        value={tab.content}
        theme={isDark ? 'vs-dark' : 'light'}
        onChange={handleChange}
        options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13, lineNumbers: 'on', scrollBeyondLastLine: false, wordWrap: 'on' }}
      />
    </div>
  );
}

export function CodeEditor({ tabs, activeTab, activeTabId, onSwitch, onClose, onChange, onSave, onPinTab, onAcceptDiff, onRejectDiff }: CodeEditorProps) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  if (tabs.length === 0) return <EmptyState />;
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={onSwitch} onClose={onClose} onPinTab={onPinTab} />
      {activeTab ? (
        activeTab.isDiffMode ? (
          <DiffView tab={activeTab} onAccept={() => onAcceptDiff(activeTab.id)} onReject={() => onRejectDiff(activeTab.id)} />
        ) : (
          <EditorContent key={activeTab.id} tab={activeTab} onChange={(c) => onChange(activeTab.id, c)} onSave={() => onSave(activeTab)} onPinTab={() => onPinTab(activeTab.id)} isDark={isDark} />
        )
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
