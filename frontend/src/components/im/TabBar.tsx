'use client';

import type { EditorTab } from '@/hooks/useEditorTabs';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return '📘';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.json')) return '📋';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.js')) return '📒';
  return '📄';
}

export function TabBar({ tabs, activeTabId, onSwitch, onClose }: TabBarProps) {
  return (
    <div className="h-9 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-end overflow-x-auto whitespace-nowrap scrollbar-hide w-full shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            className={`
              group relative inline-flex items-center gap-1.5 px-3 h-full max-w-[140px]
              text-xs font-mono transition-colors duration-150 border-r border-zinc-200 dark:border-zinc-800/50 flex-shrink-0
              ${isActive
                ? 'bg-white dark:bg-zinc-950/40 text-zinc-800 dark:text-zinc-200 border-t-2 border-t-indigo-500'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/40 border-t-2 border-t-transparent'}
            `}
          >
            <span className="text-[11px] shrink-0">{getFileIcon(tab.name)}</span>
            <span className="truncate">{tab.name}</span>
            {tab.isDirty ? (
              <span className="w-2 h-2 rounded-full bg-amber-400 dark:bg-zinc-500 shrink-0 ml-1" />
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                className={`shrink-0 ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}