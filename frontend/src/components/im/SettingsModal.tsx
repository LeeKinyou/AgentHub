'use client';

import { useState } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AgentProfile[];
  onAddAgent: (agent: AgentProfile) => void;
}

type TabKey = 'general' | 'agents' | 'security' | 'usage';

const TABS: { key: TabKey; icon: string; label: string }[] = [
  { key: 'general', icon: '💻', label: '通用设置' },
  { key: 'agents', icon: '🤖', label: '智能体管理' },
  { key: 'security', icon: '🔐', label: '工作区安全' },
  { key: 'usage', icon: '📊', label: '额度统计' },
];

const PROVIDERS = [
  { value: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview'] },
  { value: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3.5-haiku', 'claude-3-opus'] },
  { value: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { value: 'Ollama', models: ['llama3.1', 'qwen2.5', 'codellama', 'mistral'] },
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

export function SettingsModal({ isOpen, onClose, agents, onAddAgent }: SettingsModalProps) {
  const [tab, setTab] = useState<TabKey>('agents');
  const [showForm, setShowForm] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState(PROVIDERS[0].value);
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  if (!isOpen) return null;

  const cur = PROVIDERS.find((p) => p.value === provider)!;
  const canSubmit = name.trim().length > 0 && apiKey.trim().length > 0;

  const handleAdd = () => {
    if (!canSubmit) return;
    onAddAgent({ id: `agent-custom-${crypto.randomUUID()}`, name: name.trim(), avatar: '🔧', role: 'expert', description: `${provider} · ${model}` });
    setName(''); setApiKey(''); setSystemPrompt(''); setShowForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-[680px] h-[520px] shadow-2xl flex overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <aside className="w-48 bg-zinc-950 border-r border-zinc-800 p-3 space-y-1">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.key ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}>{t.icon} {t.label}</button>
          ))}
        </aside>
        <main className="flex-1 p-5 overflow-y-auto">
          {tab === 'general' && <Placeholder icon="💻" title="通用设置" desc="主题偏好、语言切换、通知推送等全局配置项即将开放。" />}
          {tab === 'security' && <Placeholder icon="🔐" title="工作区安全" desc="API 密钥加密存储、访问审计日志、IP 白名单等安全策略即将上线。" />}
          {tab === 'usage' && <Placeholder icon="📊" title="额度统计" desc="Token 消耗追踪、多模型费用对比、预算预警面板即将推出。" />}
          {tab === 'agents' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">已注册智能体</h3>
              <div className="space-y-2">
                {agents.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                    <span className="text-lg">{a.avatar}</span>
                    <div className="flex-1 min-w-0"><span className="text-sm text-zinc-200">{a.name}</span><p className="text-[11px] text-zinc-500 truncate">{a.description}</p></div>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded ${a.role === 'orchestrator' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{a.role}</span>
                  </div>
                ))}
              </div>
              {!showForm ? (
                <button onClick={() => setShowForm(true)} className="w-full py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">+ 添加自定义智能体</button>
              ) : (
                <div className="space-y-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/80">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[11px] text-zinc-500 mb-1 block">智能体名称</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
                    <div><label className="text-[11px] text-zinc-500 mb-1 block">模型服务商</label><select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(PROVIDERS.find((p) => p.value === e.target.value)!.models[0]); }} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">{PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}</select></div>
                    <div><label className="text-[11px] text-zinc-500 mb-1 block">模型型号</label><select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">{cur.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
                    <div><label className="text-[11px] text-zinc-500 mb-1 block">API 密匙</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
                  </div>
                  <div>
                    <button onClick={() => setShowAdvanced((p) => !p)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                      <svg className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                      高级配置
                    </button>
                    {showAdvanced && <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} placeholder="System Prompt..." rows={3} className="mt-2 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none" />}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
                    <button onClick={handleAdd} disabled={!canSubmit} className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">添加模型</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
