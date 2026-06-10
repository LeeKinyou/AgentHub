'use client';

interface ProcessingStatus {
  status: 'idle' | 'sending' | 'processing' | 'streaming' | 'error' | 'stopped';
  agentId?: string;
  agentName?: string;
  displayText?: string;
  errorMessage?: string;
}

interface ProcessingIndicatorProps {
  status: ProcessingStatus;
  onStop?: () => void;
  onRetry?: () => void;
}

export function ProcessingIndicator({ status, onStop, onRetry }: ProcessingIndicatorProps) {
  if (status.status === 'idle') return null;

  return (
    <div className="flex items-center gap-2 px-1 py-1">
      {status.status === 'sending' && (
        <>
          <span className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-minimal-accent animate-typing-dot" style={{ animationDelay: '0ms' }} />
            <span className="w-1 h-1 rounded-full bg-minimal-accent animate-typing-dot" style={{ animationDelay: '200ms' }} />
            <span className="w-1 h-1 rounded-full bg-minimal-accent animate-typing-dot" style={{ animationDelay: '400ms' }} />
          </span>
          <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono">发送中...</span>
        </>
      )}
      {status.status === 'processing' && (
        <>
          <svg className="w-3 h-3 text-minimal-warning animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono">{status.displayText ?? '正在处理...'}</span>
          {onStop && (
            <button onClick={onStop} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-error bg-minimal-bg dark:bg-minimal-dark-bg hover:bg-minimal-error/5 rounded-minimal transition-colors duration-200" title="停止生成">
              <span className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                停止
              </span>
            </button>
          )}
        </>
      )}
      {status.status === 'streaming' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-minimal-success animate-pulse" />
          <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary font-mono">正在生成回复...</span>
          {onStop && (
            <button onClick={onStop} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-error bg-minimal-bg dark:bg-minimal-dark-bg hover:bg-minimal-error/5 rounded-minimal transition-colors duration-200" title="停止生成">
              <span className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                停止
              </span>
            </button>
          )}
        </>
      )}
      {status.status === 'stopped' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-minimal-warning" />
          <span className="text-[11px] text-minimal-warning font-mono">已中断生成</span>
          {onRetry && (
            <button onClick={onRetry} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-minimal-accent hover:text-minimal-accent-hover bg-minimal-accent/5 hover:bg-minimal-accent/10 rounded-minimal transition-colors duration-200" title="重新生成">
              <span className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                重新生成
              </span>
            </button>
          )}
        </>
      )}
      {status.status === 'error' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-minimal-error" />
          <span className="text-[11px] text-minimal-error font-mono">{status.errorMessage ?? '处理失败'}</span>
          {onRetry && (
            <button onClick={onRetry} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-minimal-accent hover:text-minimal-accent-hover bg-minimal-accent/5 hover:bg-minimal-accent/10 rounded-minimal transition-colors duration-200" title="重试">
              <span className="flex items-center gap-0.5">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                重试
              </span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
