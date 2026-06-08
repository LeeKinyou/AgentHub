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

// 从本地消息记录中提取使用统计（模拟数据源）
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

  useEffect(() => {
    setStats(loadStats());
  }, []);

  const dates = getRecentDates(period);
  const periodRecords = stats.records.filter((r) => dates.includes(r.date));

  // 按日期聚合
  const dailyStats = dates.map((date) => {
    const dayRecords = periodRecords.filter((r) => r.date === date);
    return {
      date,
      inputTokens: dayRecords.reduce((s, r) => s + r.inputTokens, 0),
      outputTokens: dayRecords.reduce((s, r) => s + r.outputTokens, 0),
      cost: dayRecords.reduce((s, r) => s + r.cost, 0),
    };
  });

  // 按模型聚合
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
    <div className="flex flex-col gap-5 p-4">
      {/* 概览卡片 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
            <span>📊</span> 使用概览
          </h3>
          <div className="flex gap-1">
            {([7, 14, 30] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors ${period === p ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
              >
                {p}天
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <p className="text-[11px] text-zinc-500 mb-1">输入 Tokens</p>
            <p className="text-lg font-semibold text-blue-400 font-mono">{formatTokens(periodInput)}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <p className="text-[11px] text-zinc-500 mb-1">输出 Tokens</p>
            <p className="text-lg font-semibold text-emerald-400 font-mono">{formatTokens(periodOutput)}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-800">
            <p className="text-[11px] text-zinc-500 mb-1">预估费用</p>
            <p className="text-lg font-semibold text-amber-400 font-mono">{formatCost(periodCost)}</p>
          </div>
        </div>
      </section>

      {/* 每日用量柱状图 */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">每日用量</h3>
        <div className="flex items-end gap-1 h-24">
          {dailyStats.map((d) => {
            const total = d.inputTokens + d.outputTokens;
            const height = total > 0 ? Math.max(4, (total / maxTokens) * 100) : 0;
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${formatTokens(total)} tokens`}>
                <div className="w-full flex flex-col items-center justify-end" style={{ height: '80px' }}>
                  {total > 0 ? (
                    <>
                      <div className="w-full rounded-t" style={{ height: `${(d.outputTokens / maxTokens) * 80}px`, backgroundColor: 'rgb(52 211 153 / 0.6)' }} />
                      <div className="w-full rounded-b" style={{ height: `${(d.inputTokens / maxTokens) * 80}px`, backgroundColor: 'rgb(96 165 250 / 0.6)' }} />
                    </>
                  ) : (
                    <div className="w-full h-1 rounded bg-zinc-800" />
                  )}
                </div>
                <span className="text-[9px] text-zinc-600">{d.date.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 mt-2 justify-center">
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-blue-400/60" /> 输入
          </span>
          <span className="flex items-center gap-1 text-[10px] text-zinc-500">
            <span className="w-2 h-2 rounded-sm bg-emerald-400/60" /> 输出
          </span>
        </div>
      </section>

      {/* 模型用量明细 */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">模型用量明细</h3>
        {modelStats.size === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-xs">暂无用量数据，开始对话后将自动记录</div>
        ) : (
          <div className="space-y-2">
            {[...modelStats.entries()].sort((a, b) => b[1].cost - a[1].cost).map(([model, data]) => (
              <div key={model} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-800">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-zinc-200 font-mono">{model}</span>
                  <p className="text-[11px] text-zinc-500">{data.count} 次调用</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-zinc-300 font-mono">{formatTokens(data.inputTokens + data.outputTokens)} tokens</p>
                  <p className="text-[11px] text-amber-400 font-mono">{formatCost(data.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 参考价格 */}
      <section>
        <h3 className="text-sm font-semibold text-zinc-200 mb-3">参考价格 (每 1K tokens)</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(MODEL_COSTS).map(([model, cost]) => (
            <div key={model} className="p-2 rounded-lg bg-zinc-800/30 border border-zinc-800">
              <span className="text-[11px] text-zinc-400 font-mono">{model}</span>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] text-blue-400">入 ${cost.input}</span>
                <span className="text-[10px] text-emerald-400">出 ${cost.output}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 清除数据 */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (confirm('确认清除所有用量统计数据？')) {
              localStorage.removeItem(USAGE_KEY);
              setStats({ records: [], totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 });
            }
          }}
          className="px-3 py-1.5 text-xs text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          清除用量数据
        </button>
      </div>
    </div>
  );
}
