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

const LOG_STYLES: Record<string, { text: string; badge: string; dot: string }> = {
  error: {
    text: 'text-red-600 dark:text-red-300',
    badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    dot: 'bg-red-400',
  },
  success: {
    text: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  warn: {
    text: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
  },
  info: {
    text: 'text-zinc-500 dark:text-zinc-400',
    badge: 'bg-zinc-200 dark:bg-zinc-700/50 text-zinc-500 border-zinc-300 dark:border-zinc-600/30',
    dot: 'bg-zinc-500',
  },
};

const TYPE_ICONS: Record<string, string> = {
  error: '✕',
  success: '✓',
  warn: '!',
  info: 'i',
};

function formatTime(ts: string | number): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function ConsolePanel({ isOpen, logs, onClear, onToggle }: ConsolePanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, isOpen]);

  const errorCount = logs.filter((l) => l.type === 'error').length;
  const warnCount = logs.filter((l) => l.type === 'warn').length;

  return (
    <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-950">
      {/* Terminal Title Bar */}
      <div onClick={onToggle}
        className="h-9 px-3 flex items-center justify-between cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/80 transition-colors select-none">
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-red-500/80 transition-colors" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-amber-500/80 transition-colors" />
            <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700 hover:bg-emerald-500/80 transition-colors" />
          </div>
          <svg className={`w-3 h-3 text-zinc-400 dark:text-zinc-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          <span className="text-[11px] font-mono text-zinc-500 tracking-wider">TERMINAL</span>
          <span className="min-w-[20px] h-[18px] flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700/50 text-[10px] text-zinc-500 px-1.5 font-mono">{logs.length}</span>
          {errorCount > 0 && (
            <span className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500/15 border border-red-500/20 text-[9px] text-red-500 dark:text-red-400 px-1 font-mono">{errorCount}</span>
          )}
          {warnCount > 0 && (
            <span className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/20 text-[9px] text-amber-500 dark:text-amber-400 px-1 font-mono">{warnCount}</span>
          )}
        </div>
        {isOpen && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="px-2 py-0.5 rounded text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors font-mono">clear</button>
          </div>
        )}
      </div>
      {/* Terminal Body */}
      <div className={`${isOpen ? 'h-72' : 'h-0'} overflow-hidden transition-all duration-200`}>
        <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {logs.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-zinc-300 dark:text-zinc-700 text-2xl block mb-2">{'>'}_</span>
                <span className="text-zinc-400 dark:text-zinc-700 font-mono text-xs">等待日志输出...</span>
              </div>
            </div>
          )}
          {logs.map((log, idx) => {
            const style = LOG_STYLES[log.type] ?? LOG_STYLES.info;
            return (
              <div key={log.id} className="group flex items-start gap-0 px-3 py-[3px] hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-900/50">
                {/* Line number */}
                <span className="w-8 shrink-0 text-right pr-3 text-zinc-300 dark:text-zinc-700 font-mono text-[10px] leading-[20px] select-none border-r border-zinc-200 dark:border-zinc-800/50 mr-3">{idx + 1}</span>
                {/* Timestamp */}
                <span className="w-[72px] shrink-0 text-zinc-400 dark:text-zinc-600 font-mono text-[10px] leading-[20px] mr-2">{formatTime(log.timestamp)}</span>
                {/* Type badge */}
                <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0 rounded border mr-2 mt-[2px] h-[16px] text-[9px] font-mono font-medium ${style.badge}`}>
                  <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                  {log.type === 'info' ? 'INFO' : log.type === 'warn' ? 'WARN' : log.type === 'error' ? 'ERR' : 'OK'}
                </span>
                {/* Source */}
                <span className="shrink-0 text-zinc-400 dark:text-zinc-600 font-mono text-[10px] leading-[20px] mr-2">[{log.source}]</span>
                {/* Message */}
                <span className={`font-mono text-[11px] leading-[20px] ${style.text} break-all`}>{log.message}</span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
