'use client';

import type { Session } from '@agenthub/shared/types/entities';
import { AvatarStack } from './AvatarStack';

interface SessionSidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onPlusClick: () => void;
  onDelete: (sessionId: string) => void;
}

export function SessionSidebar({ sessions, activeId, onSelect, onPlusClick, onDelete }: SessionSidebarProps) {
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">我的会话</span>
        <button
          onClick={onPlusClick}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-100 transition-colors duration-150"
          title="创建群组"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
        {sessions.map((session) => (
          <div key={session.id} className="group relative">
            <button
              onClick={() => onSelect(session.id)}
              className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-150 border-l-2 ${
                session.id === activeId
                  ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-indigo-500'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300 border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                {session.type === 'group' && session.agentIds.length > 0 && (
                  <AvatarStack agentIds={session.agentIds} />
                )}
                <span className="truncate text-sm">{session.title}</span>
                {session.type === 'group' && (
                  <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded">
                    群组
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all duration-150"
              title="删除会话"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}
      </nav>
    </div>
  );
}