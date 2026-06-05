'use client';

import { useState } from 'react';

export interface VersionEntry {
  id: string;
  version: string;
  timestamp: string;
  author: string;
  message: string;
  changes: {
    additions: number;
    deletions: number;
  };
}

interface VersionHistoryProps {
  versions: VersionEntry[];
  currentVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
  onRevert?: (versionId: string) => void;
  onClose?: () => void;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString();
}

export function VersionHistory({ versions, currentVersionId, onSelectVersion, onRevert, onClose }: VersionHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentVersionId ?? null);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelectVersion?.(id);
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">📋 版本历史</span>
          <span className="text-xs text-zinc-500">{versions.length} 个版本</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {versions.map((version, idx) => (
          <div
            key={version.id}
            onClick={() => handleSelect(version.id)}
            className={`group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
              selectedId === version.id
                ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-indigo-500'
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent'
            } ${idx === 0 ? '' : 'border-t border-zinc-100 dark:border-zinc-800'}`}
          >
            <div className="flex flex-col items-center mt-1">
              <div className={`w-2 h-2 rounded-full ${selectedId === version.id ? 'bg-indigo-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              {idx < versions.length - 1 && <div className="w-0.5 h-full bg-zinc-200 dark:bg-zinc-700 mt-1" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-zinc-500">{version.version}</span>
                <span className="text-xs text-zinc-400">{formatTimestamp(version.timestamp)}</span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-0.5 truncate">{version.message}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-zinc-500">{version.author}</span>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-green-500">+{version.changes.additions}</span>
                  <span className="text-red-500">-{version.changes.deletions}</span>
                </div>
              </div>
            </div>
            {selectedId === version.id && onRevert && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRevert(version.id);
                }}
                className="px-2 py-1 text-xs bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                回退
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}