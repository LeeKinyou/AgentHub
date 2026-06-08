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

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'general', label: '通用设置', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { key: 'agents', label: '智能体管理', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { key: 'security', label: '工作区安全', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
  { key: 'usage', label: '额度统计', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
];

export function SettingsModal({ isOpen, onClose, agents, onAddAgent, onUpdateAgent, onDeleteAgent }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('agents');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-xl w-[720px] max-h-[85vh] flex overflow-hidden shadow-minimal-md" onClick={(e) => e.stopPropagation()}>
        <aside className="w-48 shrink-0 bg-minimal-bg dark:bg-minimal-dark-bg border-r border-minimal-border dark:border-minimal-dark-border p-3 space-y-0.5">
          <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-medium px-3 mb-2">设置</p>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors duration-300 ${tab === t.key ? 'bg-white dark:bg-minimal-dark-surface text-minimal-text dark:text-minimal-dark-text shadow-sm' : 'text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-white/60 dark:hover:bg-white/5'}`}>
              {t.icon}
              {t.label}
            </button>
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
