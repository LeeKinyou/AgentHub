'use client';

import { useState } from 'react';
import type { AgentProfileRead } from '@/lib/api';

const PROVIDERS = [
  { value: 'openai', label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'o1-preview'] },
  { value: 'anthropic', label: 'Anthropic', baseUrl: 'https://api.anthropic.com', models: ['claude-sonnet-4-20250514', 'claude-3.5-haiku', 'claude-3-opus'] },
  { value: 'deepseek', label: 'DeepSeek', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'] },
  { value: 'ollama', label: 'Ollama', baseUrl: 'http://localhost:11434/v1', models: ['llama3.1', 'qwen2.5', 'codellama', 'mistral'] },
  { value: 'custom', label: 'Custom (OpenAI 兼容)', baseUrl: '', models: [] },
];

const TOOLS = [
  { id: 'web_search', label: 'Web Search', desc: '允许联网检索实时资料' },
  { id: 'fs_io', label: 'File System', desc: '允许读写本地代码库' },
  { id: 'terminal', label: 'Terminal', desc: '允许在控制台执行脚本' },
];

interface Props {
  agents: AgentProfileRead[];
  onAdd: (data: { name: string; role: 'orchestrator' | 'expert'; adapterType?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onUpdate: (agentId: string, data: { name?: string; description?: string; systemPrompt?: string; agentConfig?: Record<string, unknown> }) => Promise<AgentProfileRead | null>;
  onDelete: (id: string) => Promise<boolean>;
}

interface FormData {
  name: string;
  description: string;
  provider: string;
  baseUrl: string;
  model: string;
  customModelName: string;
  apiKey: string;
  prompt: string;
  tools: string[];
}

const emptyForm: FormData = { name: '', description: '', provider: 'openai', baseUrl: PROVIDERS[0].baseUrl, model: PROVIDERS[0].models[0], customModelName: '', apiKey: '', prompt: '', tools: [] };

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-xl p-5 w-80 shadow-minimal-md" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-minimal-text dark:text-minimal-dark-text mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-minimal-secondary hover:text-minimal-text transition-colors duration-300">取消</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-sm bg-minimal-error text-white rounded-lg hover:opacity-90 transition-opacity duration-300">删除</button>
        </div>
      </div>
    </div>
  );
}

function AgentForm({ form, setForm, onSave, onCancel, isLoading, submitLabel }: {
  form: FormData;
  setForm: (f: FormData) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  submitLabel: string;
}) {
  const [showAdv, setShowAdv] = useState(false);
  const cur = PROVIDERS.find((p) => p.value === form.provider) ?? PROVIDERS[0];
  const effectiveModel = form.customModelName.trim() || form.model;
  const canSubmit = form.name.trim().length > 0 && form.apiKey.trim().length > 0 && effectiveModel.length > 0 && form.baseUrl.trim().length > 0;

  const update = (patch: Partial<FormData>) => setForm({ ...form, ...patch });
  const toggleTool = (id: string) => update({ tools: form.tools.includes(id) ? form.tools.filter((t) => t !== id) : [...form.tools, id] });

  return (
    <div className="space-y-4 p-4 rounded-xl border border-minimal-accent/20 bg-white dark:bg-minimal-dark-surface">
      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">名称</label>
          <input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="My Agent" data-testid="agent-name-input" className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
        </div>
        <div>
          <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">描述</label>
          <input value={form.description} onChange={(e) => update({ description: e.target.value })} placeholder="该智能体的职责说明" data-testid="agent-description-input" className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">服务商</label>
            <select value={form.provider} onChange={(e) => { const p = PROVIDERS.find((p) => p.value === e.target.value) ?? PROVIDERS[0]; update({ provider: e.target.value, baseUrl: p.baseUrl, model: p.models[0] ?? '', customModelName: '' }); }} className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text focus:outline-none focus:border-minimal-accent transition-colors duration-300">
              {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">API Key</label>
            <input type="password" value={form.apiKey} onChange={(e) => update({ apiKey: e.target.value })} placeholder="sk-..." data-testid="agent-apikey-input" className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">API Base URL</label>
          <input value={form.baseUrl} onChange={(e) => update({ baseUrl: e.target.value })} placeholder="https://api.openai.com/v1" data-testid="agent-baseurl-input" className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300 font-mono text-xs" />
        </div>
        <div>
          <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">模型</label>
          {cur.models.length > 0 ? (
            <div className="flex gap-2">
              <select value={form.model} onChange={(e) => update({ model: e.target.value })} className="flex-1 px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text focus:outline-none focus:border-minimal-accent transition-colors duration-300">
                {cur.models.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input value={form.customModelName} onChange={(e) => update({ customModelName: e.target.value })} placeholder="或输入自定义模型名" data-testid="agent-custom-model-input" className="flex-1 px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
            </div>
          ) : (
            <input value={form.customModelName} onChange={(e) => update({ customModelName: e.target.value })} placeholder="输入模型名称，如 qwen3.5-9b" data-testid="agent-custom-model-input" className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
          )}
        </div>
      </div>
      <div>
        <button onClick={() => setShowAdv(!showAdv)} className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300 flex items-center gap-1">
          <svg className={`w-3 h-3 transition-transform duration-300 ${showAdv ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          高级配置
        </button>
        {showAdv && (
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5 block">System Prompt</label>
              <textarea value={form.prompt} onChange={(e) => update({ prompt: e.target.value })} placeholder="定义该智能体的行为指令..." rows={3} className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent resize-none transition-colors duration-300" />
            </div>
            <div>
              <label className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-2 block">工具权限</label>
              <div className="grid grid-cols-3 gap-2">
                {TOOLS.map((t) => (
                  <button key={t.id} onClick={() => toggleTool(t.id)} className={`p-2.5 rounded-lg border text-left transition-colors duration-300 ${form.tools.includes(t.id) ? 'border-minimal-accent bg-minimal-accent/5 dark:bg-minimal-accent/10' : 'border-minimal-border dark:border-minimal-dark-border hover:border-minimal-tertiary'}`}>
                    <p className="text-xs text-minimal-text dark:text-minimal-dark-text font-medium">{t.label}</p>
                    <p className="text-[10px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-minimal-secondary hover:text-minimal-text transition-colors duration-300">取消</button>
        <button onClick={onSave} disabled={!canSubmit || isLoading} data-testid="agent-save-button" className="px-4 py-1.5 text-sm bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border disabled:text-minimal-tertiary text-white rounded-lg transition-colors duration-300">{isLoading ? '保存中...' : submitLabel}</button>
      </div>
    </div>
  );
}

export function AgentManagerPanel({ agents, onAdd, onUpdate, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
  const [isLoading, setIsLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormData>({ ...emptyForm });
  const [editLoading, setEditLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const startEdit = (a: AgentProfileRead) => {
    const cfg = (a.agentConfig ?? {}) as Record<string, unknown>;
    const prov = (cfg.api_provider as string) ?? 'openai';
    const provDef = PROVIDERS.find((p) => p.value === prov);
    const model = (cfg.model as string) ?? '';
    const isPredefinedModel = provDef?.models.includes(model) ?? false;
    setEditingId(a.id);
    setEditForm({
      name: a.name,
      description: a.description ?? '',
      provider: prov,
      baseUrl: (cfg.base_url as string) ?? provDef?.baseUrl ?? '',
      model: isPredefinedModel ? model : (provDef?.models[0] ?? ''),
      customModelName: isPredefinedModel ? '' : model,
      apiKey: (cfg.api_key as string) ?? '',
      prompt: a.systemPrompt ?? '',
      tools: [],
    });
    setShowForm(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ ...emptyForm });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name.trim() || editLoading) return;
    setEditLoading(true);
    const effectiveModel = editForm.customModelName.trim() || editForm.model;
    try {
      await onUpdate(editingId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        systemPrompt: editForm.prompt || undefined,
        agentConfig: { api_provider: editForm.provider, base_url: editForm.baseUrl, api_key: editForm.apiKey, model: effectiveModel, tools: editForm.tools.map((t) => ({ id: t })) },
      });
      cancelEdit();
    } finally {
      setEditLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.apiKey.trim() || isLoading) return;
    setIsLoading(true);
    const effectiveModel = form.customModelName.trim() || form.model;
    try {
      const result = await onAdd({
        name: form.name.trim(),
        role: 'expert',
        adapterType: 'custom',
        description: form.description.trim() || `${PROVIDERS.find((p) => p.value === form.provider)?.label ?? form.provider} · ${effectiveModel}`,
        systemPrompt: form.prompt || undefined,
        agentConfig: { api_provider: form.provider, base_url: form.baseUrl, api_key: form.apiKey, model: effectiveModel, tools: form.tools.map((t) => ({ id: t })) },
      });
      if (result) {
        setForm({ ...emptyForm });
        setShowForm(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await onDelete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-minimal-success';
      case 'busy': return 'bg-minimal-warning';
      case 'error': return 'bg-minimal-error';
      default: return 'bg-minimal-tertiary';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text">已注册智能体</h3>
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">{agents.length} 个</span>
      </div>

      <div className="space-y-2">
        {agents.map((a) => {
          if (editingId === a.id) {
            return <AgentForm key={a.id} form={editForm} setForm={setEditForm} onSave={handleSaveEdit} onCancel={cancelEdit} isLoading={editLoading} submitLabel="保存修改" />;
          }

          return (
            <div key={a.id} className="group flex items-center gap-3 p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border hover:border-minimal-tertiary dark:hover:border-minimal-dark-tertiary transition-colors duration-300">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border flex items-center justify-center text-base">{a.avatar ?? '🤖'}</div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-minimal-bg dark:border-minimal-dark-bg ${getStatusColor(a.status)}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-minimal-text dark:text-minimal-dark-text font-medium">{a.name}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${a.role === 'orchestrator' ? 'bg-minimal-accent/10 text-minimal-accent' : 'bg-minimal-success/10 text-minimal-success'}`}>
                    {a.role === 'orchestrator' ? '编排器' : '专家'}
                  </span>
                </div>
                <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary truncate mt-0.5">{a.description || '—'}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button onClick={() => startEdit(a)} className="p-1.5 rounded hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg text-minimal-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setDeleteTarget({ id: a.id, name: a.name })} className="p-1.5 rounded hover:bg-minimal-error/10 text-minimal-tertiary hover:text-minimal-error transition-colors duration-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {!showForm ? (
        <button onClick={() => { setShowForm(true); cancelEdit(); }} data-testid="add-agent-button" className="w-full py-3 rounded-xl border border-dashed border-minimal-border dark:border-minimal-dark-border text-sm text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:border-minimal-tertiary dark:hover:border-minimal-dark-tertiary transition-colors duration-300 flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          添加智能体
        </button>
      ) : (
        <AgentForm form={form} setForm={setForm} onSave={handleAdd} onCancel={() => { setShowForm(false); setForm({ ...emptyForm }); }} isLoading={isLoading} submitLabel="添加" />
      )}

      {deleteTarget && <ConfirmDialog message={`确认删除「${deleteTarget.name}」？此操作不可撤销。`} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
