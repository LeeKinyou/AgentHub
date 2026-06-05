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

function StatusIndicator({ status }: { status?: 'online' | 'offline' | 'busy' | 'error' }) {
  const colors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-zinc-500',
    busy: 'bg-amber-500',
    error: 'bg-red-500',
  };
  return (
    <div className={`w-2 h-2 rounded-full ${colors[status ?? 'offline']} shrink-0`} title={status ?? 'offline'} />
  );
}

const CAPABILITY_TAGS: Record<string, { icon: string; label: string; color: string }> = {
  code_gen: { icon: '💻', label: '代码生成', color: 'bg-indigo-500/20 text-indigo-400' },
  web_search: { icon: '🌐', label: '联网搜索', color: 'bg-blue-500/20 text-blue-400' },
  fs_io: { icon: '📁', label: '文件读写', color: 'bg-amber-500/20 text-amber-400' },
  terminal: { icon: '🐚', label: '终端执行', color: 'bg-green-500/20 text-green-400' },
  deploy: { icon: '🚀', label: '一键部署', color: 'bg-purple-500/20 text-purple-400' },
};

function AgentCard({ agent }: { agent: AgentProfile }) {
  const capabilities = (agent as AgentProfile & { capabilities?: string[] }).capabilities ?? [];

  return (
    <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors duration-150">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm">{agent.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200 truncate">{agent.name}</span>
            <StatusIndicator status={agent.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <RoleBadge role={agent.role} />
          </div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-2">{agent.description}</p>
      {capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {capabilities.map((cap) => {
            const tag = CAPABILITY_TAGS[cap];
            if (!tag) return null;
            return (
              <span key={cap} className={`px-1.5 py-0.5 text-[10px] rounded ${tag.color}`}>
                {tag.icon} {tag.label}
              </span>
            );
          })}
        </div>
      )}
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
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-[11px] text-zinc-500">{agents.filter((a) => a.status === 'online').length} 在线</span>
              </div>
              <span className="text-zinc-700">·</span>
              <span className="text-[11px] text-zinc-500">{agents.length} 个专家就绪</span>
            </div>
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
