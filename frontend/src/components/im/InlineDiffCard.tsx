'use client';

interface InlineDiffCardProps {
  patchContent: string;
  fileName?: string;
  onApply: () => void;
}

const MOCK_DIFF_LINES = [
  { type: 'normal', content: 'import React from "react";' },
  { type: 'normal', content: '' },
  { type: 'removed', content: 'export function App() {' },
  { type: 'added', content: 'export function EnhancedApp() {' },
  { type: 'normal', content: '  return (' },
  { type: 'removed', content: '    <div>Hello</div>' },
  { type: 'added', content: '    <div className="app">' },
  { type: 'added', content: '      <h1>Welcome to AgentHub</h1>' },
  { type: 'added', content: '    </div>' },
  { type: 'normal', content: '  );' },
  { type: 'normal', content: '}' },
];

const LINE_STYLES: Record<string, string> = {
  added: 'bg-emerald-500/10 text-emerald-400',
  removed: 'bg-red-500/10 text-red-400',
  normal: 'text-zinc-500',
};

export function InlineDiffCard({ fileName = 'untitled.tsx', onApply }: InlineDiffCardProps) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 w-full max-w-2xl text-xs font-mono">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-zinc-600 dark:text-zinc-400 truncate">{fileName}</span>
        <button onClick={onApply} className="px-2 py-0.5 rounded-md bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30 transition-colors shrink-0">
          ✨ Apply to File
        </button>
      </div>
      <div className="p-2 max-h-[200px] overflow-y-auto">
        {MOCK_DIFF_LINES.map((line, i) => (
          <div key={i} className={`px-2 py-0.5 rounded ${LINE_STYLES[line.type] ?? LINE_STYLES.normal}`}>
            <span className="text-zinc-600 mr-2 select-none">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
