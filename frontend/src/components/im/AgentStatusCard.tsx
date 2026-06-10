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
  analyzing: { icon: '🔍', label: '分析中', color: 'text-minimal-accent', bgColor: 'bg-minimal-accent/5' },
  executing: { icon: '⚡', label: '执行中', color: 'text-minimal-warning', bgColor: 'bg-minimal-warning/5' },
  completed: { icon: '✅', label: '已完成', color: 'text-minimal-success', bgColor: 'bg-minimal-success/5' },
  failed: { icon: '❌', label: '失败', color: 'text-minimal-error', bgColor: 'bg-minimal-error/5' },
};

export function AgentStatusCard({ agent, status, displayText, progress, onRetry }: AgentStatusCardProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`flex items-center gap-3 px-3.5 py-2.5 rounded-minimal border transition-all duration-300 ${
      status === 'failed' ? 'border-minimal-error/20 bg-minimal-error/5' :
      status === 'completed' ? 'border-minimal-success/20 bg-minimal-success/5' :
      'border-minimal-border bg-minimal-bg'
    }`}>
      <div className="relative w-9 h-9 rounded-full bg-minimal-bg flex items-center justify-center text-sm shrink-0 ring-1 ring-minimal-border">
        {agent.avatar ?? '🤖'}
        {status === 'executing' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-minimal-warning animate-pulse" />
        )}
        {status === 'completed' && (
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-minimal-success" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-minimal-text">{agent.name}</span>
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono border ${config.color} ${config.bgColor} border-current/20`}>
            <span className={status === 'executing' ? 'animate-pulse' : ''}>{config.icon}</span>
            {config.label}
          </span>
        </div>
        {displayText && (
          <p className="text-xs text-minimal-secondary mt-0.5 truncate font-mono">{displayText}</p>
        )}
        {progress !== undefined && status === 'executing' && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-minimal-border rounded-full overflow-hidden">
              <div
                className="h-full bg-minimal-warning rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <span className="text-[10px] text-minimal-tertiary font-mono w-8 text-right">{Math.round(progress ?? 0)}%</span>
          </div>
        )}
      </div>
      {status === 'executing' && (
        <span className="w-4 h-4 rounded-full bg-minimal-warning animate-pulse shrink-0" />
      )}
      {status === 'failed' && onRetry && (
        <button
          onClick={onRetry}
          className="px-2.5 py-1 text-xs bg-minimal-error/10 hover:bg-minimal-error/20 text-minimal-error rounded-minimal border border-minimal-error/20 transition-colors duration-300 shrink-0 font-mono"
        >
          重试
        </button>
      )}
    </div>
  );
}
