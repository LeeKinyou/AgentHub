'use client';

import { useState } from 'react';
import type { AgentProfileRead } from '@/lib/api';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-sonnet-4-20250514', 'claude-3.5-haiku', 'claude-3-opus'] },
  { value: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { value: 'ollama', label: 'Ollama', models: ['llama3.1', 'qwen2.5', 'codellama', 'mistral'] },
  { value: 'custom', label: 'Custom', models: ['custom-model'] },
];
const EMOJI_PICKER = ['🧠', '🔍', '🚀', '💻', '🐼', '🎯', '⚡', '🔧', '🎨', '🛡️', '📊', '🌐'];
const TOOLS = [
  { id: 'web_search', icon: '🌐', label: 'Web Search', desc: '允许该 Agent 联网检索实时资料' },
  { id: 'fs_io', icon: '📁', label: 'File System IO', desc: '允许该 Agent 物理读写本地代码库' },
  { id: 'terminal', icon: '🐚', label: 'Terminal Runner', desc: '允许该 Agent 在底部控制台执行脚本指令' },
];

interface Props {
  agents: AgentProfileRead[];
  onAdd: (data: { name: string; role: 'orchestrator' | 'expert'; adapterType?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onUpdate: (agentId: string, data: { name?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onDelete: (id: string) => Promise<boolean>;
}

export function AgentManagerPanel({ agents, onAdd, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [showAdv, setShowAdv] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emoji, setEmoji] = useState('🔧');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState(PROVIDERS[0].models[0]);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [tools, setTools] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit mode state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editProvider, setEditProvider] = useState('openai');
  const [editModel, setEditModel] = useState('');
  const [editApiKey, setEditApiKey] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editEmoji, setEditEmoji] = useState('🔧');
  const [editShowEmoji, setEditShowEmoji] = useState(false);
  const [editShowAdv, setEditShowAdv] = useState(false);
  const [editTools, setEditTools] = useState<string[]>([]);
  const [editLoading, setEditLoading] = useState(false);

  const cur = PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[0];
  const canSubmit = name.trim().length > 0 && apiKey.trim().length > 0;
  const toggleTool = (id: string) => setTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);
  const toggleEditTool = (id: string) => setEditTools((p) => p.includes(id) ? p.filter((t) => t !== id) : [...p, id]);

  // Resolve provider info from agent config
  const getProviderFromAgent = (a: AgentProfileRead): { provider: string; model: string; apiKey: string } => {
    const cfg = (a.agentConfig ?? {}) as Record<string, unknown>;
    const p = (cfg.api_provider as string) ?? 'openai';
    const m = (cfg.model as string) ?? '';
    const k = (cfg.api_key as string) ?? '';
    return { provider: p, model: m, apiKey: k };
  };

  const startEdit = (a: AgentProfileRead) => {
    const { provider: p, model: m, apiKey: k } = getProviderFromAgent(a);
    setEditingId(a.id);
    setEditName(a.name);
    setEditProvider(p);
    setEditModel(m);
    setEditApiKey(k);
    setEditPrompt(a.systemPrompt ?? '');
    setEditEmoji(a.avatar ?? '🔧');
    setEditShowAdv(false);
    setEditTools([]);
    setShowForm(false); // Close add form if open
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditApiKey('');
    setEditPrompt('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || editLoading) return;
    setEditLoading(true);
    try {
      await onUpdate(editingId, {
        name: editName.trim(),
        systemPrompt: editPrompt || undefined,
        agentConfig: {
          api_provider: editProvider,
          api_key: editApiKey,
          model: editModel,
          tools: editTools.map((t) => ({ id: t })),
        },
      });
      cancelEdit();
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    try {
      const result = await onAdd({
        name: name.trim(),
        role: 'expert',
        adapterType: provider,
        description: `${PROVIDERS.find((p) => p.value === provider)?.label ?? provider} · ${model}`,
        systemPrompt: prompt || undefined,
        agentConfig: {
          api_provider: provider,
          api_key: apiKey,
          model,
          tools: tools.map((t) => ({ id: t })),
        },
      });
      if (result) {
        setName(''); setApiKey(''); setPrompt(''); setTools([]); setEmoji('🔧'); setShowForm(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, agentName: string) => {
    if (confirm(`确认删除 "${agentName}"？`)) {
      await onDelete(id);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-zinc-200">已注册智能体</h3>
      <div className="space-y-2">
        {agents.map((a) => {
          const isEditing = editingId === a.id;
          const editCur = PROVIDERS.find((p) => p.value === editProvider) ?? PROVIDERS[0];

          if (isEditing) {
            return (
              <div key={a.id} className="p-3 rounded-lg border border-indigo-500/50 bg-zinc-900/80 space-y-3">
                <div className="grid grid-cols-[40px_1fr] gap-3 items-end">
                  <div className="relative">
                    <button onClick={() => setEditShowEmoji(!editShowEmoji)} className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer text-xl hover:border-zinc-500 transition-colors">{editEmoji}</button>
                    {editShowEmoji && <div className="absolute top-12 left-0 z-10 p-2 grid grid-cols-4 gap-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">{EMOJI_PICKER.map((e) => <button key={e} onClick={() => { setEditEmoji(e); setEditShowEmoji(false); }} className="w-8 h-8 rounded hover:bg-zinc-700 flex items-center justify-center text-base transition-colors">{e}</button>)}</div>}
                  </div>
                  <div><label className="text-[11px] text-zinc-500 mb-1 block">智能体名称</label><input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="text-[11px] text-zinc-500 mb-1 block">服务商</label><select value={editProvider} onChange={(e) => { setEditProvider(e.target.value); setEditModel(PROVIDERS.find((p) => p.value === e.target.value)?.models[0] ?? ''); }} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">{PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                  <div><label className="text-[11px] text-zinc-500 mb-1 block">型号</label><input value={editModel} onChange={(e) => setEditModel(e.target.value)} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
                  <div><label className="text-[11px] text-zinc-500 mb-1 block">API 密匙</label><input type="password" value={editApiKey} onChange={(e) => setEditApiKey(e.target.value)} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
                </div>
                <div>
                  <button onClick={() => setEditShowAdv(!editShowAdv)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
                    <svg className={`w-3 h-3 transition-transform ${editShowAdv ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    高级配置
                  </button>
                  {editShowAdv && (
                    <div className="mt-2 space-y-3">
                      <textarea value={editPrompt} onChange={(e) => setEditPrompt(e.target.value)} placeholder="System Prompt..." rows={3} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none" />
                      <div><h4 className="text-[11px] text-zinc-400 mb-2">🛠️ 赋予工具权限 (Capabilities)</h4>
                        <div className="grid grid-cols-3 gap-2">{TOOLS.map((t) => <button key={t.id} onClick={() => toggleEditTool(t.id)} className={`p-2 rounded-lg border text-left transition-colors ${editTools.includes(t.id) ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}><span className="text-base">{t.icon}</span><p className="text-[11px] text-zinc-300 mt-1">{t.label}</p></button>)}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
                  <button onClick={handleSaveEdit} disabled={!editName.trim() || editLoading} className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">{editLoading ? '保存中...' : '保存修改'}</button>
                </div>
              </div>
            );
          }

          return (
            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
              <span className="text-lg">{a.avatar ?? '🤖'}</span>
              <div className="flex-1 min-w-0"><span className="text-sm text-zinc-200">{a.name}</span><p className="text-[11px] text-zinc-500 truncate">{a.description}</p></div>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${a.role === 'orchestrator' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>{a.role}</span>
              <div className="flex gap-1 ml-1"><button onClick={() => startEdit(a)} className="opacity-60 hover:opacity-100 transition-opacity text-sm">✏️</button><button onClick={() => handleDelete(a.id, a.name)} className="opacity-60 hover:opacity-100 transition-opacity text-sm">🗑️</button></div>
            </div>
          );
        })}
      </div>
      {!showForm ? (
        <button onClick={() => { setShowForm(true); cancelEdit(); }} className="w-full py-2.5 rounded-lg border border-dashed border-zinc-700 text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-600 transition-colors">+ 添加自定义智能体</button>
      ) : (
        <div className="space-y-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/80">
          <div className="grid grid-cols-[40px_1fr] gap-3 items-end">
            <div className="relative"><button onClick={() => setShowEmoji(!showEmoji)} className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer text-xl hover:border-zinc-500 transition-colors">{emoji}</button>
              {showEmoji && <div className="absolute top-12 left-0 z-10 p-2 grid grid-cols-4 gap-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">{EMOJI_PICKER.map((e) => <button key={e} onClick={() => { setEmoji(e); setShowEmoji(false); }} className="w-8 h-8 rounded hover:bg-zinc-700 flex items-center justify-center text-base transition-colors">{e}</button>)}</div>}
            </div>
            <div><label className="text-[11px] text-zinc-500 mb-1 block">智能体名称</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Agent" className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-[11px] text-zinc-500 mb-1 block">服务商</label><select value={provider} onChange={(e) => { setProvider(e.target.value); setModel(PROVIDERS.find((p) => p.value === e.target.value)?.models[0] ?? ''); }} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">{PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            <div><label className="text-[11px] text-zinc-500 mb-1 block">型号</label><select value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500">{cur.models.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
            <div><label className="text-[11px] text-zinc-500 mb-1 block">API 密匙</label><input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500" /></div>
          </div>
          <div>
            <button onClick={() => setShowAdv(!showAdv)} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
              <svg className={`w-3 h-3 transition-transform ${showAdv ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              高级配置
            </button>
            {showAdv && (
              <div className="mt-2 space-y-3">
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="System Prompt..." rows={3} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none" />
                <div><h4 className="text-[11px] text-zinc-400 mb-2">🛠️ 赋予工具权限 (Capabilities)</h4>
                  <div className="grid grid-cols-3 gap-2">{TOOLS.map((t) => <button key={t.id} onClick={() => toggleTool(t.id)} className={`p-2 rounded-lg border text-left transition-colors ${tools.includes(t.id) ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'}`}><span className="text-base">{t.icon}</span><p className="text-[11px] text-zinc-300 mt-1">{t.label}</p></button>)}</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">取消</button>
            <button onClick={handleAdd} disabled={!canSubmit || isLoading} className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors">{isLoading ? '添加中...' : '添加模型'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
