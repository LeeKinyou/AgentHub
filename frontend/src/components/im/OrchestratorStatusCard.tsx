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
    <div className={`border rounded-xl overflow-hidden ${status === 'failed' ? 'border-red-500/30' : 'border-zinc-700/50'}`}>
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className={`w-full px-4 py-3 flex items-center justify-between ${config.bgColor} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <span className={`text-sm font-medium ${config.color}`}>Orchestrator · {config.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'dispatching' && currentStep !== undefined && steps && (
            <span className="text-xs text-zinc-500">{currentStep + 1}/{steps.length}</span>
          )}
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-zinc-900/50 space-y-3">
          {steps && steps.length > 0 && (
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={step.order}
                  className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                    idx === currentStep ? 'bg-indigo-500/10 border border-indigo-500/30' : 'bg-zinc-800/30'
                  }`}
                >
                  <span className="text-sm shrink-0 mt-0.5">{STEP_STATUS_ICON[step.status]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-300">Step {step.order}</span>
                      {step.agentAvatar && (
                        <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                          {step.agentAvatar} {step.assignedAgent}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{step.description}</p>
                  </div>
                  {step.status === 'running' && (
                    <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-xs text-red-400">{errorMessage}</p>
            </div>
          )}

          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-colors"
            >
              🔄 重试任务
            </button>
          )}

          {status === 'dispatching' && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
              <span>正在并行调度子 Agent...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}