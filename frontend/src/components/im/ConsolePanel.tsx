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
  onToggle: () => void;
}

const LOG_STYLES: Record<string, string> = {
  error: 'text-red-400',
  success: 'text-emerald-400',
  warn: 'text-amber-400',
  info: 'text-zinc-400',
};

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

export function ConsolePanel({ isOpen, logs, onClear, onToggle }: ConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isOpen]);

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-950">
      <div onClick={onToggle}
        className="h-9 px-4 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors select-none">
        <div className="flex items-center gap-2">
          <svg className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          <span className="text-xs font-mono text-zinc-400">控制台日志</span>
          <span className="min-w-[18px] h-4 flex items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-500 px-1">{logs.length}</span>
        </div>
        {isOpen && (
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors">清空</button>
        )}
      </div>
      <div className={`${isOpen ? 'h-72' : 'h-0'} overflow-hidden transition-all duration-200`}>
        <div className="h-72 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
          {logs.length === 0 && <span className="text-zinc-600 italic">No logs recorded.</span>}
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
    </div>
  );
}
