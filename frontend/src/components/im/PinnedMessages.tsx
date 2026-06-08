'use client';

import { useState } from 'react';
import type { Message } from '@agenthub/shared/types/entities';

interface PinnedMessagesProps {
  messages: Message[];
  onUnpin: (messageId: string) => void;
  onScrollTo?: (messageId: string) => void;
}

export function PinnedMessages({ messages, onUnpin, onScrollTo }: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (messages.length === 0) return null;

  return (
    <div className="border-b border-minimal-glass-border bg-minimal-glass/40 backdrop-blur-xl">
      <button
        onClick={() => setIsExpanded((p) => !p)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-minimal-border/50 transition-colors duration-300"
      >
        <div className="flex items-center gap-2">
          <span className="text-minimal-warning">📌</span>
          <span className="text-xs font-medium text-minimal-secondary">
            {messages.length} 条已固定消息
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-minimal-tertiary transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="group flex items-start gap-2 px-4 py-2 hover:bg-minimal-border/50 transition-colors duration-300"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-minimal-secondary truncate">
                  {msg.content.slice(0, 100)}{msg.content.length > 100 ? '...' : ''}
                </p>
                <span className="text-[10px] text-minimal-tertiary">
                  {msg.senderType === 'user' ? '用户' : 'Agent'} · {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">
                {onScrollTo && (
                  <button
                    onClick={() => onScrollTo(msg.id)}
                    className="p-1 rounded hover:bg-minimal-bg text-minimal-tertiary hover:text-minimal-text transition-colors duration-300"
                    title="跳转到消息"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => onUnpin(msg.id)}
                  className="p-1 rounded hover:bg-minimal-error/10 text-minimal-tertiary hover:text-minimal-error transition-colors duration-300"
                  title="取消固定"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
