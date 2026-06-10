'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import type { LogItem } from '@/components/im/ConsolePanel';
import type { MockMessage } from '@/mock/mockScripts';
import type { ContextItem } from '@/components/im/InputContextArea';
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
import { useChatActions } from '@/hooks/useChatActions';
import { useFileActions } from '@/hooks/useFileActions';
import { useSessionActions } from '@/hooks/useSessionActions';
import { useEditorActions } from '@/hooks/useEditorActions';

const INITIAL_LOGS: LogItem[] = [
  { id: '1', type: 'success', source: 'System', message: 'Web Access Token Initialized.', timestamp: new Date().toISOString() },
  { id: '2', type: 'info', source: 'Agent', message: 'Orchestrator is standing by.', timestamp: new Date().toISOString() },
  { id: '3', type: 'warn', source: 'Runtime', message: 'Telemetry pipeline idle — no active sessions.', timestamp: new Date().toISOString() },
];

const MAX_MESSAGES = 1000;
const MAX_LOGS = 200;

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

  const addLog = useCallback((type: LogItem['type'], source: string, message: string) => {
    setLogs((prev) => { const next = [...prev, { id: crypto.randomUUID(), type, source, message, timestamp: new Date().toISOString() }]; return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next; });
  }, []);

  // ── WebSocket event handlers ──
  const handleChunk = useCallback((chunk: { messageId: string; sessionId: string; agentId: string; chunkType: string; deltaContent: string; isFinal: boolean }) => {
    if (chunk.chunkType === 'text') {
      if (chunk.isFinal) {
        streamingMsgRef.current = null; currentAgentRef.current = null;
        setProcessingStatus((prev) => prev.status === 'error' ? prev : { status: 'idle' });
        setAllMessages((prev) => {
          let updated = prev.map((m) => m.sessionId === chunk.sessionId && m.isStreaming ? { ...m, isStreaming: false } : m);
          if (chunk.deltaContent) {
            const existingIdx = updated.findIndex((m) => m.id === chunk.messageId);
            if (existingIdx >= 0) updated = updated.map((m) => m.id === chunk.messageId ? { ...m, content: m.content + stripFileOperations(chunk.deltaContent) } : m);
            else updated = [...updated, { id: chunk.messageId, sessionId: chunk.sessionId, senderType: 'agent' as const, senderId: chunk.agentId, content: stripFileOperations(chunk.deltaContent), contentType: 'text' as const, createdAt: new Date().toISOString(), isStreaming: false }];
          }
          const lastAgentMsg = [...updated].reverse().find((m) => m.sessionId === chunk.sessionId && m.senderType === 'agent');
          if (lastAgentMsg) state.updateSessionMeta(chunk.sessionId, { lastMessagePreview: lastAgentMsg.content.slice(0, 50) });
          return updated;
        });
        return;
      }
      const isAgentSwitch = currentAgentRef.current !== null && currentAgentRef.current !== chunk.agentId;
      currentAgentRef.current = chunk.agentId;
      const effectiveMsgId = isAgentSwitch ? `${chunk.messageId}-${chunk.agentId}` : chunk.messageId;
      setAllMessages((prev) => {
        const existing = prev.find((m) => m.id === effectiveMsgId);
        if (existing) return prev.map((m) => m.id === effectiveMsgId ? { ...m, content: stripFileOperations(m.content + chunk.deltaContent), isStreaming: true } : m);
        streamingMsgRef.current = effectiveMsgId;
        const agent = allAgents.find((a) => a.id === chunk.agentId);
        setProcessingStatus({ status: 'streaming', agentId: chunk.agentId, agentName: agent?.name });
        const next = [...prev, { id: effectiveMsgId, sessionId: chunk.sessionId, senderType: 'agent' as const, senderId: chunk.agentId, content: stripFileOperations(chunk.deltaContent), contentType: 'text' as const, createdAt: new Date().toISOString(), isStreaming: true }];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    }
    if (chunk.chunkType === 'tool_status') {
      try { const t = JSON.parse(chunk.deltaContent); addLog('info', 'Tool', `${t.tool}: ${t.done ? (t.isError ? 'failed' : 'completed') : 'running'}`); } catch { addLog('info', 'Tool', chunk.deltaContent); }
    }
  }, [state.updateSessionMeta, addLog, allAgents]);

  const handleMessageComplete = useCallback((msg: { id: string; sessionId: string; senderType: string; senderId: string; content: string; contentType: string; cardData?: unknown; createdAt: string }) => {
    setAllMessages((prev) => prev.map((m) => m.sessionId === msg.sessionId && m.isStreaming ? { ...m, isStreaming: false } : m));
    streamingMsgRef.current = null; currentAgentRef.current = null; setProcessingStatus({ status: 'idle' }); clearPendingRef.current?.();
    if (msg.senderType === 'agent' && msg.content) {
      const agent = allAgents.find((a) => a.id === msg.senderId);
      const est = Math.ceil(msg.content.length / 3);
      recordUsage({ agentId: msg.senderId, agentName: agent?.name ?? 'Agent', model: 'mimo-v2.5-pro', inputTokens: Math.ceil(est * 0.3), outputTokens: est });
      requestFileOperations(msg.content);
      const clean = stripFileOperations(msg.content);
      if (clean !== msg.content) setAllMessages((prev) => prev.map((m) => m.sessionId === msg.sessionId && m.senderType === 'agent' ? { ...m, content: clean } : m));
    }
  }, [allAgents, recordUsage, requestFileOperations]);

  const handleAgentStatus = useCallback((status: { sessionId: string; agentId: string; status: string; displayText: string }) => {
    addLog('info', 'Agent', `[${status.agentId}] ${status.displayText}`);
    const agent = allAgents.find((a) => a.id === status.agentId);
    const mapped = status.status === 'executing' || status.status === 'analyzing' ? 'working' : status.status === 'completed' ? 'done' : status.status === 'failed' ? 'error' : 'idle';
    setAgentStatuses((prev) => ({ ...prev, [status.agentId]: mapped }));
    if (status.status === 'executing' || status.status === 'planning') setProcessingStatus({ status: 'processing', agentId: status.agentId, agentName: agent?.name, displayText: status.displayText });
    else if (status.status === 'completed') setProcessingStatus((prev) => prev.status !== 'error' ? { status: 'idle' } : prev);
    else if (status.status === 'failed') setProcessingStatus({ status: 'error', agentId: status.agentId, agentName: agent?.name, errorMessage: status.displayText });
  }, [addLog, allAgents]);

  const handleError = useCallback((error: { sessionId: string; errorCode: string; errorMessage: string }) => {
    addLog('error', 'WebSocket', error.errorMessage); setProcessingStatus({ status: 'error', errorMessage: error.errorMessage });
  }, [addLog]);

  // ── WebSocket connection ──
  const activeBackendSessionId = state.activeSessionId ?? null;
  const { sendMessage: wsSendMessage, clearPending, stopGeneration: wsStopGeneration } = useWebSocket({
    sessionId: activeBackendSessionId, onChunk: handleChunk, onMessageComplete: handleMessageComplete,
    onAgentStatus: handleAgentStatus, onError: handleError, onLog: addLog,
  });
  clearPendingRef.current = clearPending;

  // ── Auth redirect ──
  useEffect(() => { if (!authLoading && !isAuthenticated) router.push('/login'); }, [authLoading, isAuthenticated, router]);

  // ── Sync backend agents ──
  useEffect(() => { setAllAgents(backendData.agents.map((a) => ({ id: a.id, name: a.name, avatar: a.avatar ?? '🤖', role: a.role, description: a.description ?? '' }))); }, [backendData.agents]);

  // ── Editor tabs ──
  const currentTabs = activeProjectTabs(state.activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;
  useEffect(() => { if (state.activeProjectId) { currentTabs.tabs.forEach((tab) => editorStore.openTab(state.activeProjectId!, tab)); if (currentTabs.activeTabId) editorStore.setActiveTabId(state.activeProjectId!, currentTabs.activeTabId); } }, [currentTabs, state.activeProjectId]);

  // ── Message merge ──
  const backendSessionMessages = state.activeSessionId ? (backendData.messages[state.activeSessionId] ?? []) : [];
  const localSessionMessages = state.activeSessionId ? allMessages.filter((m) => m.sessionId === state.activeSessionId) : [];
  const activeMessages = (() => {
    if (localSessionMessages.length === 0) return backendSessionMessages.map((m) => ({ id: m.id, sessionId: m.sessionId, senderType: m.senderType, senderId: m.senderId, content: m.content, contentType: m.contentType as MockMessage['contentType'], cardData: m.cardData as MockMessage['cardData'], createdAt: m.createdAt }));
    if (backendSessionMessages.length === 0) return localSessionMessages;
    const localIds = new Set(localSessionMessages.map((m) => m.id));
    const deduped = backendSessionMessages.filter((m) => !localIds.has(m.id)).map((m) => ({ id: m.id, sessionId: m.sessionId, senderType: m.senderType, senderId: m.senderId, content: m.content, contentType: m.contentType as MockMessage['contentType'], cardData: m.cardData as MockMessage['cardData'], createdAt: m.createdAt }));
    return [...deduped, ...localSessionMessages];
  })();

  const mergedSessions = (() => {
    const local = state.activeProject?.sessions ?? [];
    const localIds = new Set(local.map((s) => s.id));
    const backendOnly = backendData.sessions.filter((s) => !localIds.has(s.id)).map((s) => ({ id: s.id, title: s.title, type: s.type, agentIds: s.agentIds, isPinned: s.isPinned, isArchived: s.isArchived, lastActiveAt: s.updatedAt, lastMessagePreview: s.lastMessagePreview ?? undefined, createdAt: s.createdAt }));
    return [...local, ...backendOnly];
  })();

  const activeSession = state.activeSessionId ? (mergedSessions.find((s) => s.id === state.activeSessionId) ?? null) : null;
  const activeAgents = activeSession ? allAgents.filter((a) => activeSession.agentIds.includes(a.id)) : [];

  // ── Resize ──
  const resizeRef = useRef<{ type: 'context' | 'editor'; startX: number; startW: number } | null>(null);
  const handleResizeStart = useCallback((type: 'context' | 'editor') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startW = type === 'context' ? contextWidth : editorWidth;
    resizeRef.current = { type, startX: e.clientX, startW };
    const onMove = (ev: MouseEvent) => { if (!resizeRef.current) return; const d = ev.clientX - resizeRef.current.startX; if (resizeRef.current.type === 'context') setContextWidth(Math.min(450, Math.max(200, resizeRef.current.startW + d))); else setEditorWidth(Math.min(600, Math.max(240, resizeRef.current.startW - d))); };
    const onUp = () => { resizeRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
  }, [contextWidth, editorWidth]);

  useEffect(() => () => { if (streamTimerRef.current) clearInterval(streamTimerRef.current); }, []);
  useEffect(() => { setContextItems([]); if (state.activeSessionId) { addLog('info', 'Session', `Switched to session ${state.activeSessionId}`); backendData.fetchMessages(state.activeSessionId); } }, [state.activeSessionId]);

  // ── Sub-hooks ──
  const chatActions = useChatActions({ activeSessionId: state.activeSessionId, activeFileTree: state.activeFileTree, allMessages, setAllMessages, contextItems, setContextItems, allAgents, replyToId, setReplyToId, wsSendMessage, wsStopGeneration, setProcessingStatus, updateSessionMeta: state.updateSessionMeta, addLog });
  const fileActions = useFileActions({ activeProjectId: state.activeProjectId, activeFileTree: state.activeFileTree, updateFileTree: state.updateFileTree, setRealFileTrees: state.setRealFileTrees, setNeedsReauth: state.setNeedsReauth, activeProjectTabs, updateTabContent, setAutoApprove, approveOperations, setOnApproved, addLog });
  const sessionActions = useSessionActions({ handleCreateGroup: state.handleCreateGroup, handleCreateSession: state.handleCreateSession, handleDeleteSession: state.handleDeleteSession, handleTogglePinSession: state.handleTogglePinSession, handleToggleArchiveSession: state.handleToggleArchiveSession, handleSelectProject: state.handleSelectProject, activeProjectId: state.activeProjectId, activeProject: state.activeProject, createSession: backendData.createSession, deleteSession: backendData.deleteSession, updateSessionPin: backendData.updateSessionPin, updateSessionArchive: backendData.updateSessionArchive, setSessionModalOpen: ui.setSessionModalOpen, setGroupModalOpen: ui.setGroupModalOpen, setFilesExpanded: ui.setFilesExpanded, toggleFilesExpanded: ui.toggleFilesExpanded, addLog });
  const editorActions = useEditorActions({ activeProjectId: state.activeProjectId, openTab, setTabClean, setRightPanelOpen: ui.setRightPanelOpen, addLog });

  const openSingleChat = useCallback(() => { setIsSingleChat(true); ui.setSessionModalOpen(true); }, []);
  const openMultiChat = useCallback(() => { setIsSingleChat(false); ui.setSessionModalOpen(true); }, []);

  return {
    theme, setTheme, state, backendData, allAgents, allMessages,
    isRightPanelOpen: ui.isRightPanelOpen, setIsRightPanelOpen: ui.setRightPanelOpen,
    isSessionModalOpen: ui.isSessionModalOpen, setIsSessionModalOpen: ui.setSessionModalOpen,
    isConsoleOpen: ui.isConsoleOpen, setIsConsoleOpen: ui.setConsoleOpen,
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
    ...editorActions, ...fileActions, ...sessionActions, ...chatActions,
    openSingleChat, openMultiChat,
    pendingOps, showDialog, approveOperations, rejectOperations,
    injectDiff, setActiveTabId, closeTab, updateTabContent, pinTab,
    applyDiff, rejectDiff,
  };
}
