'use client';

import { useState } from 'react';
import type { AgentProfileRead } from '@/lib/api';
import { GeneralSettingsPanel } from './GeneralSettingsPanel';
import { AgentManagerPanel } from './AgentManagerPanel';
import { SecuritySettingsPanel } from './SecuritySettingsPanel';
import { UsageStatsPanel } from './UsageStatsPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentProfileRead[];
  onAddAgent: (data: { name: string; role: 'orchestrator' | 'expert'; adapterType?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onUpdateAgent: (agentId: string, data: { name?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onDeleteAgent: (id: string) => Promise<boolean>;
}

type TabKey = 'general' | 'agents' | 'security' | 'usage';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'general', icon: '💻', label: '通用设置' },
  { key: 'agents', icon: '🤖', label: '智能体管理' },
  { key: 'security', icon: '🔐', label: '工作区安全' },
  { key: 'usage', icon: '📊', label: '额度统计' },
];

export function SettingsModal({ isOpen, onClose, agents, onAddAgent, onUpdateAgent, onDeleteAgent }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('agents');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-[680px] h-[520px] shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <aside className="w-48 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 p-3 space-y-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.key ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}>{t.icon} {t.label}</button>
          ))}
        </aside>
        <main className="flex-1 p-5 overflow-y-auto">
          {tab === 'general' && <GeneralSettingsPanel />}
          {tab === 'agents' && <AgentManagerPanel agents={agents} onAdd={onAddAgent} onUpdate={onUpdateAgent} onDelete={onDeleteAgent} />}
          {tab === 'security' && <SecuritySettingsPanel />}
          {tab === 'usage' && <UsageStatsPanel />}
        </main>
      </div>
    </div>
  );
}
