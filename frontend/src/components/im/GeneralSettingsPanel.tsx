'use client';

import { useEffect, useState } from 'react';

const SETTINGS_KEY = 'agenthub_general_settings';
interface Settings { language: string; sendTrigger: string; isCacheEnabled: boolean; }
const defaults: Settings = { language: 'zh-CN', sendTrigger: 'enter', isCacheEnabled: true };

export function GeneralSettingsPanel() {
  const [language, setLanguage] = useState(defaults.language);
  const [sendTrigger, setSendTrigger] = useState(defaults.sendTrigger);
  const [isCacheEnabled, setIsCacheEnabled] = useState(defaults.isCacheEnabled);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) { const s = JSON.parse(raw) as Settings; setLanguage(s.language); setSendTrigger(s.sendTrigger); setIsCacheEnabled(s.isCacheEnabled); } } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language, sendTrigger, isCacheEnabled }));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };
  const handleReset = () => { if (!confirm('⚠️ 确认清除所有本地缓存数据？此操作不可撤销。')) return; localStorage.clear(); window.location.reload(); };

  return (
    <div className="flex flex-col gap-6 p-4">
      <div><h3 className="text-sm font-semibold text-zinc-200 mb-2">🌐 界面语言</h3><select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"><option value="zh-CN">简体中文 (Chinese)</option><option value="en-US">English (US)</option></select></div>
      <div><h3 className="text-sm font-semibold text-zinc-200 mb-2">⌨️ 发送快捷键</h3><select value={sendTrigger} onChange={(e) => setSendTrigger(e.target.value)} className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-indigo-500"><option value="enter">Enter 发送，Shift+Enter 换行</option><option value="ctrl-enter">Ctrl+Enter 发送，Enter 换行</option></select></div>
      <div>
        <h3 className="text-sm font-semibold text-zinc-200 mb-2">⚙️ 数据管理</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-sm text-zinc-300">开启本地历史缓存 (LocalStorage)</span><button onClick={() => setIsCacheEnabled(!isCacheEnabled)} className={`relative w-10 h-5 rounded-full transition-colors ${isCacheEnabled ? 'bg-indigo-600' : 'bg-zinc-700'}`}><span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCacheEnabled ? 'translate-x-5' : ''}`} /></button></div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-zinc-800/50 border border-zinc-800"><span className="text-sm text-red-400">💣 清除所有本地缓存数据 (危险操作)</span><button onClick={handleReset} className="px-3 py-1.5 text-xs text-red-400 border border-red-500/50 rounded-lg hover:bg-red-500/10 transition-colors">立即重置</button></div>
        </div>
      </div>
      <div className="flex justify-end"><button onClick={handleSave} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-emerald-600 text-white' : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'}`}>{saved ? '✓ 已保存' : '💾 保存更改'}</button></div>
    </div>
  );
}
