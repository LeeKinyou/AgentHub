'use client';

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import type { Message, AgentProfile, CodeBlock, Session, FileAttachment as FileAttachmentType } from '@agenthub/shared/types/entities';
import type { DiffLine } from '@/hooks/useEditorTabs';
import type { FileNode } from './mockFiles';
import { ChatHeader } from './ChatHeader';
import { InputContextArea, type ContextItem } from './InputContextArea';
import { ArtifactPanel } from './ArtifactPanel';
import { ArtifactPreview } from './ArtifactPreview';
import { MarkdownRenderer } from './MarkdownRenderer';
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
  onStop?: () => void;
  onRetry?: () => void;
  replyToId?: string | null;
  onClearReply?: () => void;
  fileTree?: FileNode | null;
  processingStatus?: { status: 'idle' | 'sending' | 'processing' | 'streaming' | 'error' | 'stopped'; agentId?: string; agentName?: string; displayText?: string; errorMessage?: string };
}

function parseHtmlBlock(content: string): string | null {
  const match = content.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function parseContent(content: string): Array<{ type: 'text'; content: string } | { type: 'code'; language: string; code: string }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'code'; language: string; code: string }> = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'text', code: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.slice(lastIndex) });
  }
  return parts;
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return [...new Set(text.match(urlRegex) ?? [])];
}

function LinkPreviewCard({ url }: { url: string }) {
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors max-w-xs">
      <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs shrink-0">🔗</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-800 dark:text-zinc-200 truncate">{domain}</p>
        <p className="text-[10px] text-zinc-500 truncate">{url}</p>
      </div>
    </a>
  );
}

function MessageBubble({ msg, agents, activeTabId, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage }: { msg: StreamMessage; agents: AgentProfile[]; activeTabId: string | null; onApplyDiff: (diffLines: DiffLine[]) => void; onReply?: (messageId: string) => void; onQuote?: (messageId: string) => void; onRegenerate?: (messageId: string) => void; onPinMessage?: (messageId: string) => void }) {
  const isUser = msg.senderType === 'user';
  const agent = agents.find((a) => a.id === msg.senderId);
  const htmlCode = !isUser ? parseHtmlBlock(msg.content) : null;
  const textContent = htmlCode ? msg.content.replace(/```html\n[\s\S]*?```/, '').trim() : msg.content;
  const contentParts = !isUser && !htmlCode ? parseContent(textContent) : null;
  const urls = extractUrls(textContent);

  const handleApply = () => {
    const diffMatch = msg.content.match(/```diff\n([\s\S]*?)```/);
    const codeMatch = msg.content.match(/```(\w*)\n([\s\S]*?)```/);
    if (diffMatch) {
      const lines = diffMatch[1].split('\n').filter((l) => l.length > 0).map((line) => {
        if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'added' as const, content: line.slice(1) };
        if (line.startsWith('-') && !line.startsWith('---')) return { type: 'removed' as const, content: line.slice(1) };
        return { type: 'normal' as const, content: line.startsWith(' ') ? line.slice(1) : line };
      });
      onApplyDiff(lines);
    } else if (codeMatch) {
      onApplyDiff(codeMatch[2].split('\n').map((line) => ({ type: 'added' as const, content: line })));
    } else {
      onApplyDiff([{ type: 'added', content: msg.content }]);
    }
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
          {contentParts ? (
            <div className="space-y-2">
              {contentParts.map((part, i) => part.type === 'text' ? (
                <MarkdownRenderer key={i} content={part.content} />
              ) : (
                <div key={i} className="relative rounded-lg bg-zinc-900 dark:bg-zinc-950 border border-zinc-700 dark:border-zinc-600 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-1 bg-zinc-800 dark:bg-zinc-900 border-b border-zinc-700 dark:border-zinc-600">
                    <span className="text-[10px] text-zinc-400 font-mono">{part.language}</span>
                    <button onClick={() => navigator.clipboard.writeText(part.code)} className="px-2 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 rounded transition-colors">📋 复制代码</button>
                  </div>
                  <pre className="p-3 overflow-x-auto text-xs leading-relaxed"><code className="text-zinc-300 dark:text-zinc-200">{part.code}</code></pre>
                </div>
              ))}
            </div>
          ) : textContent && <MarkdownRenderer content={textContent} />}
          {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-zinc-400 dark:bg-zinc-500 animate-pulse ml-0.5 align-text-bottom" />}
        </div>
        {/* Action Toolbar - refined design */}
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0">
          <button onClick={handleCopy} title="复制" className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 transition-all duration-150">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
          </button>
          {onReply && (
            <button onClick={() => onReply(msg.id)} title="回复" className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 transition-all duration-150">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 18v-2a4 4 0 00-4-4H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {onQuote && (
            <button onClick={() => onQuote(msg.id)} title="引用" className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70 transition-all duration-150">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.193 0-2.31-.565-2.917-1.179zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.193 0-2.31-.565-2.917-1.179z"/></svg>
            </button>
          )}
          {onPinMessage && (
            <button onClick={() => onPinMessage(msg.id)} title={msg.isPinned ? '取消 Pin' : 'Pin 消息'} className={`p-1.5 rounded-md transition-all duration-150 ${msg.isPinned ? 'text-amber-500 hover:text-amber-600 bg-amber-500/10 hover:bg-amber-500/20' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70'}`}>
              <svg className="w-3.5 h-3.5" fill={msg.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C9.5 2 8 4 8 6c0 1.5.5 2.5 1.5 3.5L8 12l4 4 4-4-1.5-2.9c1-1 1.5-2 1.5-3.5 0-2-1.5-4-4-4zm0 0v5"/></svg>
            </button>
          )}
          {!isUser && onRegenerate && !msg.isStreaming && (
            <button onClick={() => onRegenerate(msg.id)} title="重新生成" className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-150">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          )}
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
        {urls.length > 0 && (
          <div className="mt-2 space-y-1">
            {urls.slice(0, 3).map((url) => <LinkPreviewCard key={url} url={url} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatArea({ session, messages, agents, isRightPanelOpen, activeTabId, contextItems, onContextItemsChange, onToggleRightPanel, onSend, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage, onStop, onRetry, replyToId, onClearReply, fileTree, processingStatus }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [activeCode, setActiveCode] = useState<CodeBlock | null>(null);

  const pinnedMessages = useMemo(() => 
    messages.filter((m) => m.isPinned).map((m) => ({
      ...m,
      contentType: m.contentType as 'text' | 'markdown' | 'card',
    })),
    [messages]
  );

  // Only auto-scroll when user is near the bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  }, []);

  // Find a file node by name in the file tree (recursive search)
  const findFileInTree = useCallback((tree: FileNode | undefined, fileName: string): FileNode | null => {
    if (!tree) return null;
    if (tree.type === 'file' && tree.name === fileName) return tree;
    if (tree.children) {
      for (const child of tree.children) {
        const found = findFileInTree(child, fileName);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Read file content from a FileSystemFileHandle
  const readFileContent = useCallback(async (handle: FileSystemFileHandle): Promise<string | null> => {
    try {
      const file = await handle.getFile();
      // Only read text files (skip binary files larger than 500KB)
      if (file.size > 500 * 1024) return `[文件过大: ${(file.size / 1024).toFixed(1)}KB，已跳过]`;
      const text = await file.text();
      return text;
    } catch {
      return null;
    }
  }, []);

  const handleDropFile = useCallback(async (fileName: string) => {
    if (contextItems.some((i) => i.type === 'file' && i.name === fileName)) return;
    // Try to read file content from the file tree
    let content: string | undefined;
    if (fileTree) {
      const node = findFileInTree(fileTree, fileName);
      if (node?.fileHandle) {
        content = await readFileContent(node.fileHandle) ?? undefined;
      }
    }
    onContextItemsChange([...contextItems, { id: `file-${crypto.randomUUID()}`, type: 'file', name: fileName, content }]);
  }, [contextItems, onContextItemsChange, fileTree, findFileInTree, readFileContent]);

  // Handle external file drops (from OS file manager)
  const handleDropExternalFiles = useCallback(async (files: FileList) => {
    const newItems: ContextItem[] = [];
    for (const file of Array.from(files)) {
      if (contextItems.some((i) => i.type === 'file' && i.name === file.name)) continue;
      let content: string | undefined;
      try {
        if (file.size <= 500 * 1024) {
          content = await file.text();
        } else {
          content = `[文件过大: ${(file.size / 1024).toFixed(1)}KB，已跳过]`;
        }
      } catch {
        // Binary file, skip content
      }
      newItems.push({ id: `file-${crypto.randomUUID()}`, type: 'file', name: file.name, content });
    }
    if (newItems.length > 0) {
      onContextItemsChange([...contextItems, ...newItems]);
    }
  }, [contextItems, onContextItemsChange]);

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
          <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
            {messages.map((msg) => <div key={msg.id} id={`msg-${msg.id}`}><MessageBubble msg={msg} agents={agents} activeTabId={activeTabId} onApplyDiff={onApplyDiff} onReply={onReply} onQuote={onQuote} onRegenerate={onRegenerate} onPinMessage={onPinMessage} /></div>)}
            {/* Agent Processing Status Indicator */}
            {processingStatus && processingStatus.status !== 'idle' && (
              <div className="flex items-center gap-2 px-1 py-1">
                {processingStatus.status === 'sending' && (
                  <>
                    <span className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">发送中...</span>
                  </>
                )}
                {processingStatus.status === 'processing' && (
                  <>
                    <svg className="w-3 h-3 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">{processingStatus.displayText ?? '正在处理...'}</span>
                    {onStop && (
                      <button onClick={onStop} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 hover:text-red-400 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="停止生成">
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                          停止
                        </span>
                      </button>
                    )}
                  </>
                )}
                {processingStatus.status === 'streaming' && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">正在生成回复...</span>
                    {onStop && (
                      <button onClick={onStop} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-zinc-500 hover:text-red-400 bg-zinc-200 dark:bg-zinc-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="停止生成">
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                          停止
                        </span>
                      </button>
                    )}
                  </>
                )}
                {processingStatus.status === 'stopped' && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-[11px] text-amber-500 dark:text-amber-400 font-mono">已中断生成</span>
                    {onRetry && (
                      <button onClick={onRetry} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-indigo-500 hover:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors" title="重新生成">
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          重新生成
                        </span>
                      </button>
                    )}
                  </>
                )}
                {processingStatus.status === 'error' && (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span className="text-[11px] text-red-400 dark:text-red-400 font-mono">{processingStatus.errorMessage ?? '处理失败'}</span>
                    {onRetry && (
                      <button onClick={onRetry} className="ml-1 px-1.5 py-0.5 text-[10px] font-mono text-indigo-500 hover:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded transition-colors" title="重试">
                        <span className="flex items-center gap-0.5">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          重试
                        </span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <InputContextArea agents={agents} contextItems={contextItems} onRemoveContext={handleRemoveContext} onSend={onSend} onDropFile={handleDropFile} onDropExternalFiles={handleDropExternalFiles} replyToId={replyToId} onClearReply={onClearReply} />
        </div>
        <ArtifactPanel codeBlock={activeCode} onClose={() => setActiveCode(null)} />
      </div>
    </main>
  );
}
