'use client';

import { useState, useMemo } from 'react';
import type { Session } from '@agenthub/shared/types/entities';
import { AvatarStack } from './AvatarStack';

interface SessionSidebarProps {
  sessions: Session[];
  activeId: string | null;
  onSelect: (sessionId: string) => void;
  onPlusClick: () => void;
  onOpenGroupModal: () => void;
  onDelete: (sessionId: string) => void;
  onPin?: (sessionId: string) => void;
  onArchive?: (sessionId: string) => void;
}

function SessionItem({ session, activeId, onSelect, onDelete, onPin, onArchive }: { session: Session; activeId: string | null; onSelect: (id: string) => void; onDelete: (id: string) => void; onPin?: (id: string) => void; onArchive?: (id: string) => void }) {
  return (
    <div className="group relative">
      <button onClick={() => onSelect(session.id)}
        className={`w-full text-left px-3 py-2 rounded-minimal transition-colors duration-300 border-l-2 ${session.id === activeId ? 'bg-minimal-accent/5 text-minimal-text border-minimal-accent' : 'text-minimal-secondary hover:bg-minimal-bg hover:text-minimal-text border-transparent'}`}>
        <div className="flex items-center gap-2">
          {session.type === 'group' && session.agentIds.length > 0 && <AvatarStack agentIds={session.agentIds} />}
          <span className="truncate text-sm">{session.title}</span>
        </div>
        {session.lastMessagePreview && (
          <p className="text-[11px] text-minimal-tertiary truncate mt-0.5">{session.lastMessagePreview}</p>
        )}
      </button>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300">
        {session.isPinned && (
          <span className="text-[10px] text-minimal-warning" title="已置顶">📌</span>
        )}
        {onPin && (
          <button onClick={(e) => { e.stopPropagation(); onPin(session.id); }}
            className="p-1 rounded hover:bg-minimal-bg text-minimal-tertiary hover:text-minimal-warning transition-colors duration-300"
            title={session.isPinned ? "取消置顶" : "置顶"}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          </button>
        )}
        {onArchive && (
          <button onClick={(e) => { e.stopPropagation(); onArchive(session.id); }}
            className="p-1 rounded hover:bg-minimal-bg text-minimal-tertiary hover:text-minimal-accent transition-colors duration-300"
            title={session.isArchived ? "取消归档" : "归档"}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          </button>
        )}
        <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
          className="p-1 rounded hover:bg-minimal-error/10 text-minimal-tertiary hover:text-minimal-error transition-colors duration-300" title="删除会话">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ label, expanded, onToggle, onAdd, addTitle }: { label: string; expanded: boolean; onToggle: () => void; onAdd?: () => void; addTitle?: string }) {
  return (
    <div className="px-3 py-1.5 flex items-center justify-between">
      <button onClick={onToggle} className="flex items-center gap-1 min-w-0">
        <svg className={`w-3 h-3 text-minimal-tertiary shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
        <span className="text-[10px] font-medium text-minimal-secondary uppercase tracking-wider truncate">{label}</span>
      </button>
      {onAdd && (
        <button onClick={onAdd} className="w-5 h-5 flex items-center justify-center rounded hover:bg-minimal-bg text-minimal-tertiary hover:text-minimal-text transition-colors duration-300 shrink-0" title={addTitle}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        </button>
      )}
    </div>
  );
}

export function SessionSidebar({ sessions, activeId, onSelect, onPlusClick, onOpenGroupModal, onDelete, onPin, onArchive }: SessionSidebarProps) {
  const [isDirectExpanded, setIsDirectExpanded] = useState(true);
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter((s) => showArchived ? s.isArchived : !s.isArchived);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.title.toLowerCase().includes(query) ||
        s.lastMessagePreview?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      const aTime = a.lastActiveAt || a.createdAt;
      const bTime = b.lastActiveAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }, [sessions, searchQuery, showArchived]);

  const directSessions = filteredSessions.filter((s) => s.type !== 'group');
  const groupSessions = filteredSessions.filter((s) => s.type === 'group');

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-minimal-secondary">我的会话</span>
          <button
            onClick={() => setShowArchived((p) => !p)}
            className="text-[10px] text-minimal-tertiary hover:text-minimal-text transition-colors duration-300"
          >
            {showArchived ? '显示活跃' : '显示归档'}
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索会话..."
            className="w-full px-3 py-1.5 bg-minimal-bg border border-minimal-border rounded-minimal text-xs text-minimal-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
          />
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-minimal-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-300">
        <div>
          <SectionHeader label="💬 单聊模式 (Direct)" expanded={isDirectExpanded} onToggle={() => setIsDirectExpanded((p) => !p)} onAdd={onPlusClick} addTitle="新建单聊" />
          {isDirectExpanded && (
            <div className="space-y-0.5">
              {directSessions.length === 0 && <p className="px-3 py-2 text-[11px] text-minimal-tertiary italic">{searchQuery ? '无匹配结果' : '暂无单聊会话'}</p>}
              {directSessions.map((s) => <SessionItem key={s.id} session={s} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onArchive={onArchive} />)}
            </div>
          )}
        </div>
        <div>
          <SectionHeader label="🤖 群聊协作 (Groups)" expanded={isGroupsExpanded} onToggle={() => setIsGroupsExpanded((p) => !p)} onAdd={onOpenGroupModal} addTitle="创建群组" />
          {isGroupsExpanded && (
            <div className="space-y-0.5">
              {groupSessions.length === 0 && <p className="px-3 py-2 text-[11px] text-minimal-tertiary italic">{searchQuery ? '无匹配结果' : '暂无群聊会话'}</p>}
              {groupSessions.map((s) => <SessionItem key={s.id} session={s} activeId={activeId} onSelect={onSelect} onDelete={onDelete} onPin={onPin} onArchive={onArchive} />)}
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
