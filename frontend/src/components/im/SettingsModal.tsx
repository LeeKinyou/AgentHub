'use client';

import { useState } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { GeneralSettingsPanel } from './GeneralSettingsPanel';
import { AgentManagerPanel } from './AgentManagerPanel';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentProfile[];
  onAddAgent: (agent: AgentProfile) => void;
  onDeleteAgent: (id: string) => void;
}

type TabKey = 'general' | 'agents' | 'security' | 'usage';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'general', icon: '💻', label: '通用设置' },
  { key: 'agents', icon: '🤖', label: '智能体管理' },
  { key: 'security', icon: '🔐', label: '工作区安全' },
  { key: 'usage', icon: '📊', label: '额度统计' },
];

function Placeholder({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center text-3xl">{icon}</div>
      <h3 className="text-sm font-semibold text-zinc-300">{title}</h3>
      <p className="text-xs text-zinc-500 max-w-[240px] leading-relaxed">{desc}</p>
      <span className="mt-1 px-3 py-1 text-[10px] rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700/50">即将上线</span>
    </div>
  );
}

export function SettingsModal({ isOpen, onClose, agents, onAddAgent, onDeleteAgent }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('agents');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[680px] h-[520px] shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <aside className="w-48 bg-zinc-950 border-r border-zinc-800 p-3 space-y-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.key ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>{t.icon} {t.label}</button>
          ))}
        </aside>
        <main className="flex-1 p-5 overflow-y-auto">
          {tab === 'general' && <GeneralSettingsPanel />}
          {tab === 'agents' && <AgentManagerPanel agents={agents} onAdd={onAddAgent} onDelete={onDeleteAgent} />}
          {tab === 'security' && <Placeholder icon="🔐" title="工作区安全" desc="API 密钥加密存储、访问审计日志、IP 白名单等安全策略即将上线。" />}
          {tab === 'usage' && <Placeholder icon="📊" title="额度统计" desc="Token 消耗追踪、多模型费用对比、预算预警面板即将推出。" />}
        </main>
      </div>
    </div>
  );
}
