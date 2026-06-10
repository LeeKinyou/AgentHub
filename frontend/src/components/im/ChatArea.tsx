'use client';

import { useRef, useEffect, useMemo, useCallback } from 'react';
import type { Message, AgentProfile, CodeBlock, Session } from '@agenthub/shared/types/entities';
import type { DiffLine } from '@/hooks/useEditorTabs';
import type { FileNode } from './mockFiles';
import { ChatHeader } from './ChatHeader';
import { InputContextArea, type ContextItem } from './InputContextArea';
import { ArtifactPanel } from './ArtifactPanel';
import { PinnedMessages } from './PinnedMessages';
import { MessageBubble } from './MessageBubble';
import { ProcessingIndicator } from './ProcessingIndicator';
import { OrchestratorStatusCard, type OrchestratorStatus, type TaskStep } from './OrchestratorStatusCard';
import { AgentStatusCard, type AgentExecutionStatus } from './AgentStatusCard';

export interface StreamMessage extends Omit<Message, 'contentType'> {
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
  onFileUploaded?: (file: { url: string; filename: string; size: number; mimeType: string }) => void;
}

export function ChatArea({ session, messages, agents, isRightPanelOpen, activeTabId, contextItems, onContextItemsChange, onToggleRightPanel, onSend, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage, onStop, onRetry, replyToId, onClearReply, fileTree, processingStatus, onFileUploaded }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const pinnedMessages = useMemo(() =>
    messages.filter((m) => m.isPinned).map((m) => ({
      ...m,
      contentType: m.contentType as 'text' | 'markdown' | 'card',
    })),
    [messages]
  );

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

  const readFileContent = useCallback(async (handle: FileSystemFileHandle): Promise<string | null> => {
    try {
      const file = await handle.getFile();
      if (file.size > 500 * 1024) return `[文件过大: ${(file.size / 1024).toFixed(1)}KB，已跳过]`;
      const text = await file.text();
      return text;
    } catch {
      return null;
    }
  }, []);

  const handleDropFile = useCallback(async (fileName: string) => {
    if (contextItems.some((i) => i.type === 'file' && i.name === fileName)) return;
    let content: string | undefined;
    if (fileTree) {
      const node = findFileInTree(fileTree, fileName);
      if (node?.fileHandle) {
        content = await readFileContent(node.fileHandle) ?? undefined;
      }
    }
    onContextItemsChange([...contextItems, { id: `file-${crypto.randomUUID()}`, type: 'file', name: fileName, content }]);
  }, [contextItems, onContextItemsChange, fileTree, findFileInTree, readFileContent]);

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
    <main className="flex-1 flex flex-col min-w-0 bg-minimal-bg dark:bg-minimal-dark-bg">
      <ChatHeader title={session.title} sessionType={session.type} agents={agents} isRightPanelOpen={isRightPanelOpen} onToggleRightPanel={onToggleRightPanel} />
      <PinnedMessages messages={pinnedMessages} onUnpin={(id) => onPinMessage?.(id)} onScrollTo={handleScrollToMessage} />
      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={scrollContainerRef} onScroll={handleScroll} data-testid="message-list" className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700">
            {messages.map((msg) => <div key={msg.id} id={`msg-${msg.id}`} className="animate-fade-in"><MessageBubble msg={msg} agents={agents} activeTabId={activeTabId} onApplyDiff={onApplyDiff} onReply={onReply} onQuote={onQuote} onRegenerate={onRegenerate} onPinMessage={onPinMessage} /></div>)}
            {processingStatus && <ProcessingIndicator status={processingStatus} onStop={onStop} onRetry={onRetry} />}
            <div ref={bottomRef} />
          </div>
          <InputContextArea agents={agents} contextItems={contextItems} onRemoveContext={handleRemoveContext} onSend={onSend} onDropFile={handleDropFile} onDropExternalFiles={handleDropExternalFiles} onFileUploaded={onFileUploaded} replyToId={replyToId} onClearReply={onClearReply} />
        </div>
        <ArtifactPanel codeBlock={null} onClose={() => {}} />
      </div>
    </main>
  );
}
