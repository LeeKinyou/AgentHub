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
  thinking: { icon: '🧠', label: '思考中', color: 'text-minimal-accent', bgColor: 'bg-minimal-accent/5' },
  planning: { icon: '📋', label: '规划中', color: 'text-minimal-accent', bgColor: 'bg-minimal-accent/5' },
  dispatching: { icon: '🚀', label: '分派中', color: 'text-minimal-accent', bgColor: 'bg-minimal-accent/5' },
  aggregating: { icon: '🔄', label: '聚合中', color: 'text-minimal-warning', bgColor: 'bg-minimal-warning/5' },
  completed: { icon: '✅', label: '已完成', color: 'text-minimal-success', bgColor: 'bg-minimal-success/5' },
  failed: { icon: '❌', label: '失败', color: 'text-minimal-error', bgColor: 'bg-minimal-error/5' },
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
    <div className={`border rounded-minimal overflow-hidden transition-all duration-300 backdrop-blur-xl ${status === 'failed' ? 'border-minimal-error/20 bg-minimal-error/5' : 'border-minimal-glass-border bg-minimal-glass/60'} shadow-minimal-glow`}>
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className={`w-full px-4 py-3 flex items-center justify-between ${config.bgColor} hover:opacity-90 transition-opacity duration-300`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-lg">{config.icon}</span>
            {status !== 'failed' && status !== 'completed' && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-minimal-accent animate-pulse" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className={`text-xs font-mono font-semibold tracking-wider ${config.color}`}>ORCHESTRATOR</span>
            <span className="text-[10px] text-minimal-secondary font-mono">{config.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {status === 'dispatching' && currentStep !== undefined && steps && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-minimal-bg border border-minimal-border text-[10px] text-minimal-secondary font-mono">
              <span className="w-1 h-1 rounded-full bg-minimal-accent animate-pulse" />
              {currentStep + 1}/{steps.length}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-minimal-tertiary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-minimal-bg space-y-3">
          {steps && steps.length > 0 && (
            <div className="space-y-1.5">
              {steps.map((step, idx) => (
                <div
                  key={step.order}
                  className={`flex items-start gap-3 px-3 py-2.5 rounded-minimal transition-all duration-300 ${
                    idx === currentStep
                      ? 'bg-minimal-accent/5 border border-minimal-accent/20'
                      : step.status === 'completed'
                      ? 'bg-minimal-success/5 border border-minimal-success/10'
                      : step.status === 'failed'
                      ? 'bg-minimal-error/5 border border-minimal-error/10'
                      : 'bg-white border border-transparent'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5 shrink-0 mt-0.5">
                    <span className="text-xs">{STEP_STATUS_ICON[step.status]}</span>
                    {idx < steps.length - 1 && (
                      <div className={`w-px h-3 ${step.status === 'completed' ? 'bg-minimal-success/30' : 'bg-minimal-border'}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-medium text-minimal-text">Step {step.order}</span>
                      {step.agentAvatar && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-minimal-bg rounded border border-minimal-border text-[10px] text-minimal-secondary font-mono">
                          {step.agentAvatar} {step.assignedAgent}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-minimal-secondary mt-0.5 font-mono">{step.description}</p>
                  </div>
                  {step.status === 'running' && (
                    <span className="w-3.5 h-3.5 rounded-full bg-minimal-accent animate-pulse shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-minimal-error/5 border border-minimal-error/20 rounded-minimal">
              <p className="text-xs text-minimal-error font-mono">{errorMessage}</p>
            </div>
          )}

          {status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              className="w-full py-2 bg-minimal-error/10 hover:bg-minimal-error/20 text-minimal-error text-xs rounded-minimal border border-minimal-error/20 transition-colors duration-300 font-mono"
            >
              重试任务
            </button>
          )}

          {status === 'dispatching' && (
            <div className="flex items-center gap-2 text-[11px] text-minimal-secondary font-mono">
              <span className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-minimal-accent animate-pulse" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-minimal-accent animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-minimal-accent animate-pulse" style={{ animationDelay: '300ms' }} />
              </span>
              正在并行调度子 Agent...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
