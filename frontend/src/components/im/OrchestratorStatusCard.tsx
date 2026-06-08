'use client';

import { useState } from 'react';

export type OrchestratorStatus = 'thinking' | 'planning' | 'dispatching' | 'aggregating' | 'completed' | 'failed';

export interface TaskStep {
  order: number;
  description: string;
  assignedAgent: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  agentAvatar?: string;
}

interface OrchestratorStatusCardProps {
  status: OrchestratorStatus;
  steps?: TaskStep[];
  currentStep?: number;
  errorMessage?: string;
  onRetry?: () => void;
}

const STATUS_CONFIG: Record<OrchestratorStatus, { icon: string; label: string; color: string; bgColor: string }> = {
  thinking: { icon: '🧠', label: '思考中', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  planning: { icon: '📋', label: '规划中', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  dispatching: { icon: '🚀', label: '分派中', color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
  aggregating: { icon: '🔄', label: '聚合中', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  completed: { icon: '✅', label: '已完成', color: 'text-green-400', bgColor: 'bg-green-500/10' },
  failed: { icon: '❌', label: '失败', color: 'text-red-400', bgColor: 'bg-red-500/10' },
};

const STEP_STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  running: '⚡',
  completed: '✅',
  failed: '❌',
};

export function OrchestratorStatusCard({ status, steps, currentStep, errorMessage, onRetry }: OrchestratorStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const config = STATUS_CONFIG[status];

  return (
    <div className={`border rounded-xl overflow-hidden backdrop-blur-sm transition-all ${status === 'failed' ? 'border-red-800/40' : 'border-zinc-700/30'}`}>
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className={`w-full px-4 py-3 flex items-center justify-between ${config.bgColor} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-lg">{config.icon}</span>
            {status !== 'failed' && status !== 'completed' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-xs font-mono font-semibold tracking-wider ${config.color}`}>ORCHESTRATOR</span>
            <span className="text-[10px] text-zinc-500 font-mono">{config.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'dispatching' && currentStep !== undefined && steps && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/60 border border-zinc-700/40 text-[10px] text-zinc-400 font-mono">
              <span className="w-1 h-1 rounded-full bg-indigo-400 animate-pulse" />
              {currentStep + 1}/{steps.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-zinc-900/30 space-y-3">
          {steps && steps.length > 0 && (
            <div className="space-y-1.5">
              {steps.map((step, idx) => (
                <div
                  key={step.order}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    idx === currentStep
                      ? 'bg-indigo-500/10 border border-indigo-500/25 shadow-sm shadow-indigo-500/5'
                      : step.status === 'completed'
                      ? 'bg-emerald-500/5 border border-emerald-500/10'
                      : step.status === 'failed'
                      ? 'bg-red-500/5 border border-red-500/10'
                      : 'bg-zinc-800/20 border border-transparent'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                    <span className="text-xs">{STEP_STATUS_ICON[step.status]}</span>
                    {idx < steps.length - 1 && (
                      <div className={`w-px h-3 ${step.status === 'completed' ? 'bg-emerald-600/40' : 'bg-zinc-700/40'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-zinc-300">Step {step.order}</span>
                      {step.agentAvatar && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800/60 rounded-md border border-zinc-700/30 text-[10px] text-zinc-400 font-mono">
                          {step.agentAvatar} {step.assignedAgent}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">{step.description}</p>
                  </div>
                  {step.status === 'running' && (
                    <svg className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-950/30 border border-red-800/30 rounded-lg">
              <p className="text-xs text-red-400 font-mono">{errorMessage}</p>
            </div>
          )}

          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg border border-red-500/20 transition-colors font-mono"
            >
              重试任务
            </button>
          )}

          {status === 'dispatching' && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
              <span className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              正在并行调度子 Agent...
            </div>
          )}
        </div>
      )}
    </div>
  );
}