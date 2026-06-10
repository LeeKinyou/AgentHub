'use client';

import { useState } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAgents: AgentProfile[];
  onCreate: (title: string, selectedAgentIds: string[]) => void;
}

export function CreateGroupModal({ isOpen, onClose, availableAgents, onCreate }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleAgent = (id: string) => {
    setSelectedAgentIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const canSubmit = groupName.trim().length > 0 && selectedAgentIds.length >= 2;

  const handleCreate = () => {
    if (!canSubmit) return;
    onCreate(groupName.trim(), selectedAgentIds);
    setGroupName('');
    setSelectedAgentIds([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose} data-testid="create-group-modal">
      <div className="bg-minimal-glass/80 dark:bg-minimal-dark-surface/80 backdrop-blur-xl border border-minimal-glass-border dark:border-minimal-dark-border p-6 rounded-minimal w-[440px] shadow-minimal-glass shadow-minimal-glow" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-minimal-text dark:text-minimal-dark-text mb-4">创建专家群组</h3>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="请输入专案群组名称..."
          className="w-full px-4 py-2 mb-4 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary dark:placeholder-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
          data-testid="group-name-input"
        />
        <p className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary mb-2">选择要拉入群组的智能体（至少 2 位）：</p>
        {availableAgents.length === 0 ? (
          <div className="text-center py-8 text-minimal-secondary dark:text-minimal-dark-secondary">
            <p className="text-sm">暂无可用智能体</p>
            <p className="text-xs mt-1">请先在设置中添加智能体</p>
          </div>
        ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-zinc-300">
          {availableAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              data-testid={`group-agent-${agent.id}`}
              className={`w-full flex items-center gap-3 p-3 rounded-minimal border transition-colors duration-300 ${
                selectedAgentIds.includes(agent.id)
                  ? 'bg-minimal-accent/5 border-minimal-accent'
                  : 'bg-white dark:bg-minimal-dark-surface border-minimal-border dark:border-minimal-dark-border hover:border-minimal-accent/30'
              }`}
            >
              <span className="text-lg">{agent.avatar}</span>
              <div className="flex-1 text-left">
                <span className="text-sm text-minimal-text dark:text-minimal-dark-text">{agent.name}</span>
                <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">{agent.description}</p>
              </div>
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors duration-300 ${
                selectedAgentIds.includes(agent.id) ? 'bg-minimal-accent border-minimal-accent' : 'border-minimal-border dark:border-minimal-dark-border'
              }`}>
                {selectedAgentIds.includes(agent.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300">取消</button>
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border dark:disabled:bg-minimal-dark-border disabled:text-minimal-tertiary dark:disabled:text-minimal-dark-tertiary text-white rounded-minimal transition-colors duration-300"
            data-testid="confirm-create-group"
          >
            创建群组
          </button>
        </div>
      </div>
    </div>
  );
}
