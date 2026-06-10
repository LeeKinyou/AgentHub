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
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) { const s = JSON.parse(raw) as Settings; setLanguage(s.language); setSendTrigger(s.sendTrigger); setIsCacheEnabled(s.isCacheEnabled); } } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ language, sendTrigger, isCacheEnabled }));
    window.dispatchEvent(new Event('agenthub-settings-changed'));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">界面语言</h3>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text focus:outline-none focus:border-minimal-accent transition-colors duration-300">
          <option value="zh-CN">简体中文</option>
          <option value="en-US">English</option>
        </select>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">发送快捷键</h3>
        <select value={sendTrigger} onChange={(e) => setSendTrigger(e.target.value)} className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text focus:outline-none focus:border-minimal-accent transition-colors duration-300">
          <option value="enter">Enter 发送，Shift+Enter 换行</option>
          <option value="ctrl-enter">Ctrl+Enter 发送，Enter 换行</option>
        </select>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">数据管理</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <div>
              <span className="text-sm text-minimal-text dark:text-minimal-dark-text">本地历史缓存</span>
              <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">使用 LocalStorage 保存对话记录</p>
            </div>
            <button onClick={() => setIsCacheEnabled(!isCacheEnabled)} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${isCacheEnabled ? 'bg-minimal-accent' : 'bg-minimal-border dark:bg-minimal-dark-border'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isCacheEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-error/20">
            <div>
              <span className="text-sm text-minimal-error">清除所有本地数据</span>
              <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">此操作不可撤销</p>
            </div>
            <button onClick={() => setShowResetConfirm(true)} className="px-3 py-1.5 text-xs text-minimal-error border border-minimal-error/30 rounded-lg hover:bg-minimal-error/5 transition-colors duration-300">重置</button>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={handleSave} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${saved ? 'bg-minimal-success text-white' : 'bg-minimal-accent hover:bg-minimal-accent-hover text-white'}`}>
          {saved ? '已保存' : '保存更改'}
        </button>
      </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}>
          <div className="bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-xl p-5 w-80 shadow-minimal-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-minimal-text dark:text-minimal-dark-text mb-5">确认清除所有本地缓存数据？此操作不可撤销。</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowResetConfirm(false)} className="px-3 py-1.5 text-sm text-minimal-secondary hover:text-minimal-text transition-colors duration-300">取消</button>
              <button onClick={handleReset} className="px-3 py-1.5 text-sm bg-minimal-error text-white rounded-lg hover:opacity-90 transition-opacity duration-300">确认重置</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
