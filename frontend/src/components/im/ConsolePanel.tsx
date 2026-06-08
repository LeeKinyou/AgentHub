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
    text: 'text-minimal-error',
    badge: 'bg-minimal-error/10 text-minimal-error border-minimal-error/20',
    dot: 'bg-minimal-error',
  },
  success: {
    text: 'text-minimal-success',
    badge: 'bg-minimal-success/10 text-minimal-success border-minimal-success/20',
    dot: 'bg-minimal-success',
  },
  warn: {
    text: 'text-minimal-warning',
    badge: 'bg-minimal-warning/10 text-minimal-warning border-minimal-warning/20',
    dot: 'bg-minimal-warning',
  },
  info: {
    text: 'text-minimal-secondary',
    badge: 'bg-minimal-bg text-minimal-secondary border-minimal-border',
    dot: 'bg-minimal-secondary',
  },
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
    <div className="shrink-0 border-t border-minimal-glass-border dark:border-minimal-dark-glass-border bg-minimal-glass/40 dark:bg-minimal-dark-glass/40 backdrop-blur-xl">
      {/* Terminal Title Bar */}
      <div onClick={onToggle}
        className="h-9 px-3 flex items-center justify-between cursor-pointer hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-300 select-none">
        <div className="flex items-center gap-2.5">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-minimal-border dark:bg-minimal-dark-border hover:bg-minimal-error/80 transition-colors duration-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-minimal-border dark:bg-minimal-dark-border hover:bg-minimal-warning/80 transition-colors duration-300" />
            <span className="w-2.5 h-2.5 rounded-full bg-minimal-border dark:bg-minimal-dark-border hover:bg-minimal-success/80 transition-colors duration-300" />
          </div>
          <svg className={`w-3 h-3 text-minimal-tertiary dark:text-minimal-dark-tertiary transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          <span className="text-[11px] font-mono text-minimal-secondary dark:text-minimal-dark-secondary tracking-wider">TERMINAL</span>
          <span className="min-w-[20px] h-[18px] flex items-center justify-center rounded-full bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border text-[10px] text-minimal-secondary dark:text-minimal-dark-secondary px-1.5 font-mono">{logs.length}</span>
          {errorCount > 0 && (
            <span className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-minimal-error/10 border border-minimal-error/20 text-[9px] text-minimal-error px-1 font-mono">{errorCount}</span>
          )}
          {warnCount > 0 && (
            <span className="min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-minimal-warning/10 border border-minimal-warning/20 text-[9px] text-minimal-warning px-1 font-mono">{warnCount}</span>
          )}
        </div>
        {isOpen && (
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="px-2 py-0.5 rounded-minimal text-[10px] text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-minimal-border dark:hover:bg-minimal-dark-border transition-colors duration-300 font-mono">clear</button>
          </div>
        )}
      </div>
      {/* Terminal Body */}
      <div className={`${isOpen ? 'h-72' : 'h-0'} overflow-hidden transition-all duration-300`}>
        <div className="h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
          {logs.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-minimal-border dark:text-minimal-dark-border text-2xl block mb-2">{'>'}_</span>
                <span className="text-minimal-tertiary dark:text-minimal-dark-tertiary font-mono text-xs">等待日志输出...</span>
              </div>
            </div>
          )}
          {logs.map((log, idx) => {
            const style = LOG_STYLES[log.type] ?? LOG_STYLES.info;
            return (
              <div key={log.id} className="group flex items-start gap-0 px-3 py-[3px] hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-300 border-b border-minimal-bg dark:border-minimal-dark-bg">
                {/* Line number */}
                <span className="w-8 shrink-0 text-right pr-3 text-minimal-border dark:text-minimal-dark-border font-mono text-[10px] leading-[20px] select-none border-r border-minimal-border dark:border-minimal-dark-border mr-3">{idx + 1}</span>
                {/* Timestamp */}
                <span className="w-[72px] shrink-0 text-minimal-tertiary dark:text-minimal-dark-tertiary font-mono text-[10px] leading-[20px] mr-2">{formatTime(log.timestamp)}</span>
                {/* Type badge */}
                <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0 rounded border mr-2 mt-[2px] h-[16px] text-[9px] font-mono font-medium ${style.badge}`}>
                  <span className={`w-1 h-1 rounded-full ${style.dot}`} />
                  {log.type === 'info' ? 'INFO' : log.type === 'warn' ? 'WARN' : log.type === 'error' ? 'ERR' : 'OK'}
                </span>
                {/* Source */}
                <span className="shrink-0 text-minimal-tertiary dark:text-minimal-dark-tertiary font-mono text-[10px] leading-[20px] mr-2">[{log.source}]</span>
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
