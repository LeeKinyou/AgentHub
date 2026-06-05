'use client';

import type { AgentProfile } from '@agenthub/shared/types/entities';

export type AgentExecutionStatus = 'analyzing' | 'executing' | 'completed' | 'failed';

interface AgentStatusCardProps {
  agent: AgentProfile;
  status: AgentExecutionStatus;
  displayText?: string;
  progress?: number;
  onRetry?: () => void;
}

const STATUS_CONFIG: Record<AgentExecutionStatus, { icon: string; label: string; color: string; bgColor: string }> = {
  analyzing: { icon: '🔍', label: '分析中', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  executing: { icon: '⚡', label: '执行中', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  completed: { icon: '✅', label: '已完成', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  failed: { icon: '❌', label: '失败', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

export function AgentStatusCard({ agent, status, displayText, progress, onRetry }: AgentStatusCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${status === 'failed' ? 'border-red-500/30' : 'border-zinc-700/50'} ${config.bgColor}`}>
      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm shrink-0">
        {agent.avatar ?? '🤖'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-300">{agent.name}</span>
          <span className={`text-xs ${config.color}`}>{config.icon} {config.label}</span>
        </div>
        {displayText && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate">{displayText}</p>
        )}
        {progress !== undefined && status === 'executing' && (
          <div className="mt-1.5 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        )}
      </div>
      {status === 'executing' && (
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors shrink-0"
        >
          重试
        </button>
      )}
    </div>
  );
}