'use client';

import type { ReactNode } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface AgentSidebarProps {
  agents: AgentProfile[];
  isOpen: boolean;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  children?: ReactNode;
}

function RoleBadge({ role }: { role: 'orchestrator' | 'expert' }) {
  return (
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${role === 'orchestrator' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
      {role === 'orchestrator' ? 'Orchestrator' : 'Expert'}
    </span>
  );
}

function AgentCard({ agent }: { agent: AgentProfile }) {
  return (
    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors duration-150">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">{agent.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{agent.name}</span>
            <RoleBadge role={agent.role} />
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2">{agent.description}</p>
    </div>
  );
}

export function AgentSidebar({ agents, isOpen, width, onResizeStart, children }: AgentSidebarProps) {
  if (!isOpen) return null;

  return (
    <aside className="relative bg-zinc-950 dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 flex flex-col shrink-0" style={{ width }}>
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10"
      />
      {children ? (
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      ) : (
        <>
          <div className="p-4 border-b border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-200">智能体面板</h3>
            <p className="text-[11px] text-zinc-500 mt-0.5">{agents.length} 个专家就绪</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
