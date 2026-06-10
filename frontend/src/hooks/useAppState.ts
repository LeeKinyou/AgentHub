'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import type { LogItem } from '@/components/im/ConsolePanel';
import type { FileNode } from '@/components/im/mockFiles';
import type { ContextItem } from '@/components/im/InputContextArea';
import type { FileOperation } from '@/components/im/FileOperationDialog';
import type { MockMessage } from '@/mock/mockScripts';
import type { EditorTab } from '@/hooks/useEditorTabs';
import { writeFileAtPath, deleteFileAtPath, traverseDirectory } from '@/components/im/fileSystemUtils';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useTheme } from '@/hooks/useTheme';
import { useProjectState } from '@/hooks/useProjectState';
import { useAuth } from '@/hooks/useAuth';
import { useBackendData } from '@/hooks/useBackendData';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUsageTracker } from '@/hooks/useUsageTracker';
import { useFileOperations, stripFileOperations } from '@/hooks/useFileOperations';
import { useUIStore } from '@/stores/useUIStore';
import { useChatStore } from '@/stores/useChatStore';
import { useEditorStore } from '@/stores/useEditorStore';

const INITIAL_LOGS: LogItem[] = [
  { id: '1', type: 'success', source: 'System', message: 'Web Access Token Initialized.', timestamp: new Date().toISOString() },
  { id: '2', type: 'info', source: 'Agent', message: 'Orchestrator is standing by.', timestamp: new Date().toISOString() },
  { id: '3', type: 'warn', source: 'Runtime', message: 'Telemetry pipeline idle — no active sessions.', timestamp: new Date().toISOString() },
];

const MAX_MESSAGES = 1000;
const MAX_LOGS = 200;

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

export function useAppState() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const backendData = useBackendData();
  const { theme, setTheme } = useTheme();
  const state = useProjectState();
  const ui = useUIStore();
  const chatStore = useChatStore();
  const editorStore = useEditorStore();
  const [allMessages, setAllMessages] = useState<MockMessage[]>([]);
  const [isSingleChat, setIsSingleChat] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentProfile[]>([]);
  const [processingStatus, setProcessingStatus] = useState<{ status: 'idle' | 'sending' | 'processing' | 'streaming' | 'error' | 'stopped'; agentId?: string; agentName?: string; displayText?: string; errorMessage?: string }>({ status: 'idle' });
  const [agentStatuses, setAgentStatuses] = useState<Record<string, string>>({});
  const lastUserMsgRef = useRef<string>('');
  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [contextWidth, setContextWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(320);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgRef = useRef<string | null>(null);
  const currentAgentRef = useRef<string | null>(null);
  const clearPendingRef = useRef<(() => void) | null>(null);
  const { activeProjectTabs, openTab, closeTab, setActiveTabId, updateTabContent, pinTab, setTabClean, injectDiff, applyDiff, rejectDiff } = useEditorTabs();
  const { recordUsage } = useUsageTracker();
  const { pendingOps, showDialog, autoApprove, requestFileOperations, approveOperations, rejectOperations, setAutoApprove, setOnApproved } = useFileOperations();

  // Sync messages to Zustand chat store
  useEffect(() => {
    if (state.activeSessionId) {
      chatStore.clearSessionMessages(state.activeSessionId);
      allMessages
        .filter((m) => m.sessionId === state.activeSessionId)
        .forEach((m) => chatStore.addMessage(state.activeSessionId!, { ...m, isStreaming: m.isStreaming ?? false }));
    }
  }, [allMessages, state.activeSessionId]);

  const addLog = useCallback((type: LogItem['type'], source: string, message: string) => {
    setLogs((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), type, source, message, timestamp: new Date().toISOString() }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  const handleChunk = useCallback((chunk: { messageId: string; sessionId: string; agentId: string; chunkType: string; deltaContent: string; isFinal: boolean }) => {
    if (chunk.chunkType === 'text') {
      const msgId = chunk.messageId;
      if (chunk.isFinal) {
        streamingMsgRef.current = null;
        currentAgentRef.current = null;
        setProcessingStatus((prev) => prev.status === 'error' ? prev : { status: 'idle' });
        setAllMessages((prev) => {
          let updated = prev.map((m) => m.sessionId === chunk.sessionId && m.isStreaming ? { ...m, isStreaming: false } : m);
          if (chunk.deltaContent) {
            const existingIdx = updated.findIndex((m) => m.id === msgId);
            if (existingIdx >= 0) {
              updated = updated.map((m) => m.id === msgId ? { ...m, content: m.content + stripFileOperations(chunk.deltaContent) } : m);
            } else {
              const newMsg: MockMessage = { id: msgId, sessionId: chunk.sessionId, senderType: 'agent', senderId: chunk.agentId, content: stripFileOperations(chunk.deltaContent), contentType: 'text', createdAt: new Date().toISOString(), isStreaming: false };
              updated = [...updated, newMsg];
            }
          }
          const lastAgentMsg = [...updated].reverse().find((m) => m.sessionId === chunk.sessionId && m.senderType === 'agent');
          if (lastAgentMsg) state.updateSessionMeta(chunk.sessionId, { lastMessagePreview: lastAgentMsg.content.slice(0, 50) });
          return updated;
        });
        return;
      }
      const isAgentSwitch = currentAgentRef.current !== null && currentAgentRef.current !== chunk.agentId;
      currentAgentRef.current = chunk.agentId;
      const effectiveMsgId = isAgentSwitch ? `${msgId}-${chunk.agentId}` : msgId;
      setAllMessages((prev) => {
        const existing = prev.find((m) => m.id === effectiveMsgId);
        if (existing) {
          const rawContent = existing.content + chunk.deltaContent;
          return prev.map((m) => m.id === effectiveMsgId ? { ...m, content: stripFileOperations(rawContent), isStreaming: true } : m);
        }
        streamingMsgRef.current = effectiveMsgId;
        const agent = allAgents.find((a) => a.id === chunk.agentId);
        setProcessingStatus({ status: 'streaming', agentId: chunk.agentId, agentName: agent?.name });
        const cleanDelta = stripFileOperations(chunk.deltaContent);
        const newMsg: MockMessage = { id: effectiveMsgId, sessionId: chunk.sessionId, senderType: 'agent', senderId: chunk.agentId, content: cleanDelta, contentType: 'text', createdAt: new Date().toISOString(), isStreaming: true };
        const next = [...prev, newMsg];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    }
    if (chunk.chunkType === 'tool_status') {
      try {
        const toolInfo = JSON.parse(chunk.deltaContent);
        const status = toolInfo.done ? (toolInfo.isError ? 'failed' : 'completed') : 'running';
        addLog('info', 'Tool', `${toolInfo.tool}: ${status}`);
      } catch { addLog('info', 'Tool', chunk.deltaContent); }
    }
  }, [state.updateSessionMeta, addLog, allAgents]);

  const handleMessageComplete = useCallback((msg: { id: string; sessionId: string; senderType: string; senderId: string; content: string; contentType: string; cardData?: unknown; createdAt: string }) => {
    setAllMessages((prev) => prev.map((m) => m.sessionId === msg.sessionId && m.isStreaming ? { ...m, isStreaming: false } : m));
    streamingMsgRef.current = null;
    currentAgentRef.current = null;
    setProcessingStatus({ status: 'idle' });
    clearPendingRef.current?.();
    if (msg.senderType === 'agent' && msg.content) {
      const agent = allAgents.find((a) => a.id === msg.senderId);
      const estimatedTokens = Math.ceil(msg.content.length / 3);
      recordUsage({ agentId: msg.senderId, agentName: agent?.name ?? 'Agent', model: 'mimo-v2.5-pro', inputTokens: Math.ceil(estimatedTokens * 0.3), outputTokens: estimatedTokens });
      requestFileOperations(msg.content);
      const cleanContent = stripFileOperations(msg.content);
      if (cleanContent !== msg.content) {
        setAllMessages((prev) => prev.map((m) => m.sessionId === msg.sessionId && m.senderType === 'agent' ? { ...m, content: cleanContent } : m));
      }
    }
  }, [allAgents, recordUsage, requestFileOperations]);

  const handleAgentStatus = useCallback((status: { sessionId: string; agentId: string; status: string; displayText: string }) => {
    addLog('info', 'Agent', `[${status.agentId}] ${status.displayText}`);
    const agent = allAgents.find((a) => a.id === status.agentId);
    const mappedStatus = status.status === 'executing' || status.status === 'analyzing' ? 'working' : status.status === 'completed' ? 'done' : status.status === 'failed' ? 'error' : 'idle';
    setAgentStatuses((prev) => ({ ...prev, [status.agentId]: mappedStatus }));
    if (status.status === 'executing' || status.status === 'planning') {
      setProcessingStatus({ status: 'processing', agentId: status.agentId, agentName: agent?.name, displayText: status.displayText });
    } else if (status.status === 'completed') {
      setProcessingStatus((prev) => prev.status !== 'error' ? { status: 'idle' } : prev);
    } else if (status.status === 'failed') {
      setProcessingStatus({ status: 'error', agentId: status.agentId, agentName: agent?.name, errorMessage: status.displayText });
    }
  }, [addLog, allAgents]);

  const handleError = useCallback((error: { sessionId: string; errorCode: string; errorMessage: string }) => {
    addLog('error', 'WebSocket', error.errorMessage);
    setProcessingStatus({ status: 'error', errorMessage: error.errorMessage });
  }, [addLog]);

  const activeBackendSessionId = state.activeSessionId ?? null;
  const { sendMessage: wsSendMessage, clearPending, stopGeneration: wsStopGeneration } = useWebSocket({
    sessionId: activeBackendSessionId,
    onChunk: handleChunk,
    onMessageComplete: handleMessageComplete,
    onAgentStatus: handleAgentStatus,
    onError: handleError,
    onLog: addLog,
  });
  clearPendingRef.current = clearPending;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const mapped: AgentProfile[] = backendData.agents.map((a) => ({ id: a.id, name: a.name, avatar: a.avatar ?? '🤖', role: a.role, description: a.description ?? '' }));
    setAllAgents(mapped);
  }, [backendData.agents]);

  const currentTabs = activeProjectTabs(state.activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;

  // Sync editor tabs to Zustand editor store
  useEffect(() => {
    if (state.activeProjectId) {
      const { tabs, activeTabId } = currentTabs;
      tabs.forEach((tab) => editorStore.openTab(state.activeProjectId!, tab));
      if (activeTabId) editorStore.setActiveTabId(state.activeProjectId!, activeTabId);
    }
  }, [currentTabs, state.activeProjectId]);

  const backendSessionMessages = state.activeSessionId ? (backendData.messages[state.activeSessionId] ?? []) : [];
  const localSessionMessages = state.activeSessionId ? allMessages.filter((m) => m.sessionId === state.activeSessionId) : [];
  const activeMessages = (() => {
    if (localSessionMessages.length === 0) {
      return backendSessionMessages.map((m) => ({ id: m.id, sessionId: m.sessionId, senderType: m.senderType, senderId: m.senderId, content: m.content, contentType: m.contentType as MockMessage['contentType'], cardData: m.cardData as MockMessage['cardData'], createdAt: m.createdAt }));
    }
    if (backendSessionMessages.length === 0) return localSessionMessages;
    const localIds = new Set(localSessionMessages.map((m) => m.id));
    const dedupedBackend = backendSessionMessages.filter((m) => !localIds.has(m.id)).map((m) => ({ id: m.id, sessionId: m.sessionId, senderType: m.senderType, senderId: m.senderId, content: m.content, contentType: m.contentType as MockMessage['contentType'], cardData: m.cardData as MockMessage['cardData'], createdAt: m.createdAt }));
    return [...dedupedBackend, ...localSessionMessages];
  })();

  const mergedSessions = (() => {
    const localSessions = state.activeProject?.sessions ?? [];
    const localIds = new Set(localSessions.map((s) => s.id));
    const backendOnlySessions = backendData.sessions.filter((s) => !localIds.has(s.id)).map((s) => ({ id: s.id, title: s.title, type: s.type, agentIds: s.agentIds, isPinned: s.isPinned, isArchived: s.isArchived, lastActiveAt: s.updatedAt, lastMessagePreview: s.lastMessagePreview ?? undefined, createdAt: s.createdAt }));
    return [...localSessions, ...backendOnlySessions];
  })();

  const activeSession = state.activeSessionId ? (mergedSessions.find((s) => s.id === state.activeSessionId) ?? null) : null;
  const activeAgents = activeSession ? allAgents.filter((a) => activeSession.agentIds.includes(a.id)) : [];

  const resizeRef = useRef<{ type: 'context' | 'editor'; startX: number; startW: number } | null>(null);
  const handleResizeStart = useCallback((type: 'context' | 'editor') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startW = type === 'context' ? contextWidth : editorWidth;
    resizeRef.current = { type, startX: e.clientX, startW };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      if (resizeRef.current.type === 'context') setContextWidth(Math.min(450, Math.max(200, resizeRef.current.startW + delta)));
      else setEditorWidth(Math.min(600, Math.max(240, resizeRef.current.startW - delta)));
    };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  }, [contextWidth, editorWidth]);

  useEffect(() => () => { if (streamTimerRef.current) clearInterval(streamTimerRef.current); }, []);

  useEffect(() => {
    setContextItems([]);
    if (state.activeSessionId) {
      addLog('info', 'Session', `Switched to session ${state.activeSessionId}`);
      backendData.fetchMessages(state.activeSessionId);
    }
  }, [state.activeSessionId]);

  const handleOpenFileTransient = async (name: string, handle: FileSystemFileHandle) => {
    if (!state.activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(state.activeProjectId, name, handle, true); ui.setRightPanelOpen(true); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  };

  const handleOpenFile = async (name: string, handle: FileSystemFileHandle) => {
    if (!state.activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(state.activeProjectId, name, handle, false); ui.setRightPanelOpen(true); addLog('info', 'Editor', `Opened ${name}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  };

  const handleSaveFile = useCallback(async (tab: { id: string; handle: FileSystemFileHandle; content: string }) => {
    if (!state.activeProjectId) return;
    try { const w = await tab.handle.createWritable(); await w.write(tab.content); await w.close(); setTabClean(state.activeProjectId, tab.id); addLog('success', 'FileIO', `Saved ${tab.id}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '文件句柄已失效，请重新打开文件夹授权' : '保存文件失败'; addLog('error', 'FileIO', msg); }
  }, [state.activeProjectId, setTabClean, addLog]);

  const handleApproveFileOps = useCallback(async (ops: FileOperation[]) => {
    if (!state.activeProjectId) return;
    const projId = state.activeProjectId;
    const rootDir = state.activeFileTree?.dirHandle as FileSystemDirectoryHandle | undefined;
    for (const op of ops) {
      const fileName = op.path.split('/').pop() ?? op.path;
      if (op.action === 'create' && op.content) {
        state.updateFileTree((tree: FileNode) => {
          const parts = op.path.split('/');
          const addRecursive = (node: FileNode, depth: number): FileNode => {
            if (depth === parts.length - 1) return { ...node, children: [...(node.children ?? []), { name: parts[depth], type: 'file' as const }] };
            if (node.type === 'dir') {
              const childIdx = node.children?.findIndex((c) => c.name === parts[depth]) ?? -1;
              if (childIdx >= 0 && node.children) { const updated = [...node.children]; updated[childIdx] = addRecursive(updated[childIdx], depth + 1); return { ...node, children: updated }; }
              return { ...node, children: [...(node.children ?? []), addRecursive({ name: parts[depth], type: 'dir' as const, children: [] }, depth + 1)] };
            }
            return node;
          };
          return addRecursive(tree, 0);
        });
        if (rootDir) { try { await writeFileAtPath(rootDir, op.path, op.content); addLog('success', 'FileIO', `已写入磁盘: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Created ${op.path} (仅内存)`); }
      } else if (['modify', 'edit', 'update', 'write'].includes(op.action) && op.newContent) {
        const tabs = activeProjectTabs(projId);
        const existingTab = tabs.tabs.find((t: EditorTab) => t.name === fileName);
        if (existingTab) updateTabContent(projId, existingTab.id, op.newContent);
        if (rootDir) { try { await writeFileAtPath(rootDir, op.path, op.newContent); addLog('success', 'FileIO', `已更新磁盘: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Modified ${op.path} (仅内存)`); }
      } else if (['delete', 'remove'].includes(op.action)) {
        state.updateFileTree((tree: FileNode) => {
          const removeFromDir = (n: FileNode): FileNode => { if (n.type === 'dir') return { ...n, children: n.children?.filter((c) => c.name !== fileName).map(removeFromDir) }; return n; };
          return removeFromDir(tree);
        });
        if (rootDir) { try { await deleteFileAtPath(rootDir, op.path); addLog('success', 'FileIO', `已从磁盘删除: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘删除失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Deleted ${op.path} (仅内存)`); }
      }
    }
  }, [state, activeProjectTabs, updateTabContent, addLog]);

  useEffect(() => { setOnApproved(handleApproveFileOps); }, [setOnApproved, handleApproveFileOps]);

  const handleReauthorize = useCallback(async () => {
    if (!state.activeProjectId) return;
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const children = await traverseDirectory(dirHandle);
      const tree: FileNode = { name: dirHandle.name, type: 'dir', children, dirHandle };
      state.setRealFileTrees((prev: Record<string, FileNode>) => ({ ...prev, [state.activeProjectId!]: tree }));
      addLog('success', 'FileIO', `已重新授权: ${dirHandle.name}`);
    } catch (err: unknown) { if (err instanceof DOMException && err.name === 'AbortError') return; addLog('error', 'FileIO', '重新授权失败'); }
  }, [state.activeProjectId, state.setRealFileTrees, addLog]);

  const handleApproveAllFileOps = useCallback((ops: FileOperation[], remember: boolean) => {
    if (remember) setAutoApprove(true);
    handleApproveFileOps(ops);
    approveOperations(ops);
  }, [setAutoApprove, handleApproveFileOps, approveOperations]);

  const handleSend = (text: string) => {
    if (!state.activeSessionId) return;
    const sid = state.activeSessionId;
    let enrichedText = text;
    const fileItems = contextItems.filter((i) => i.type === 'file' && i.content);
    if (fileItems.length > 0) {
      const fileBlocks = fileItems.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
      enrichedText = `以下是用户附加的文件上下文：\n\n${fileBlocks}\n\n---\n\n用户消息：${text}`;
    }
    if (state.activeFileTree) {
      const treeText = buildFileTreeText(state.activeFileTree);
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
    state.updateSessionMeta(sid, { lastMessagePreview: text.slice(0, 50) });
    lastUserMsgRef.current = text;
    const sent = wsSendMessage(enrichedText, replyToId ?? undefined);
    if (!sent) { addLog('error', 'WebSocket', '消息发送失败：WebSocket 未连接，请稍后重试'); setProcessingStatus({ status: 'error', errorMessage: 'WebSocket 未连接' }); }
    else { setProcessingStatus({ status: 'sending' }); }
    setContextItems((prev) => prev.filter((i) => i.type !== 'file'));
    setReplyToId(null);
  };

  const handleCreateGroup = useCallback(async (title: string, selectedAgentIds: string[]) => {
    const { data: session, error } = await backendData.createSession(title, selectedAgentIds, 'group');
    if (session) state.handleCreateGroup(title, selectedAgentIds, session.id);
    else addLog('error', 'Session', `群聊创建失败: ${error}`);
    ui.setGroupModalOpen(false);
  }, [state.handleCreateGroup, backendData.createSession, addLog]);

  const handleSelectProjectAndExpand = useCallback((projectId: string) => {
    state.handleSelectProject(projectId);
    if (projectId === state.activeProjectId) ui.toggleFilesExpanded();
    else ui.setFilesExpanded(true);
  }, [state.handleSelectProject, state.activeProjectId]);

  const openSingleChat = useCallback(() => { setIsSingleChat(true); ui.setSessionModalOpen(true); }, []);
  const openMultiChat = useCallback(() => { setIsSingleChat(false); ui.setSessionModalOpen(true); }, []);

  const handleConfirmSession = useCallback(async (selectedAgentIds: string[], sessionName: string) => {
    const { data: session, error } = await backendData.createSession(sessionName, selectedAgentIds, selectedAgentIds.length > 1 ? 'group' : 'single');
    if (session) state.handleCreateSession(selectedAgentIds, sessionName, session.id);
    else addLog('error', 'Session', `会话创建失败: ${error}`);
    ui.setSessionModalOpen(false);
  }, [state, backendData.createSession, addLog]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    state.handleDeleteSession(sessionId);
    backendData.deleteSession(sessionId);
  }, [state.handleDeleteSession, backendData.deleteSession]);

  const handlePinSession = useCallback((sessionId: string) => {
    state.handleTogglePinSession(sessionId);
    const session = state.activeProject?.sessions.find((s) => s.id === sessionId);
    if (session) backendData.updateSessionPin(sessionId, !session.isPinned);
  }, [state.handleTogglePinSession, state.activeProject, backendData.updateSessionPin]);

  const handleArchiveSession = useCallback((sessionId: string) => {
    state.handleToggleArchiveSession(sessionId);
    const session = state.activeProject?.sessions.find((s) => s.id === sessionId);
    if (session) backendData.updateSessionArchive(sessionId, !session.isArchived);
  }, [state.handleToggleArchiveSession, state.activeProject, backendData.updateSessionArchive]);

  const handleReply = useCallback((messageId: string) => { setReplyToId(messageId); }, []);

  const handleQuote = useCallback((messageId: string) => {
    const msg = allMessages.find((m) => m.id === messageId);
    if (msg) { const quoteText = `> ${msg.content.split('\n').slice(0, 3).join('\n> ')}\n\n`; setContextItems((prev) => [...prev, { id: `quote-${crypto.randomUUID()}`, type: 'snippet', name: quoteText }]); }
  }, [allMessages]);

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
  }, [allMessages, wsSendMessage, addLog]);

  const handleStopGeneration = useCallback(() => {
    wsStopGeneration();
    setProcessingStatus({ status: 'stopped' });
    addLog('warn', 'Chat', '已中断 Agent 生成');
  }, [wsStopGeneration, addLog]);

  const handleRetryLastMessage = useCallback(() => {
    if (!lastUserMsgRef.current) return;
    addLog('info', 'Chat', '重新发送消息...');
    handleSend(lastUserMsgRef.current);
  }, [handleSend, addLog]);

  const handlePinMessage = useCallback((messageId: string) => {
    setAllMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, isPinned: !m.isPinned } : m));
  }, []);

  const handleClearReply = useCallback(() => { setReplyToId(null); }, []);

  const handleFileUploaded = useCallback((file: { url: string; filename: string; size: number; mimeType: string }) => {
    setContextItems((prev) => [...prev, { id: `upload-${crypto.randomUUID()}`, type: 'file', name: file.filename, content: `[附件: ${file.filename}]` }]);
  }, []);

  return {
    theme, setTheme, state, backendData, allAgents, allMessages,
    isRightPanelOpen: ui.isRightPanelOpen, setIsRightPanelOpen: ui.setRightPanelOpen,
    isSessionModalOpen: ui.isSessionModalOpen, setIsSessionModalOpen: ui.setSessionModalOpen,
    isConsoleOpen: ui.isConsoleOpen, setIsConsoleOpen: ui.toggleConsole,
    isFilesExpanded: ui.isFilesExpanded, setIsFilesExpanded: ui.setFilesExpanded,
    isGroupModalOpen: ui.isGroupModalOpen, setIsGroupModalOpen: ui.setGroupModalOpen,
    isSingleChat, setIsSingleChat,
    isSettingsOpen: ui.isSettingsOpen, setIsSettingsOpen: ui.setSettingsOpen,
    isCreateProjectOpen: ui.isCreateProjectOpen, setIsCreateProjectOpen: ui.setCreateProjectOpen,
    processingStatus, agentStatuses, logs, setLogs, contextItems, setContextItems,
    contextWidth, editorWidth, replyToId,
    currentTabs, activeTab, activeMessages, mergedSessions,
    activeSession, activeAgents,
    handleResizeStart,
    handleOpenFile, handleOpenFileTransient, handleSaveFile,
    handleReauthorize, handleApproveAllFileOps,
    handleSend, handleCreateGroup, handleSelectProjectAndExpand,
    openSingleChat, openMultiChat, handleConfirmSession,
    handleDeleteSession, handlePinSession, handleArchiveSession,
    handleReply, handleQuote, handleRegenerate,
    handleStopGeneration, handleRetryLastMessage,
    handlePinMessage, handleClearReply, handleFileUploaded,
    pendingOps, showDialog, approveOperations, rejectOperations,
    injectDiff, setActiveTabId, closeTab, updateTabContent, pinTab,
    applyDiff, rejectDiff,
  };
}
