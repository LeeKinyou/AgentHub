'use client';

import type { EditorTab } from '@/hooks/useEditorTabs';

interface TabBarProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onPinTab: (id: string) => void;
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

export function TabBar({ tabs, activeTabId, onSwitch, onClose, onPinTab }: TabBarProps) {
  return (
    <div className="h-9 bg-minimal-glass/40 backdrop-blur-xl border-b border-minimal-glass-border flex items-end overflow-x-auto whitespace-nowrap scrollbar-hide w-full shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        const isTransient = tab.isTransient;
        return (
          <button
            key={tab.id}
            onClick={() => onSwitch(tab.id)}
            onDoubleClick={() => onPinTab(tab.id)}
            className={`
              group relative inline-flex items-center gap-1.5 px-3 h-full max-w-[140px]
              text-xs font-mono transition-colors duration-300 border-r border-minimal-border flex-shrink-0
              ${isActive
                ? 'bg-white text-minimal-text border-t-2 border-t-minimal-accent'
                : 'text-minimal-secondary hover:text-minimal-text hover:bg-white border-t-2 border-t-transparent'}
              ${isTransient ? 'italic text-minimal-tertiary' : ''}
            `}
          >
            <span className="text-[11px] shrink-0">{getFileIcon(tab.name)}</span>
            <span className="truncate">{tab.name}</span>
            {tab.isDirty ? (
              <span className="w-2 h-2 rounded-full bg-minimal-warning shrink-0 ml-1" />
            ) : (
              <span
                onClick={(e) => { e.stopPropagation(); onClose(tab.id); }}
                className={`shrink-0 ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-minimal-border text-minimal-tertiary hover:text-minimal-text transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
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
