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
    <div className="absolute bottom-full left-4 mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50">
      <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
        <span className="text-[11px] text-zinc-400">智能体列表</span>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {agents.map((agent, index) => (
          <button
            key={agent.id}
            onClick={() => onSelect(agent)}
            className={`w-full flex items-center gap-3 px-3 py-2 transition-colors duration-100 ${
              index === highlightIndex ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <span className="text-lg">{agent.avatar}</span>
            <div className="flex-1 text-left">
              <span className="text-sm text-zinc-800 dark:text-zinc-200">{agent.name}</span>
              <span className={`ml-2 text-[10px] px-1 py-0.5 rounded ${
                agent.role === 'orchestrator' ? 'bg-blue-500/20 text-blue-500 dark:text-blue-400' : 'bg-purple-500/20 text-purple-500 dark:text-purple-400'
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