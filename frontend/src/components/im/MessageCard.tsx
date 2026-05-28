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
      className="mt-2 w-full max-w-xs p-3 rounded-lg border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all text-left group"
    >
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        <span className="text-xs font-medium text-zinc-300">{codeBlock.title}</span>
        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded ml-auto">{codeBlock.language}</span>
      </div>
      <p className="text-[11px] text-zinc-500 truncate">点击查看完整代码 · {codeBlock.code.split('\n').length} 行</p>
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
      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm shrink-0">
        {sender.avatar}
      </div>
      <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-zinc-500">{sender.name}</span>
          <span className="text-[10px] text-zinc-600">{formatTime(message.createdAt)}</span>
        </div>
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            isUser ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-300'
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
