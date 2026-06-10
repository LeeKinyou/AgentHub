'use client';

import type { AgentProfile } from '@agenthub/shared/types/entities';

interface MentionListProps {
  agents: AgentProfile[];
  isOpen: boolean;
  highlightIndex: number;
  onSelect: (agent: AgentProfile) => void;
}

export function MentionList({ agents, isOpen, highlightIndex, onSelect }: MentionListProps) {
  if (!isOpen || agents.length === 0) return null;

  return (
    <div className="absolute bottom-full left-4 mb-2 w-72 bg-minimal-glass/80 backdrop-blur-xl border border-minimal-glass-border rounded-minimal shadow-minimal-glass overflow-hidden z-50 shadow-minimal-glow">
      <div className="px-3 py-2 border-b border-minimal-glass-border">
        <span className="text-[11px] text-minimal-tertiary">智能体列表</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full flex items-center gap-3 px-3 py-2 transition-colors duration-300 ${
              index === highlightIndex ? 'bg-minimal-bg' : 'hover:bg-minimal-bg'
            }`}
          >
            <span className="text-lg">{agent.avatar}</span>
            <div className="flex-1 text-left">
              <span className="text-sm text-minimal-text">{agent.name}</span>
              <span className={`ml-2 text-[10px] px-1 py-0.5 rounded ${
                agent.role === 'orchestrator' ? 'bg-minimal-accent/10 text-minimal-accent' : 'bg-minimal-success/10 text-minimal-success'
              }`}>
                {agent.role}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
