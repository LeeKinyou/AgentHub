'use client';

import { useCallback, useRef } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import type { ContextItem } from '@/components/im/InputContextArea';
import type { MockMessage } from '@/mock/mockScripts';
import type { FileNode } from '@/components/im/mockFiles';
import type { LogItem } from '@/components/im/ConsolePanel';
import { stripFileOperations } from '@/hooks/useFileOperations';

const MAX_MESSAGES = 1000;

function buildFileTreeText(node: FileNode, prefix = '', isLast = true): string {
  const connector = isLast ? '└── ' : '├── ';
  const icon = node.type === 'dir' ? '📂 ' : '';
  let result = prefix + connector + icon + node.name + '\n';
  if (node.children) {
    const childPrefix = prefix + (isLast ? '    ' : '│   ');
    node.children.forEach((child, i) => {
      result += buildFileTreeText(child, childPrefix, i === node.children!.length - 1);
    });
  }
  return result;
}

interface UseChatActionsParams {
  activeSessionId: string | null;
  activeFileTree: FileNode | null;
  allMessages: MockMessage[];
  setAllMessages: React.Dispatch<React.SetStateAction<MockMessage[]>>;
  contextItems: ContextItem[];
  setContextItems: React.Dispatch<React.SetStateAction<ContextItem[]>>;
  allAgents: AgentProfile[];
  replyToId: string | null;
  setReplyToId: React.Dispatch<React.SetStateAction<string | null>>;
  wsSendMessage: (content: string, replyToId?: string, mentionedAgents?: string[]) => boolean;
  wsStopGeneration: () => boolean;
  setProcessingStatus: React.Dispatch<React.SetStateAction<{ status: 'idle' | 'sending' | 'processing' | 'streaming' | 'error' | 'stopped'; agentId?: string; agentName?: string; displayText?: string; errorMessage?: string }>>;
  updateSessionMeta: (sessionId: string, meta: Partial<{ lastMessagePreview: string }>) => void;
  addLog: (type: LogItem['type'], source: string, message: string) => void;
}

export function useChatActions(params: UseChatActionsParams) {
  const {
    activeSessionId, activeFileTree, allMessages, setAllMessages,
    contextItems, setContextItems, allAgents, replyToId, setReplyToId,
    wsSendMessage, wsStopGeneration, setProcessingStatus, updateSessionMeta, addLog,
  } = params;

  const lastUserMsgRef = useRef<string>('');

  const handleSend = useCallback((text: string) => {
    if (!activeSessionId) return;
    const sid = activeSessionId;
    let enrichedText = text;
    const fileItems = contextItems.filter((i) => i.type === 'file' && i.content);
    if (fileItems.length > 0) {
      const fileBlocks = fileItems.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
      enrichedText = `以下是用户附加的文件上下文：\n\n${fileBlocks}\n\n---\n\n用户消息：${text}`;
    }
    if (activeFileTree) {
      const treeText = buildFileTreeText(activeFileTree);
      enrichedText = `当前项目文件结构：\n${treeText}\n\n${enrichedText}`;
    }
    const pinnedMsgs = allMessages.filter((m) => m.sessionId === sid && m.isPinned);
    if (pinnedMsgs.length > 0) {
      const pinnedText = pinnedMsgs.map((m) => { const sender = m.senderType === 'user' ? '用户' : 'Agent'; return `[${sender}]: ${m.content.slice(0, 200)}`; }).join('\n');
      enrichedText = `以下是用户标记的重要上下文（Pinned Messages）：\n${pinnedText}\n\n---\n\n${enrichedText}`;
    }
    const firstFile = fileItems[0];
    const userMsg: MockMessage = { id: crypto.randomUUID(), sessionId: sid, senderType: 'user', senderId: 'user-001', content: text, contentType: 'text', createdAt: new Date().toISOString(), cardData: firstFile ? { fileAttachment: { url: '', filename: firstFile.name, size: firstFile.content?.length ?? 0, mimeType: 'text/plain' } } : undefined };
    setAllMessages((prev) => { const next = [...prev, userMsg]; return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next; });
    addLog('info', 'Chat', `User: ${text.slice(0, 50)}`);
    updateSessionMeta(sid, { lastMessagePreview: text.slice(0, 50) });
    lastUserMsgRef.current = text;
    const mentionedAgentIds = contextItems.filter((i) => i.type === 'agent').map((i) => i.id);
    const sent = wsSendMessage(enrichedText, replyToId ?? undefined, mentionedAgentIds.length > 0 ? mentionedAgentIds : undefined);
    if (!sent) { addLog('error', 'WebSocket', '消息发送失败：WebSocket 未连接，请稍后重试'); setProcessingStatus({ status: 'error', errorMessage: 'WebSocket 未连接' }); }
    else { setProcessingStatus({ status: 'sending' }); }
    setContextItems((prev) => prev.filter((i) => i.type !== 'file'));
    setReplyToId(null);
  }, [activeSessionId, activeFileTree, allMessages, contextItems, replyToId, wsSendMessage, setAllMessages, setContextItems, setReplyToId, setProcessingStatus, updateSessionMeta, addLog]);

  const handleReply = useCallback((messageId: string) => { setReplyToId(messageId); }, [setReplyToId]);

  const handleQuote = useCallback((messageId: string) => {
    const msg = allMessages.find((m) => m.id === messageId);
    if (msg) { const quoteText = `> ${msg.content.split('\n').slice(0, 3).join('\n> ')}\n\n`; setContextItems((prev) => [...prev, { id: `quote-${crypto.randomUUID()}`, type: 'snippet', name: quoteText }]); }
  }, [allMessages, setContextItems]);

  const handleRegenerate = useCallback((messageId: string) => {
    const msg = allMessages.find((m) => m.id === messageId);
    if (!msg || msg.senderType !== 'agent') return;
    const sessionMsgs = allMessages.filter((m) => m.sessionId === msg.sessionId);
    const msgIndex = sessionMsgs.findIndex((m) => m.id === messageId);
    const lastUserMsg = [...sessionMsgs].slice(0, msgIndex).reverse().find((m) => m.senderType === 'user');
    if (!lastUserMsg) { addLog('warn', 'Chat', '无法找到对应的用户消息进行重新生成'); return; }
    setAllMessages((prev) => prev.filter((m) => m.id !== messageId));
    addLog('info', 'Chat', `重新生成消息 ${messageId.slice(0, 8)}`);
    const sent = wsSendMessage(lastUserMsg.content);
    if (!sent) addLog('error', 'WebSocket', '重新生成失败：WebSocket 未连接');
  }, [allMessages, wsSendMessage, setAllMessages, addLog]);

  const handleStopGeneration = useCallback(() => {
    wsStopGeneration();
    setProcessingStatus({ status: 'stopped' });
    addLog('warn', 'Chat', '已中断 Agent 生成');
  }, [wsStopGeneration, setProcessingStatus, addLog]);

  const handleRetryLastMessage = useCallback(() => {
    if (!lastUserMsgRef.current) return;
    addLog('info', 'Chat', '重新发送消息...');
    handleSend(lastUserMsgRef.current);
  }, [handleSend, addLog]);

  const handlePinMessage = useCallback((messageId: string) => {
    setAllMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m));
  }, [setAllMessages]);

  const handleClearReply = useCallback(() => { setReplyToId(null); }, [setReplyToId]);

  const handleFileUploaded = useCallback((file: { url: string; filename: string; size: number; mimeType: string }) => {
    setContextItems((prev) => [...prev, { id: `upload-${crypto.randomUUID()}`, type: 'file', name: file.filename, content: `[附件: ${file.filename}]` }]);
  }, [setContextItems]);

  return {
    handleSend, handleReply, handleQuote, handleRegenerate,
    handleStopGeneration, handleRetryLastMessage,
    handlePinMessage, handleClearReply, handleFileUploaded,
  };
}
