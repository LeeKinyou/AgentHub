'use client';

import type { Project } from './mockProjects';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import type { FileNode } from './mockFiles';
import { FileExplorer } from './FileExplorer';
import { SessionSidebar } from './SessionSidebar';

interface ContextSidebarProps {
  project: Project;
  activeSessionId: string | null;
  activeFileName: string | null;
  agents: AgentProfile[];
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onSelectSession: (sessionId: string) => void;
  onPlusClick: () => void;
  onOpenFolder: () => void;
  onOpenFile: (name: string, handle: FileSystemFileHandle) => void;
  onOpenFileTransient: (name: string, handle: FileSystemFileHandle) => void;
  onFileAction: (action: 'create' | 'delete' | 'copy', node: FileNode, fileName?: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export function ContextSidebar({ project, activeSessionId, activeFileName, agents, width, onResizeStart, onSelectSession, onPlusClick, onOpenFolder, onOpenFile, onOpenFileTransient, onFileAction, onDeleteSession }: ContextSidebarProps) {
  return (
    <aside className="relative h-screen bg-zinc-50 dark:bg-zinc-900/30 border-r border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0" style={{ width }}>
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 truncate">{project.name}</h2>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden border-b border-zinc-200/50 dark:border-zinc-800/50">
          <div className="px-3 py-2">
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">📁 Project Files</span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
            <FileExplorer root={project.fileTree} activeFileName={activeFileName} onOpenFile={onOpenFile} onOpenFileTransient={onOpenFileTransient} onOpenFolder={onOpenFolder} onFileAction={onFileAction} />
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <div className="px-3 py-2">
            <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-600 uppercase tracking-wider">💬 AI Dispatches</span>
          </div>
          <div className="h-[calc(100%-28px)] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
            <SessionSidebar
              sessions={project.sessions}
              activeId={activeSessionId}
              onSelect={onSelectSession}
              onPlusClick={onPlusClick}
              onDelete={onDeleteSession}
            />
          </div>
        </div>
      </div>
      <div
        onMouseDown={onResizeStart}
        className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10"
      />
    </aside>
  );
}
