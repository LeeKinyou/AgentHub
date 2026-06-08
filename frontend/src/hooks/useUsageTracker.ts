'use client';

import { useCallback } from 'react';

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
  'custom-model': { input: 0.001, output: 0.003 },
};

function loadStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { records: [], totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 };
}

function saveStats(stats: UsageStats) {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
  } catch {}
}

export function useUsageTracker() {
  const recordUsage = useCallback((params: {
    agentId: string;
    agentName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
  }) => {
    const { agentId, agentName, model, inputTokens, outputTokens } = params;
    const costs = MODEL_COSTS[model] ?? MODEL_COSTS['custom-model'];
    const cost = (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;

    const stats = loadStats();
    const record: UsageRecord = {
      date: new Date().toISOString().slice(0, 10),
      agentId,
      agentName,
      model,
      inputTokens,
      outputTokens,
      cost,
    };

    stats.records.push(record);
    stats.totalInputTokens += inputTokens;
    stats.totalOutputTokens += outputTokens;
    stats.totalCost += cost;

    // 保留最近 90 天的记录
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    stats.records = stats.records.filter((r) => r.date >= cutoffStr);

    saveStats(stats);
  }, []);

  return { recordUsage };
}
