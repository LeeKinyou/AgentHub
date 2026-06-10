'use client';

import { useState, useEffect } from 'react';

const USAGE_KEY = 'agenthub_usage_stats';

interface UsageRecord {
  date: string;
  agentId: string;
  agentName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface UsageStats {
  records: UsageRecord[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'mimo-v2.5-pro': { input: 0.002, output: 0.006 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3.5-haiku': { input: 0.001, output: 0.005 },
  'deepseek-chat': { input: 0.0002, output: 0.001 },
  'deepseek-coder': { input: 0.0002, output: 0.001 },
};

function loadStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { records: [], totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatCost(n: number): string {
  return `$${n.toFixed(4)}`;
}

function getRecentDates(days: number): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export function UsageStatsPanel() {
  const [stats, setStats] = useState<UsageStats>(loadStats());
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const dates = getRecentDates(period);
  const periodRecords = stats.records.filter((r) => dates.includes(r.date));

  const dailyStats = dates.map((date) => {
    const dayRecords = periodRecords.filter((r) => r.date === date);
    return {
      date,
      inputTokens: dayRecords.reduce((s, r) => s + r.inputTokens, 0),
      outputTokens: dayRecords.reduce((s, r) => s + r.outputTokens, 0),
      cost: dayRecords.reduce((s, r) => s + r.cost, 0),
    };
  });

  const modelStats = new Map<string, { inputTokens: number; outputTokens: number; cost: number; count: number }>();
  periodRecords.forEach((r) => {
    const existing = modelStats.get(r.model) ?? { inputTokens: 0, outputTokens: 0, cost: 0, count: 0 };
    existing.inputTokens += r.inputTokens;
    existing.outputTokens += r.outputTokens;
    existing.cost += r.cost;
    existing.count += 1;
    modelStats.set(r.model, existing);
  });

  const maxTokens = Math.max(...dailyStats.map((d) => d.inputTokens + d.outputTokens), 1);

  const periodInput = periodRecords.reduce((s, r) => s + r.inputTokens, 0);
  const periodOutput = periodRecords.reduce((s, r) => s + r.outputTokens, 0);
  const periodCost = periodRecords.reduce((s, r) => s + r.cost, 0);

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text">使用概览</h3>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-2 py-0.5 text-[11px] rounded transition-colors duration-300 ${period === p ? 'bg-minimal-accent text-white' : 'bg-minimal-bg dark:bg-minimal-dark-bg text-minimal-secondary hover:text-minimal-text'}`}>{p}天</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1">输入 Tokens</p>
            <p className="text-lg font-medium text-minimal-accent font-mono">{formatTokens(periodInput)}</p>
          </div>
          <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1">输出 Tokens</p>
            <p className="text-lg font-medium text-minimal-success font-mono">{formatTokens(periodOutput)}</p>
          </div>
          <div className="p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1">预估费用</p>
            <p className="text-lg font-medium text-minimal-warning font-mono">{formatCost(periodCost)}</p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">每日用量</h3>
        <div className="flex items-end gap-1 h-24">
          {dailyStats.map((d) => {
            const total = d.inputTokens + d.outputTokens;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${formatTokens(total)} tokens`}>
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '80px' }}>
                  {total > 0 ? (
                    <>
                      <div className="w-full rounded-t" style={{ height: `${(d.outputTokens / maxTokens) * 80}px`, backgroundColor: 'rgb(52 199 89 / 0.4)' }} />
                      <div className="w-full rounded-b" style={{ height: `${(d.inputTokens / maxTokens) * 80}px`, backgroundColor: 'rgb(0 113 227 / 0.4)' }} />
                    </>
                  ) : (
                    <div className="w-full h-1 rounded bg-minimal-border dark:bg-minimal-dark-border" />
                  )}
                </div>
                <span className="text-[9px] text-minimal-tertiary">{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-minimal-secondary"><span className="w-2 h-2 rounded-sm bg-minimal-accent/40" /> 输入</span>
          <span className="flex items-center gap-1 text-[10px] text-minimal-secondary"><span className="w-2 h-2 rounded-sm bg-minimal-success/40" /> 输出</span>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">模型用量明细</h3>
        {modelStats.size === 0 ? (
          <div className="text-center py-6 text-minimal-tertiary text-xs">暂无用量数据，开始对话后将自动记录</div>
        ) : (
          <div className="space-y-2">
            {[...modelStats.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([model, data]) => (
              <div key={model} className="flex items-center gap-3 p-3 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-minimal-text dark:text-minimal-dark-text font-mono">{model}</span>
                  <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">{data.count} 次调用</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-minimal-text dark:text-minimal-dark-text font-mono">{formatTokens(data.inputTokens + data.outputTokens)} tokens</p>
                  <p className="text-[11px] text-minimal-warning font-mono">{formatCost(data.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mb-3">参考价格 (每 1K tokens)</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MODEL_COSTS).map(([model, cost]) => (
            <div key={model} className="p-2.5 rounded-xl bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border">
              <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono">{model}</span>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] text-minimal-accent">入 ${cost.input}</span>
                <span className="text-[10px] text-minimal-success">出 ${cost.output}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button onClick={() => setShowClearConfirm(true)} className="px-3 py-1.5 text-xs text-minimal-error border border-minimal-error/30 rounded-lg hover:bg-minimal-error/5 transition-colors duration-300">
          清除用量数据
        </button>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-xl p-5 w-80 shadow-minimal-md" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-minimal-text dark:text-minimal-dark-text mb-5">确认清除所有用量统计数据？</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-3 py-1.5 text-sm text-minimal-secondary hover:text-minimal-text transition-colors duration-300">取消</button>
              <button onClick={() => { localStorage.removeItem(USAGE_KEY); setStats({ records: [], totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 }); setShowClearConfirm(false); }} className="px-3 py-1.5 text-sm bg-minimal-error text-white rounded-lg hover:opacity-90 transition-opacity duration-300">确认清除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
