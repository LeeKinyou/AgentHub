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
    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${role === 'orchestrator' ? 'bg-minimal-accent/10 text-minimal-accent' : 'bg-minimal-success/10 text-minimal-success'}`}>
      {role === 'orchestrator' ? 'Orchestrator' : 'Expert'}
    </span>
  );
}

function StatusIndicator({ status }: { status?: 'online' | 'offline' | 'busy' | 'error' }) {
  const colors: Record<string, string> = {
    online: 'bg-minimal-success',
    offline: 'bg-minimal-tertiary',
    busy: 'bg-minimal-warning',
    error: 'bg-minimal-error',
  };
  return (
    <div className={`w-2 h-2 rounded-full ${colors[status ?? 'offline']} shrink-0`} title={status ?? 'offline'} />
  );
}

const CAPABILITY_TAGS: Record<string, { icon: string; label: string; color: string }> = {
  code_gen: { icon: '💻', label: '代码生成', color: 'bg-minimal-accent/10 text-minimal-accent' },
  web_search: { icon: '🌐', label: '联网搜索', color: 'bg-minimal-accent/10 text-minimal-accent' },
  fs_io: { icon: '📁', label: '文件读写', color: 'bg-minimal-warning/10 text-minimal-warning' },
  terminal: { icon: '🐚', label: '终端执行', color: 'bg-minimal-success/10 text-minimal-success' },
  deploy: { icon: '🚀', label: '一键部署', color: 'bg-minimal-success/10 text-minimal-success' },
};

function AgentCard({ agent }: { agent: AgentProfile }) {
  const capabilities = (agent as AgentProfile & { capabilities?: string[] }).capabilities ?? [];

  return (
    <div className="p-3 bg-white dark:bg-minimal-dark-surface rounded-minimal border border-minimal-border dark:border-minimal-dark-border hover:border-minimal-accent/30 transition-colors duration-300">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-minimal-bg dark:bg-minimal-dark-bg flex items-center justify-center text-sm">{agent.avatar}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text truncate">{agent.name}</span>
            <StatusIndicator status={agent.status} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <RoleBadge role={agent.role} />
          </div>
        </div>
      </div>
      <p className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary line-clamp-2 mb-2">{agent.description}</p>
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
    <aside className="relative bg-minimal-glass/60 dark:bg-minimal-dark-glass/60 backdrop-blur-xl border-l border-minimal-glass-border dark:border-minimal-dark-glass-border flex flex-col shrink-0" style={{ width }}>
      <div
        onMouseDown={onResizeStart}
        className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-minimal-accent/30 transition-colors duration-300 z-10"
      />
      {children ? (
        <div className="flex-1 overflow-hidden flex flex-col">{children}</div>
      ) : (
        <>
          <div className="p-4 border-b border-minimal-border dark:border-minimal-dark-border">
            <h3 className="text-sm font-semibold text-minimal-text dark:text-minimal-dark-text">智能体面板</h3>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-minimal-success rounded-full" />
                <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">{agents.filter((a) => a.status === 'online').length} 在线</span>
              </div>
              <span className="text-minimal-border dark:text-minimal-dark-border">·</span>
              <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">{agents.length} 个专家就绪</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
