'use client';

import { useRef, useEffect, useState } from 'react';
import type { Message, AgentProfile, CodeBlock, Session } from '@agenthub/shared/types/entities';
import type { DiffLine } from '@/hooks/useEditorTabs';
import { ChatHeader } from './ChatHeader';
import { InputContextArea, type ContextItem } from './InputContextArea';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactPreview } from './ArtifactPreview';

interface StreamMessage extends Message { isStreaming?: boolean; }

interface ChatAreaProps {
  session: Session;
  messages: StreamMessage[];
  agents: AgentProfile[];
  isRightPanelOpen: boolean;
  activeTabId: string | null;
  onToggleRightPanel: () => void;
  onSend: (text: string) => void;
  onApplyDiff: (diffLines: DiffLine[]) => void;
}

const MOCK_CONTEXTS: ContextItem[] = [
  { id: 'ctx-1', type: 'agent', name: 'Codex' },
  { id: 'ctx-2', type: 'file', name: 'eval_llm.py' },
];

function parseHtmlBlock(content: string): string | null {
  const match = content.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function MessageBubble({ msg, agents, activeTabId, onApplyDiff }: { msg: StreamMessage; agents: AgentProfile[]; activeTabId: string | null; onApplyDiff: (diffLines: DiffLine[]) => void }) {
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
      { type: 'added', content: '      <p>AI-powered coding assistant</p>' },
      { type: 'added', content: '    </div>' },
      { type: 'normal', content: '  );' },
      { type: 'normal', content: '}' },
    ];
    onApplyDiff(mockDiff);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
        {isUser ? '👤' : agent?.avatar ?? '🤖'}
      </div>
      <div className={`max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-[11px] text-zinc-500 mb-1">{isUser ? '你' : agent?.name ?? 'AI'}</span>
        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-md'}`}>
          {textContent && <p className="whitespace-pre-wrap">{textContent}</p>}
          {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-0.5 align-text-bottom" />}
        </div>
        {htmlCode && (
          <div className="relative">
            <ArtifactPreview htmlCode={htmlCode} />
            {activeTabId && (
              <button onClick={handleApply} className="absolute top-3 right-3 px-2.5 py-1 text-[10px] rounded-md bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30 transition-colors z-10">
                ⚡ Apply to File
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatArea({ session, messages, agents, isRightPanelOpen, activeTabId, onToggleRightPanel, onSend, onApplyDiff }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeCode, setActiveCode] = useState<CodeBlock | null>(null);
  const [contextItems, setContextItems] = useState<ContextItem[]>(MOCK_CONTEXTS);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <main className="flex-1 flex flex-col min-w-0 bg-zinc-50 dark:bg-zinc-950">
      <ChatHeader title={session.title} sessionType={session.type} agents={agents} isRightPanelOpen={isRightPanelOpen} onToggleRightPanel={onToggleRightPanel} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} agents={agents} activeTabId={activeTabId} onApplyDiff={onApplyDiff} />
            ))}
            <div ref={bottomRef} />
          </div>
          <InputContextArea agents={agents} contextItems={contextItems} onRemoveContext={(id) => setContextItems((prev) => prev.filter((i) => i.id !== id))} onSend={onSend} />
        </div>
        <ArtifactPanel codeBlock={activeCode} onClose={() => setActiveCode(null)} />
      </div>
    </main>
  );
}