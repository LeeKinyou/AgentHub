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
    <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border backdrop-blur-sm transition-all ${
      status === 'failed' ? 'border-red-800/40 bg-red-950/30' :
      status === 'completed' ? 'border-emerald-800/30 bg-emerald-950/20' :
      'border-zinc-700/30 bg-zinc-800/30'
    }`}>
      <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm shrink-0 ring-2 ring-zinc-600/40">
        {agent.avatar ?? '🤖'}
        {status === 'executing' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-amber-400 animate-pulse" />
        )}
        {status === 'completed' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 bg-emerald-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono border ${config.color} ${config.bgColor}`}>
            <span className={status === 'executing' ? 'animate-pulse' : ''}>{config.icon}</span>
            {config.label}
          </span>
        </div>
        {displayText && (
          <p className="text-xs text-zinc-500 mt-0.5 truncate font-mono">{displayText}</p>
        )}
        {progress !== undefined && status === 'executing' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-[10px] text-zinc-600 font-mono w-8 text-right">{Math.round(progress ?? 0)}%</span>
          </div>
        )}
      </div>
      {status === 'executing' && (
        <svg className="w-4 h-4 text-amber-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="px-2.5 py-1 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-colors shrink-0 font-mono"
        >
          重试
        </button>
      )}
    </div>
  );
}