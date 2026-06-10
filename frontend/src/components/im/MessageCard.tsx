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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImageAttachment({ url, filename }: { url: string; filename: string }) {
  return (
    <div className="mt-2 max-w-xs">
      <img src={url} alt={filename} className="rounded-lg max-h-64 object-cover border border-minimal-border dark:border-minimal-dark-border" loading="lazy" />
      <p className="text-[10px] text-minimal-tertiary dark:text-minimal-dark-tertiary mt-1">{filename}</p>
    </div>
  );
}

function FileCard({ url, filename, size }: { url: string; filename: string; size: number }) {
  return (
    <a href={url} download={filename} className="mt-2 flex items-center gap-3 p-3 rounded-lg border border-minimal-border dark:border-minimal-dark-border bg-minimal-bg dark:bg-minimal-dark-bg hover:border-minimal-tertiary dark:hover:border-minimal-dark-tertiary transition-colors duration-200 max-w-xs">
      <div className="w-10 h-10 rounded bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border flex items-center justify-center shrink-0">
        <svg className="w-5 h-5 text-minimal-secondary dark:text-minimal-dark-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-minimal-text dark:text-minimal-dark-text truncate">{filename}</p>
        <p className="text-[10px] text-minimal-secondary dark:text-minimal-dark-secondary">{formatFileSize(size)}</p>
      </div>
      <svg className="w-4 h-4 text-minimal-tertiary dark:text-minimal-dark-tertiary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </a>
  );
}

export function MessageCard({ message, agents, onCodeBlockClick, onRegenerate }: MessageCardProps & { onRegenerate?: () => void }) {
  const isUser = message.senderType === 'user';
  const sender = isUser
    ? { name: '你', avatar: '👤' }
    : { name: agents.find((a) => a.id === message.senderId)?.name ?? 'Agent', avatar: agents.find((a) => a.id === message.senderId)?.avatar ?? '🤖' };
  const attachment = message.cardData?.fileAttachment;

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
        {message.contentType === 'image' && attachment && (
          <ImageAttachment url={attachment.url} filename={attachment.filename} />
        )}
        {message.contentType === 'file' && attachment && (
          <FileCard url={attachment.url} filename={attachment.filename} size={attachment.size} />
        )}
        {message.contentType === 'card' && message.cardData?.codeBlock && (
          <CodeBlockThumb message={message} onClick={() => onCodeBlockClick(message.cardData!.codeBlock!)} />
        )}
        {!isUser && onRegenerate && (
          <button onClick={onRegenerate} title="重新生成" className="mt-1 p-1 rounded-minimal text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-accent hover:bg-minimal-accent/5 transition-all duration-300 opacity-0 group-hover:opacity-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}
