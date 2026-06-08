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
    <aside className="relative h-full bg-minimal-glass/50 dark:bg-minimal-dark-glass/50 backdrop-blur-xl border-r border-minimal-glass-border dark:border-minimal-dark-glass-border flex flex-col shrink-0" style={{ width }}>
      <div className="p-3 border-b border-minimal-glass-border dark:border-minimal-dark-glass-border">
        <h2 className="text-sm font-semibold text-minimal-text dark:text-minimal-dark-text truncate">{project.name}</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
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
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-minimal-accent/30 transition-colors duration-300 z-10"
      />
    </aside>
  );
}
