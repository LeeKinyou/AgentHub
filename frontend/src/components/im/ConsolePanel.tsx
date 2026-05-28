'use client';

import { useEffect, useRef } from 'react';

export interface LogItem {
  id: string;
  type: 'info' | 'warn' | 'error' | 'success';
  source: string;
  message: string;
  timestamp: string | number;
}

interface ConsolePanelProps {
  isOpen: boolean;
  logs: LogItem[];
  onClear: () => void;
  onClose: () => void;
}

const LOG_STYLES: Record<string, string> = {
  error: 'text-red-400 bg-red-950/20',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  info: 'text-zinc-400',
};

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function ConsoleHeader({ onClear, onClose }: { onClear: () => void; onClose: () => void }) {
  return (
    <div className="bg-zinc-100 dark:bg-zinc-900 border-t border-b border-zinc-200 dark:border-zinc-800 px-4 py-1.5 flex items-center justify-between text-xs">
      <span className="font-mono font-semibold text-zinc-600 dark:text-zinc-400 tracking-wider">TERMINAL LOGS</span>
      <div className="flex items-center gap-2">
        <button onClick={onClear} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors" title="清空日志">🧹 Clear</button>
        <button onClick={onClose} className="px-2 py-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors" title="关闭面板">❌ Close</button>
      </div>
    </div>
  );
}

export function ConsolePanel({ isOpen, logs, onClear, onClose }: ConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-[240px] shrink-0">
      <ConsoleHeader onClear={onClear} onClose={onClose} />
      <div className="bg-zinc-950 text-zinc-200 p-4 font-mono text-xs overflow-y-auto flex-1 flex flex-col gap-1">
        {logs.length === 0 && (
          <span className="text-zinc-600 italic">No logs recorded.</span>
        )}
        {logs.map((log) => (
          <div key={log.id} className={`px-2 py-0.5 rounded ${LOG_STYLES[log.type] ?? LOG_STYLES.info}`}>
            <span className="text-zinc-600 mr-2">{formatTime(log.timestamp)}</span>
            <span className="text-zinc-500 mr-1">[{log.source}]</span>
            <span>{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
