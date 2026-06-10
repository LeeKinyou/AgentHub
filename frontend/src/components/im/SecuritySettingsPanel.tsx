'use client';

import { useState, useEffect } from 'react';

const SECURITY_KEY = 'agenthub_security_settings';

interface SecuritySettings {
  sessionTimeout: number;
  maxLoginAttempts: number;
  apiKeysEncrypted: boolean;
  enableAuditLog: boolean;
  allowedOrigins: string;
}

const defaults: SecuritySettings = {
  sessionTimeout: 60,
  maxLoginAttempts: 5,
  apiKeysEncrypted: true,
  enableAuditLog: true,
  allowedOrigins: '',
};

export function SecuritySettingsPanel() {
  const [settings, setSettings] = useState<SecuritySettings>(defaults);
  const [saved, setSaved] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SECURITY_KEY);
      if (raw) setSettings({ ...defaults, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem(SECURITY_KEY, JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const update = <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">API 密钥安全</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <div>
              <span className="text-sm text-minimal-text dark:text-minimal-dark-text">密钥加密存储</span>
              <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">使用 AES-256 加密存储所有 API 密钥</p>
            </div>
            <div className={`px-2 py-1 rounded text-[11px] ${settings.apiKeysEncrypted ? 'bg-minimal-success/10 text-minimal-success' : 'bg-minimal-error/10 text-minimal-error'}`}>
              {settings.apiKeysEncrypted ? '已启用' : '未启用'}
            </div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <div>
              <span className="text-sm text-minimal-text dark:text-minimal-dark-text">密钥显示保护</span>
              <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">编辑时默认隐藏密钥内容</p>
            </div>
            <button onClick={() => setShowApiKey(!showApiKey)} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${showApiKey ? 'bg-minimal-warning' : 'bg-minimal-border dark:bg-minimal-dark-border'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${showApiKey ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">会话安全</h3>
        <div className="space-y-2">
          <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-minimal-text dark:text-minimal-dark-text">会话超时时间</span>
              <span className="text-xs text-minimal-accent font-mono">{settings.sessionTimeout} 分钟</span>
            </div>
            <input type="range" min={5} max={480} step={5} value={settings.sessionTimeout} onChange={(e) => update('sessionTimeout', Number(e.target.value))} className="w-full h-1.5 bg-minimal-border dark:bg-minimal-dark-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-minimal-accent" />
            <div className="flex justify-between text-[10px] text-minimal-tertiary mt-1"><span>5 分钟</span><span>8 小时</span></div>
          </div>
          <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-minimal-text dark:text-minimal-dark-text">最大登录尝试次数</span>
              <span className="text-xs text-minimal-accent font-mono">{settings.maxLoginAttempts} 次</span>
            </div>
            <input type="range" min={3} max={10} step={1} value={settings.maxLoginAttempts} onChange={(e) => update('maxLoginAttempts', Number(e.target.value))} className="w-full h-1.5 bg-minimal-border dark:bg-minimal-dark-border rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-minimal-accent" />
            <div className="flex justify-between text-[10px] text-minimal-tertiary mt-1"><span>3 次</span><span>10 次</span></div>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">审计与日志</h3>
        <div className="flex justify-between items-center p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
          <div>
            <span className="text-sm text-minimal-text dark:text-minimal-dark-text">启用操作审计日志</span>
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-0.5">记录 Agent 调用、文件操作和 API 请求</p>
          </div>
          <button onClick={() => update('enableAuditLog', !settings.enableAuditLog)} className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${settings.enableAuditLog ? 'bg-minimal-accent' : 'bg-minimal-border dark:bg-minimal-dark-border'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${settings.enableAuditLog ? 'translate-x-5' : ''}`} />
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">访问控制</h3>
        <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
          <label className="text-sm text-minimal-text dark:text-minimal-dark-text mb-2 block">允许的来源 (CORS Origins)</label>
          <textarea value={settings.allowedOrigins} onChange={(e) => update('allowedOrigins', e.target.value)} placeholder="http://localhost:3000&#10;https://your-domain.com" rows={2} className="w-full px-3 py-2 bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-lg text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent resize-none font-mono transition-colors duration-300" />
          <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mt-1.5">每行一个来源，留空表示允许所有</p>
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={handleSave} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 ${saved ? 'bg-minimal-success text-white' : 'bg-minimal-accent hover:bg-minimal-accent-hover text-white'}`}>
          {saved ? '已保存' : '保存更改'}
        </button>
      </div>
    </div>
  );
}
