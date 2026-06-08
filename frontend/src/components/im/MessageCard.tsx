'use client';

import type { Message, AgentProfile, CodeBlock } from '@agenthub/shared/types/entities';

interface MessageCardProps {
  message: Message;
  agents: AgentProfile[];
  onCodeBlockClick: (codeBlock: CodeBlock) => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CodeBlockThumb({ message, onClick }: { message: Message; onClick: () => void }) {
  const codeBlock = message.cardData?.codeBlock;
  if (!codeBlock) return null;
  return (
    <button
      onClick={onClick}
      className="mt-2 w-full max-w-xs p-3 rounded-minimal border border-minimal-border dark:border-minimal-dark-border bg-minimal-bg dark:bg-minimal-dark-bg hover:border-minimal-tertiary dark:hover:border-minimal-dark-tertiary transition-all duration-300 text-left group"
    >
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-minimal-secondary group-hover:text-minimal-accent transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span className="text-xs font-medium text-minimal-text dark:text-minimal-dark-text">{codeBlock.title}</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-minimal-border dark:bg-minimal-dark-border text-minimal-secondary dark:text-minimal-dark-secondary rounded-minimal ml-auto">{codeBlock.language}</span>
      </div>
      <p className="text-[11px] text-minimal-tertiary dark:text-minimal-dark-tertiary truncate">点击查看完整代码 · {codeBlock.code.split('\n').length} 行</p>
    </button>
  );
}

export function MessageCard({ message, agents, onCodeBlockClick }: MessageCardProps) {
  const isUser = message.senderType === 'user';
  const sender = isUser
    ? { name: '你', avatar: '👤' }
    : { name: agents.find((a) => a.id === message.senderId)?.name ?? 'Agent', avatar: agents.find((a) => a.id === message.senderId)?.avatar ?? '🤖' };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 rounded-full bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border flex items-center justify-center text-sm shrink-0">
        {sender.avatar}
      </div>
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary">{sender.name}</span>
          <span className="text-[10px] text-minimal-tertiary dark:text-minimal-dark-tertiary">{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={`px-3 py-2 rounded-minimal text-sm ${
            isUser ? 'bg-minimal-accent text-white' : 'bg-white/80 dark:bg-minimal-dark-surface/80 backdrop-blur-sm border border-minimal-glass-border dark:border-minimal-dark-border text-minimal-text dark:text-minimal-dark-text shadow-minimal-glow'
          }`}
        >
          {message.content}
        </div>
        {message.contentType === 'card' && message.cardData?.codeBlock && (
          <CodeBlockThumb
            message={message}
            onClick={() => onCodeBlockClick(message.cardData!.codeBlock!)}
          />
        )}
      </div>
    </div>
  );
}
