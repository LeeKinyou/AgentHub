'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import type { Message, AgentProfile, CodeBlock, Session, FileAttachment as FileAttachmentType } from '@agenthub/shared/types/entities';
import type { DiffLine } from '@/hooks/useEditorTabs';
import { ChatHeader } from './ChatHeader';
import { InputContextArea, type ContextItem } from './InputContextArea';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactPreview } from './ArtifactPreview';
import { InlineDiffCard } from './InlineDiffCard';
import { DeployStatusCard } from './DeployStatusCard';
import { PinnedMessages } from './PinnedMessages';
import { FileAttachment } from './FileAttachment';
import { OrchestratorStatusCard, type OrchestratorStatus, type TaskStep } from './OrchestratorStatusCard';
import { AgentStatusCard, type AgentExecutionStatus } from './AgentStatusCard';

interface StreamMessage extends Omit<Message, 'contentType'> {
  isStreaming?: boolean;
  deployStatus?: 'building' | 'deploying' | 'success';
  contentType: Message['contentType'] | 'diff_patch' | 'deploy_status' | 'orchestrator_status' | 'agent_status';
  orchestratorData?: {
    status: OrchestratorStatus;
    steps?: TaskStep[];
    currentStep?: number;
  };
  agentStatusData?: {
    agentId: string;
    status: AgentExecutionStatus;
    displayText?: string;
    progress?: number;
  };
}

interface ChatAreaProps {
  session: Session;
  messages: StreamMessage[];
  agents: AgentProfile[];
  isRightPanelOpen: boolean;
  activeTabId: string | null;
  contextItems: ContextItem[];
  onContextItemsChange: (items: ContextItem[]) => void;
  onToggleRightPanel: () => void;
  onSend: (text: string) => void;
  onApplyDiff: (diffLines: DiffLine[]) => void;
  onReply?: (messageId: string) => void;
  onQuote?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
  replyToId?: string | null;
  onClearReply?: () => void;
}

function parseHtmlBlock(content: string): string | null {
  const match = content.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function MessageBubble({ msg, agents, activeTabId, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage }: { msg: StreamMessage; agents: AgentProfile[]; activeTabId: string | null; onApplyDiff: (diffLines: DiffLine[]) => void; onReply?: (messageId: string) => void; onQuote?: (messageId: string) => void; onRegenerate?: (messageId: string) => void; onPinMessage?: (messageId: string) => void }) {
  const isUser = msg.senderType === 'user';
  const agent = agents.find((a) => a.id === msg.senderId);
  const htmlCode = !isUser ? parseHtmlBlock(msg.content) : null;
  const textContent = htmlCode ? msg.content.replace(/```html\n[\s\S]*?```/, '').trim() : msg.content;

  const handleApply = () => {
    const mockDiff: DiffLine[] = [
      { type: 'normal', content: 'import React from "react";' },
      { type: 'normal', content: '' },
      { type: 'removed', content: 'export function App() {' },
      { type: 'added', content: 'export function EnhancedApp() {' },
      { type: 'normal', content: '  return (' },
      { type: 'removed', content: '    <div>Hello</div>' },
      { type: 'added', content: '    <div className="app">' },
      { type: 'added', content: '      <h1>Welcome to AgentHub</h1>' },
      { type: 'added', content: '    </div>' },
      { type: 'normal', content: '  );' },
      { type: 'normal', content: '}' },
    ];
    onApplyDiff(mockDiff);
  };

  const handleCopy = () => navigator.clipboard.writeText(msg.content);

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
        {isUser ? '👤' : agent?.avatar ?? '🤖'}
      </div>
      <div className={`max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-[11px] text-zinc-500 mb-1">{isUser ? '你' : agent?.name ?? 'AI'}</span>
        <div className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-md'}`}>
          {msg.replyToId && (
            <div className="mb-2 px-2 py-1 bg-zinc-200/50 dark:bg-zinc-700/50 rounded text-[11px] text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-400 dark:border-zinc-600">
              回复消息...
            </div>
          )}
          {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
          {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-0.5 align-text-bottom" />}
          <div className="absolute -bottom-8 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleCopy} className="px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">📋 复制</button>
            {onReply && (
              <button onClick={() => onReply(msg.id)} className="px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">↩️ 回复</button>
            )}
            {onQuote && (
              <button onClick={() => onQuote(msg.id)} className="px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">💬 引用</button>
            )}
            {onPinMessage && (
              <button onClick={() => onPinMessage(msg.id)} className={`px-2 py-0.5 rounded text-[10px] ${msg.isPinned ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'} hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors`}>📌 {msg.isPinned ? '已Pin' : 'Pin'}</button>
            )}
            {!isUser && onRegenerate && !msg.isStreaming && (
              <button onClick={() => onRegenerate(msg.id)} className="px-2 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors">🔄 重新生成</button>
            )}
          </div>
        </div>
        {htmlCode && (
          <div className="relative mt-2">
            <ArtifactPreview htmlCode={htmlCode} />
            {activeTabId && (
              <button onClick={handleApply} className="absolute top-3 right-3 px-2.5 py-1 text-[10px] rounded-md bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30 transition-colors z-10">
                ⚡ Apply to File
              </button>
            )}
          </div>
        )}
        {msg.contentType === 'diff_patch' && (
          <div className="mt-2"><InlineDiffCard patchContent={msg.content} onApply={handleApply} /></div>
        )}
        {msg.contentType === 'deploy_status' && msg.deployStatus && (
          <div className="mt-2"><DeployStatusCard status={msg.deployStatus} url={msg.deployStatus === 'success' ? 'https://agenthub-demo.vercel.app' : undefined} /></div>
        )}
        {msg.contentType === 'orchestrator_status' && msg.orchestratorData && (
          <div className="mt-2">
            <OrchestratorStatusCard
              status={msg.orchestratorData.status}
              steps={msg.orchestratorData.steps}
              currentStep={msg.orchestratorData.currentStep}
            />
          </div>
        )}
        {msg.contentType === 'agent_status' && msg.agentStatusData && (
          <div className="mt-2">
            <AgentStatusCard
              agent={agents.find((a) => a.id === msg.agentStatusData?.agentId) ?? { id: msg.agentStatusData.agentId, name: 'Agent', role: 'expert', status: 'online' }}
              status={msg.agentStatusData.status}
              displayText={msg.agentStatusData.displayText}
              progress={msg.agentStatusData.progress}
            />
          </div>
        )}
        {msg.cardData?.attachments && msg.cardData.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {msg.cardData.attachments.map((attachment) => (
              <FileAttachment
                key={attachment.id}
                attachment={attachment}
                onDownload={(a) => console.log('Download:', a.name)}
                onPreview={(a) => console.log('Preview:', a.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatArea({ session, messages, agents, isRightPanelOpen, activeTabId, contextItems, onContextItemsChange, onToggleRightPanel, onSend, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage, replyToId, onClearReply }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeCode, setActiveCode] = useState<CodeBlock | null>(null);

  const pinnedMessages = useMemo(() => 
    messages.filter((m) => m.isPinned).map((m) => ({
      ...m,
      contentType: m.contentType as 'text' | 'markdown' | 'card',
    })),
    [messages]
  );

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleDropFile = (fileName: string) => {
    if (contextItems.some((i) => i.type === 'file' && i.name === fileName)) return;
    onContextItemsChange([...contextItems, { id: `file-${crypto.randomUUID()}`, type: 'file', name: fileName }]);
  };

  const handleRemoveContext = (id: string) => {
    onContextItemsChange(contextItems.filter((i) => i.id !== id));
  };

  const handleScrollToMessage = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
      <ChatHeader title={session.title} sessionType={session.type} agents={agents} isRightPanelOpen={isRightPanelOpen} onToggleRightPanel={onToggleRightPanel} />
      <PinnedMessages messages={pinnedMessages} onUnpin={(id) => onPinMessage?.(id)} onScrollTo={handleScrollToMessage} />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
            {messages.map((msg) => <div key={msg.id} id={`msg-${msg.id}`}><MessageBubble msg={msg} agents={agents} activeTabId={activeTabId} onApplyDiff={onApplyDiff} onReply={onReply} onQuote={onQuote} onRegenerate={onRegenerate} onPinMessage={onPinMessage} /></div>)}
            <div ref={bottomRef} />
          </div>
          <InputContextArea agents={agents} contextItems={contextItems} onRemoveContext={handleRemoveContext} onSend={onSend} onDropFile={handleDropFile} replyToId={replyToId} onClearReply={onClearReply} />
        </div>
        <ArtifactPanel codeBlock={activeCode} onClose={() => setActiveCode(null)} />
      </div>
    </main>
  );
}
