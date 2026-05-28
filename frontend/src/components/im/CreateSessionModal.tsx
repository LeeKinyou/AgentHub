'use client';

import { useState } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAgentIds: string[], sessionName: string) => void;
  availableAgents: AgentProfile[];
}

export function CreateSessionModal({ isOpen, onClose, onConfirm, availableAgents }: CreateSessionModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const toggleAgent = (id: string) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-zinc-200 mb-4">创建新会话</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="自定义会话名称（可选）"
          className="w-full px-3 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <p className="text-xs text-zinc-500 mb-2">选择参与的智能体：</p>
        <div className="space-y-1.5 max-h-44 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {availableAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors duration-150 ${
                selectedIds.includes(agent.id)
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <span className="text-lg">{agent.avatar}</span>
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm text-zinc-200">{agent.name}</span>
                <p className="text-[11px] text-zinc-500 truncate">{agent.description}</p>
              </div>
              <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                selectedIds.includes(agent.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
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
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            确认创建
          </button>
        </div>
      </div>
    </div>
  );
}