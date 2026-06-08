'use client';

import type { CodeBlock } from '@agenthub/shared/types/entities';

interface ArtifactPanelProps {
  codeBlock: CodeBlock | null;
  onClose: () => void;
}

export function ArtifactPanel({ codeBlock, onClose }: ArtifactPanelProps) {
  if (!codeBlock) return null;

  const lines = codeBlock.code.split('\n');

  return (
    <aside className="w-[55%] border-l border-minimal-glass-border bg-minimal-text/95 backdrop-blur-xl flex flex-col">
      <header className="h-14 px-4 flex items-center justify-between border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-white/10 rounded text-white/50">{codeBlock.language}</span>
          <span className="text-sm font-medium text-white/90">{codeBlock.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors duration-300 text-white/50 hover:text-white/90" title="复制代码">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="px-3 py-1 text-xs bg-minimal-accent hover:bg-minimal-accent-hover text-white rounded-minimal transition-colors duration-300">
            应用更改
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition-colors duration-300 text-white/50 hover:text-white/90">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        <table className="w-full">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="pr-4 text-right text-white/30 select-none w-8">{i + 1}</td>
                <td className="text-white/90 whitespace-pre">{line}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}
