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
  added: 'bg-minimal-success/10 text-minimal-success',
  removed: 'bg-minimal-error/10 text-minimal-error',
  normal: 'text-minimal-secondary',
};

export function InlineDiffCard({ fileName = 'untitled.tsx', onApply }: InlineDiffCardProps) {
  return (
    <div className="border border-minimal-glass-border rounded-minimal overflow-hidden bg-minimal-glass/60 backdrop-blur-xl w-full max-w-2xl text-xs font-mono shadow-minimal-glow">
      <div className="flex items-center justify-between px-3 py-2 bg-white/60 backdrop-blur-sm border-b border-minimal-glass-border">
        <span className="text-minimal-secondary truncate">{fileName}</span>
        <button onClick={onApply} className="px-2 py-0.5 rounded-minimal bg-minimal-accent/10 text-minimal-accent hover:bg-minimal-accent/20 transition-colors duration-300 shrink-0">
          Apply to File
        </button>
      </div>
      <div className="p-2 max-h-[200px] overflow-y-auto">
        {MOCK_DIFF_LINES.map((line, i) => (
          <div key={i} className={`px-2 py-0.5 rounded ${LINE_STYLES[line.type] ?? LINE_STYLES.normal}`}>
            <span className="text-minimal-tertiary mr-2 select-none">{line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}</span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
