'use client';

import type { Project } from './mockProjects';
import { SessionSidebar } from './SessionSidebar';

interface ContextSidebarProps {
  project: Project;
  activeSessionId: string | null;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onSelectSession: (sessionId: string) => void;
  onPlusClick: () => void;
  onOpenGroupModal: () => void;
  onDeleteSession: (sessionId: string) => void;
  onPinSession?: (sessionId: string) => void;
  onArchiveSession?: (sessionId: string) => void;
}

export function ContextSidebar({ project, activeSessionId, width, onResizeStart, onSelectSession, onPlusClick, onOpenGroupModal, onDeleteSession, onPinSession, onArchiveSession }: ContextSidebarProps) {
  return (
    <aside className="relative h-full bg-zinc-50 dark:bg-zinc-900/30 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0" style={{ width }}>
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{project.name}</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
          <SessionSidebar
            sessions={project.sessions}
            activeId={activeSessionId}
            onSelect={onSelectSession}
            onPlusClick={onPlusClick}
            onOpenGroupModal={onOpenGroupModal}
            onDelete={onDeleteSession}
            onPin={onPinSession}
            onArchive={onArchiveSession}
          />
        </div>
      </div>
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10"
      />
    </aside>
  );
}
