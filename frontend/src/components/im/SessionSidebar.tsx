'use client';

import { useState } from 'react';
import type { Session } from '@agenthub/shared/types/entities';
import { AvatarStack } from './AvatarStack';

interface SessionSidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onPlusClick: () => void;
  onOpenGroupModal: () => void;
  onDelete: (sessionId: string) => void;
}

function SessionItem({ session, activeId, onSelect, onDelete }: { session: Session; activeId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="group relative">
      <button onClick={() => onSelect(session.id)}
        className={`w-full text-left px-3 py-2 rounded-md transition-colors duration-150 border-l-2 ${session.id === activeId ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-indigo-500' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-700 dark:hover:text-zinc-300 border-transparent'}`}>
        <div className="flex items-center gap-2">
          {session.type === 'group' && session.agentIds.length > 0 && <AvatarStack agentIds={session.agentIds} />}
          <span className="truncate text-sm">{session.title}</span>
        </div>
      </button>
      <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-all duration-150" title="删除会话">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
      </button>
    </div>
  );
}

function SectionHeader({ label, expanded, onToggle, onAdd, addTitle }: { label: string; expanded: boolean; onToggle: () => void; onAdd?: () => void; addTitle?: string }) {
  return (
    <div className="px-3 py-1.5 flex items-center justify-between">
      <button onClick={onToggle} className="flex items-center gap-1 min-w-0">
        <svg className={`w-3 h-3 text-zinc-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-wider truncate">{label}</span>
      </button>
      {onAdd && (
        <button onClick={onAdd} className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors shrink-0" title={addTitle}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}
    </div>
  );
}

export function SessionSidebar({ sessions, activeId, onSelect, onPlusClick, onOpenGroupModal, onDelete }: SessionSidebarProps) {
  const [isDirectExpanded, setIsDirectExpanded] = useState(true);
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true);
  const directSessions = sessions.filter((s) => s.type !== 'group');
  const groupSessions = sessions.filter((s) => s.type === 'group');

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-1"><span className="text-xs font-medium text-zinc-500">我的会话</span></div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
        <div>
          <SectionHeader label="💬 单聊模式 (Direct)" expanded={isDirectExpanded} onToggle={() => setIsDirectExpanded((p) => !p)} onAdd={onPlusClick} addTitle="新建单聊" />
          {isDirectExpanded && (
            <div className="space-y-0.5">
              {directSessions.length === 0 && <p className="px-3 py-2 text-[11px] text-zinc-400 italic">暂无单聊会话</p>}
              {directSessions.map((s) => <SessionItem key={s.id} session={s} activeId={activeId} onSelect={onSelect} onDelete={onDelete} />)}
            </div>
          )}
        </div>
        <div>
          <SectionHeader label="🤖 群聊协作 (Groups)" expanded={isGroupsExpanded} onToggle={() => setIsGroupsExpanded((p) => !p)} onAdd={onOpenGroupModal} addTitle="创建群组" />
          {isGroupsExpanded && (
            <div className="space-y-0.5">
              {groupSessions.length === 0 && <p className="px-3 py-2 text-[11px] text-zinc-400 italic">暂无群聊会话</p>}
              {groupSessions.map((s) => <SessionItem key={s.id} session={s} activeId={activeId} onSelect={onSelect} onDelete={onDelete} />)}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
