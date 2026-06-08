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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-[440px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-zinc-200 mb-4">创建专家群组</h3>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="请输入专案群组名称..."
          className="w-full px-4 py-2 mb-4 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        <p className="text-xs text-zinc-500 mb-2">选择要拉入群组的智能体（至少 2 位）：</p>
        {availableAgents.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <p className="text-sm">暂无可用智能体</p>
            <p className="text-xs mt-1">请先在设置中添加智能体</p>
          </div>
        ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto mb-4 scrollbar-thin scrollbar-thumb-zinc-800">
          {availableAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors duration-150 ${
                selectedAgentIds.includes(agent.id)
                  ? 'bg-indigo-600/20 border-indigo-500'
                  : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-600'
              }`}
            >
              <span className="text-lg">{agent.avatar}</span>
              <div className="flex-1 text-left">
                <span className="text-sm text-zinc-200">{agent.name}</span>
                <p className="text-[11px] text-zinc-500">{agent.description}</p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                selectedAgentIds.includes(agent.id) ? 'bg-indigo-600 border-indigo-600' : 'border-zinc-600'
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
          <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors"
          >
            创建群组
          </button>
        </div>
      </div>
    </div>
  );
}
