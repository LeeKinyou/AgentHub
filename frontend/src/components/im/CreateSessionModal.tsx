'use client';

import { useState } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAgentIds: string[], sessionName: string) => void;
  availableAgents: AgentProfile[];
  singleSelect?: boolean;
}

export function CreateSessionModal({ isOpen, onClose, onConfirm, availableAgents, singleSelect }: CreateSessionModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const toggleAgent = (id: string) => {
    if (singleSelect) { setSelectedIds((prev) => prev.includes(id) ? [] : [id]); return; }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleConfirm = () => {
    if (selectedIds.length === 0) return;
    const autoName = name.trim() || selectedIds.map((id) => availableAgents.find((a) => a.id === id)?.name ?? '').join(' + ');
    onConfirm(selectedIds, autoName);
    setSelectedIds([]);
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-minimal-glass/80 dark:bg-minimal-dark-surface/80 backdrop-blur-xl border border-minimal-glass-border dark:border-minimal-dark-border p-6 rounded-minimal w-[420px] shadow-minimal-glass shadow-minimal-glow" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-minimal-text dark:text-minimal-dark-text mb-4">创建新会话</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="自定义会话名称（可选）"
          className="w-full px-3 py-2 mb-4 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary dark:placeholder-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
        />
        <p className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary mb-2">选择参与的智能体：</p>
        {availableAgents.length === 0 ? (
          <div className="text-center py-8 text-minimal-secondary dark:text-minimal-dark-secondary">
            <p className="text-sm">暂无可用智能体</p>
            <p className="text-xs mt-1">请先在设置中添加智能体</p>
          </div>
        ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-zinc-300">
          {availableAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-minimal border transition-colors duration-300 ${
                selectedIds.includes(agent.id)
                  ? 'bg-minimal-accent/5 border-minimal-accent'
                  : 'bg-white dark:bg-minimal-dark-surface border-minimal-border dark:border-minimal-dark-border hover:border-minimal-accent/30'
              }`}
            >
              <span className="text-lg">{agent.avatar}</span>
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm text-minimal-text dark:text-minimal-dark-text">{agent.name}</span>
                <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary truncate">{agent.description}</p>
              </div>
              <div className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-colors duration-300 ${
                selectedIds.includes(agent.id) ? 'bg-minimal-accent border-minimal-accent' : 'border-minimal-border dark:border-minimal-dark-border'
              }`}>
                {selectedIds.includes(agent.id) && (
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border dark:disabled:bg-minimal-dark-border disabled:text-minimal-tertiary dark:disabled:text-minimal-dark-tertiary text-white rounded-minimal transition-colors duration-300"
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}
