'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectDock } from '@/components/im/ProjectDock';
import { FileExplorer } from '@/components/im/FileExplorer';
import { ContextSidebar } from '@/components/im/ContextSidebar';
import { ChatArea } from '@/components/im/ChatArea';
import { AgentSidebar } from '@/components/im/AgentSidebar';
import { CodeEditor } from '@/components/im/CodeEditor';
import type { LogItem } from '@/components/im/ConsolePanel';
import type { FileNode } from '@/components/im/mockFiles';
import { ConsolePanel } from '@/components/im/ConsolePanel';
import type { ContextItem } from '@/components/im/InputContextArea';
import { CreateSessionModal } from '@/components/im/CreateSessionModal';
import { CreateGroupModal } from '@/components/im/CreateGroupModal';
import { SettingsModal } from '@/components/im/SettingsModal';
import { FileOperationDialog } from '@/components/im/FileOperationDialog';
import type { FileOperation } from '@/components/im/FileOperationDialog';
import { writeFileAtPath, deleteFileAtPath, traverseDirectory } from '@/components/im/fileSystemUtils';
import { CreateProjectModal } from '@/components/im/CreateProjectModal';
import { ARTIFACT_HTML, ARTIFACT_PREFIX, ARTIFACT_SUFFIX } from '@/components/im/mockData';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { type MockMessage } from '@/mock/mockScripts';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import type { EditorTab } from '@/hooks/useEditorTabs';
import { useTheme } from '@/hooks/useTheme';
import { useProjectState } from '@/hooks/useProjectState';
import { useAuth } from '@/hooks/useAuth';
import { useBackendData } from '@/hooks/useBackendData';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUsageTracker } from '@/hooks/useUsageTracker';
import { useFileOperations, stripFileOperations } from '@/hooks/useFileOperations';

const INITIAL_LOGS: LogItem[] = [
  { id: '1', type: 'success', source: 'System', message: 'Web Access Token Initialized.', timestamp: new Date().toISOString() },
  { id: '2', type: 'info', source: 'Agent', message: 'Orchestrator is standing by.', timestamp: new Date().toISOString() },
  { id: '3', type: 'warn', source: 'Runtime', message: 'Telemetry pipeline idle — no active sessions.', timestamp: new Date().toISOString() },
];

const MAX_MESSAGES = 1000;
const MAX_LOGS = 200;

// Build a text representation of the file tree for AI context
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

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 dark:text-zinc-600">
      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><span className="text-3xl">📂</span></div>
      <div className="text-center space-y-1"><p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p><p className="text-xs text-zinc-400 dark:text-zinc-600">{sub}</p></div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const backendData = useBackendData();
  const { theme, setTheme } = useTheme();
  const state = useProjectState();
  const [allMessages, setAllMessages] = useState<MockMessage[]>([]);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSingleChat, setIsSingleChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentProfile[]>([]);
  const [processingStatus, setProcessingStatus] = useState<{ status: 'idle' | 'sending' | 'processing' | 'streaming' | 'error' | 'stopped'; agentId?: string; agentName?: string; displayText?: string; errorMessage?: string }>({ status: 'idle' });
  const lastUserMsgRef = useRef<string>('');
  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [contextWidth, setContextWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(320);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamingMsgRef = useRef<string | null>(null);
  const { activeProjectTabs, openTab, closeTab, setActiveTabId, updateTabContent, pinTab, setTabClean, injectDiff, applyDiff, rejectDiff } = useEditorTabs();
  const { recordUsage } = useUsageTracker();
  const { pendingOps, showDialog, autoApprove, requestFileOperations, approveOperations, rejectOperations, setAutoApprove, setOnApproved } = useFileOperations();

  const addLog = useCallback((type: LogItem['type'], source: string, message: string) => {
    setLogs((prev) => {
      const next = [...prev, { id: crypto.randomUUID(), type, source, message, timestamp: new Date().toISOString() }];
      return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
    });
  }, []);

  // WebSocket integration - track current agent for group chat message separation
  const currentAgentRef = useRef<string | null>(null);

  const handleChunk = useCallback((chunk: { messageId: string; sessionId: string; agentId: string; chunkType: string; deltaContent: string; isFinal: boolean }) => {
    if (chunk.chunkType === 'text') {
      const msgId = chunk.messageId;

      if (chunk.isFinal) {
        streamingMsgRef.current = null;
        currentAgentRef.current = null;
        setProcessingStatus({ status: 'idle' });
        setAllMessages((prev) => {
          // Mark all streaming messages in this session as done
          const updated = prev.map((m) => m.sessionId === chunk.sessionId && m.isStreaming ? { ...m, isStreaming: false } : m);
          // Use full content for preview
          const lastAgentMsg = [...updated].reverse().find((m) => m.sessionId === chunk.sessionId && m.senderType === 'agent');
          if (lastAgentMsg) {
            state.updateSessionMeta(chunk.sessionId, { lastMessagePreview: lastAgentMsg.content.slice(0, 50) });
          }
          return updated;
        });
        return;
      }

      // Group chat: when agentId changes, create a new message for the new agent
      const isAgentSwitch = currentAgentRef.current !== null && currentAgentRef.current !== chunk.agentId;
      currentAgentRef.current = chunk.agentId;

      // Derive a stable message key: base ID + agentId for group chat separation
      const effectiveMsgId = isAgentSwitch ? `${msgId}-${chunk.agentId}` : msgId;

      setAllMessages((prev) => {
        const existing = prev.find((m) => m.id === effectiveMsgId);
        if (existing) {
          const rawContent = existing.content + chunk.deltaContent;
          return prev.map((m) => m.id === effectiveMsgId ? { ...m, content: stripFileOperations(rawContent), isStreaming: true } : m);
        }
        // First chunk of a new message (or agent switch)
        streamingMsgRef.current = effectiveMsgId;
        const agent = allAgents.find((a) => a.id === chunk.agentId);
        setProcessingStatus({ status: 'streaming', agentId: chunk.agentId, agentName: agent?.name });
        const cleanDelta = stripFileOperations(chunk.deltaContent);
        const newMsg: MockMessage = {
          id: effectiveMsgId,
          sessionId: chunk.sessionId,
          senderType: 'agent',
          senderId: chunk.agentId,
          content: cleanDelta,
          contentType: 'text',
          createdAt: new Date().toISOString(),
          isStreaming: true,
        };
        const next = [...prev, newMsg];
        return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
      });
    }
    // Handle tool_status chunks - show tool execution status
    if (chunk.chunkType === 'tool_status') {
      try {
        const toolInfo = JSON.parse(chunk.deltaContent);
        const status = toolInfo.done ? (toolInfo.isError ? 'failed' : 'completed') : 'running';
        addLog('info', 'Tool', `${toolInfo.tool}: ${status}`);
      } catch {
        addLog('info', 'Tool', chunk.deltaContent);
      }
    }
  }, [state.updateSessionMeta, addLog]);

  // Bug #1: Handle messageComplete - mark all streaming messages as done
  const clearPendingRef = useRef<(() => void) | null>(null);
  const handleMessageComplete = useCallback((msg: { id: string; sessionId: string; senderType: string; senderId: string; content: string; contentType: string; cardData?: unknown; createdAt: string }) => {
    // Mark all streaming messages in this session as completed
    setAllMessages((prev) => prev.map((m) =>
      m.sessionId === msg.sessionId && m.isStreaming
        ? { ...m, isStreaming: false }
        : m
    ));
    streamingMsgRef.current = null;
    currentAgentRef.current = null;
    setProcessingStatus({ status: 'idle' });
    // Clear pending message queue
    clearPendingRef.current?.();
    // Record token usage estimate
    if (msg.senderType === 'agent' && msg.content) {
      const agent = allAgents.find((a) => a.id === msg.senderId);
      const estimatedTokens = Math.ceil(msg.content.length / 3);
      recordUsage({
        agentId: msg.senderId,
        agentName: agent?.name ?? 'Agent',
        model: 'mimo-v2.5-pro',
        inputTokens: Math.ceil(estimatedTokens * 0.3),
        outputTokens: estimatedTokens,
      });
      // Check for file operations in agent response
      requestFileOperations(msg.content);
      // Strip @file_operation directives from displayed message content
      const cleanContent = stripFileOperations(msg.content);
      if (cleanContent !== msg.content) {
        setAllMessages((prev) => prev.map((m) =>
          m.sessionId === msg.sessionId && m.senderType === 'agent'
            ? { ...m, content: cleanContent }
            : m
        ));
      }
    }
  }, [allAgents, recordUsage, requestFileOperations]);

  const handleAgentStatus = useCallback((status: { sessionId: string; agentId: string; status: string; displayText: string }) => {
    addLog('info', 'Agent', `[${status.agentId}] ${status.displayText}`);
    const agent = allAgents.find((a) => a.id === status.agentId);
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

  // Use backend session ID for WebSocket
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
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    // Always sync with backend agents (even if empty after loading)
    const mapped: AgentProfile[] = backendData.agents.map((a) => ({
      id: a.id,
      name: a.name,
      avatar: a.avatar ?? '🤖',
      role: a.role,
      description: a.description ?? '',
    }));
    setAllAgents(mapped);
  }, [backendData.agents]);

  const currentTabs = activeProjectTabs(state.activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;

  // Bug #4: Merge backend messages with local messages
  const backendSessionMessages = state.activeSessionId ? (backendData.messages[state.activeSessionId] ?? []) : [];
  const localSessionMessages = state.activeSessionId ? allMessages.filter((m) => m.sessionId === state.activeSessionId) : [];
  const activeMessages = backendSessionMessages.length > 0 && localSessionMessages.length === 0
    ? backendSessionMessages.map((m) => ({
        id: m.id,
        sessionId: m.sessionId,
        senderType: m.senderType,
        senderId: m.senderId,
        content: m.content,
        contentType: m.contentType as MockMessage['contentType'],
        cardData: m.cardData as MockMessage['cardData'],
        createdAt: m.createdAt,
      }))
    : localSessionMessages;

  const activeAgents = state.activeSession ? allAgents.filter((a) => state.activeSession!.agentIds.includes(a.id)) : [];

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

  // Bug #4: Fetch messages from backend when session changes
  useEffect(() => {
    setContextItems([]);
    if (state.activeSessionId) {
      addLog('info', 'Session', `Switched to session ${state.activeSessionId}`);
      backendData.fetchMessages(state.activeSessionId);
    }
  }, [state.activeSessionId]);

  const handleOpenFileTransient = async (name: string, handle: FileSystemFileHandle) => {
    if (!state.activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(state.activeProjectId, name, handle, true); setIsRightPanelOpen(true); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  };

  const handleOpenFile = async (name: string, handle: FileSystemFileHandle) => {
    if (!state.activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(state.activeProjectId, name, handle, false); setIsRightPanelOpen(true); addLog('info', 'Editor', `Opened ${name}`); }
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
    // Get the project's root directory handle for writing to disk
    const rootDir = state.activeFileTree?.dirHandle as FileSystemDirectoryHandle | undefined;
    for (const op of ops) {
      const fileName = op.path.split('/').pop() ?? op.path;
      if (op.action === 'create' && op.content) {
        // Update in-memory file tree
        state.updateFileTree((tree: FileNode) => {
          const parts = op.path.split('/');
          const addRecursive = (node: FileNode, depth: number): FileNode => {
            if (depth === parts.length - 1) {
              return { ...node, children: [...(node.children ?? []), { name: parts[depth], type: 'file' as const }] };
            }
            if (node.type === 'dir') {
              const childIdx = node.children?.findIndex((c) => c.name === parts[depth]) ?? -1;
              if (childIdx >= 0 && node.children) {
                const updated = [...node.children];
                updated[childIdx] = addRecursive(updated[childIdx], depth + 1);
                return { ...node, children: updated };
              }
              return { ...node, children: [...(node.children ?? []), addRecursive({ name: parts[depth], type: 'dir' as const, children: [] }, depth + 1)] };
            }
            return node;
          };
          return addRecursive(tree, 0);
        });
        // Write to actual filesystem
        if (rootDir) {
          try {
            await writeFileAtPath(rootDir, op.path, op.content);
            addLog('success', 'FileIO', `已写入磁盘: ${op.path}`);
          } catch (err) {
            console.error('写入磁盘失败:', err);
            addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}（请确认已授权文件夹读写权限）`);
          }
        } else {
          addLog('info', 'FileIO', `Created ${op.path} (仅内存，未关联本地文件夹)`);
        }
      } else if (['modify', 'edit', 'update', 'write'].includes(op.action) && op.newContent) {
        // Find existing tab and update content
        const tabs = activeProjectTabs(projId);
        const existingTab = tabs.tabs.find((t: EditorTab) => t.name === fileName);
        if (existingTab) {
          updateTabContent(projId, existingTab.id, op.newContent);
        }
        // Write to actual filesystem
        if (rootDir) {
          try {
            await writeFileAtPath(rootDir, op.path, op.newContent);
            addLog('success', 'FileIO', `已更新磁盘: ${op.path}`);
          } catch (err) {
            console.error('更新磁盘失败:', err);
            addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}`);
          }
        } else {
          addLog('info', 'FileIO', `Modified ${op.path} (仅内存)`);
        }
      } else if (['delete', 'remove'].includes(op.action)) {
        state.updateFileTree((tree: FileNode) => {
          const removeFromDir = (n: FileNode): FileNode => {
            if (n.type === 'dir') return { ...n, children: n.children?.filter((c) => c.name !== fileName).map(removeFromDir) };
            return n;
          };
          return removeFromDir(tree);
        });
        // Delete from actual filesystem
        if (rootDir) {
          try {
            await deleteFileAtPath(rootDir, op.path);
            addLog('success', 'FileIO', `已从磁盘删除: ${op.path}`);
          } catch (err) {
            console.error('磁盘删除失败:', err);
            addLog('warn', 'FileIO', `内存已更新但磁盘删除失败: ${op.path}`);
          }
        } else {
          addLog('info', 'FileIO', `Deleted ${op.path} (仅内存)`);
        }
      }
    }
  }, [state, activeProjectTabs, updateTabContent, addLog]);

  // Register auto-approve callback for one-click file operations
  useEffect(() => {
    setOnApproved(handleApproveFileOps);
  }, [setOnApproved, handleApproveFileOps]);

  // Re-authorize project folder (for when file handles expire after page reload)
  const handleReauthorize = useCallback(async () => {
    if (!state.activeProjectId) return;
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const children = await traverseDirectory(dirHandle);
      const tree: FileNode = { name: dirHandle.name, type: 'dir', children, dirHandle };
      state.setRealFileTrees((prev: Record<string, FileNode>) => ({ ...prev, [state.activeProjectId!]: tree }));
      addLog('success', 'FileIO', `已重新授权: ${dirHandle.name}`);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      addLog('error', 'FileIO', '重新授权失败');
    }
  }, [state.activeProjectId, state.setRealFileTrees, addLog]);

  const handleApproveAllFileOps = useCallback((ops: FileOperation[], remember: boolean) => {
    if (remember) {
      setAutoApprove(true);
    }
    handleApproveFileOps(ops);
    approveOperations(ops);
  }, [setAutoApprove, handleApproveFileOps, approveOperations]);

  const handleSend = (text: string) => {
    if (!state.activeSessionId) return;
    const sid = state.activeSessionId;

    // Build context-enriched message with file contents and file tree
    let enrichedText = text;
    const fileItems = contextItems.filter((i) => i.type === 'file' && i.content);
    if (fileItems.length > 0) {
      const fileBlocks = fileItems.map((f) => `--- File: ${f.name} ---\n${f.content}`).join('\n\n');
      enrichedText = `以下是用户附加的文件上下文：\n\n${fileBlocks}\n\n---\n\n用户消息：${text}`;
    }
    // Include project file tree structure as context
    if (state.activeFileTree) {
      const treeText = buildFileTreeText(state.activeFileTree);
      enrichedText = `当前项目文件结构：\n${treeText}\n\n${enrichedText}`;
    }
    // Inject pinned messages as long-term context
    const pinnedMsgs = allMessages.filter((m) => m.sessionId === sid && m.isPinned);
    if (pinnedMsgs.length > 0) {
      const pinnedText = pinnedMsgs.map((m) => {
        const sender = m.senderType === 'user' ? '用户' : 'Agent';
        return `[${sender}]: ${m.content.slice(0, 200)}`;
      }).join('\n');
      enrichedText = `以下是用户标记的重要上下文（Pinned Messages）：\n${pinnedText}\n\n---\n\n${enrichedText}`;
    }

    const userMsg: MockMessage = { id: crypto.randomUUID(), sessionId: sid, senderType: 'user', senderId: 'user-001', content: text, contentType: 'text', createdAt: new Date().toISOString(), cardData: fileItems.length > 0 ? { attachments: fileItems.map((f) => ({ id: crypto.randomUUID(), name: f.name, type: 'text/plain', size: f.content?.length ?? 0 })) } : undefined };
    setAllMessages((prev) => {
      const next = [...prev, userMsg];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });
    addLog('info', 'Chat', `User: ${text.slice(0, 50)}`);

    // Update session meta (Bug #11)
    state.updateSessionMeta(sid, { lastMessagePreview: text.slice(0, 50) });

    // Save last user message for retry
    lastUserMsgRef.current = text;
    // Send enriched text via WebSocket for real agent response
    const sent = wsSendMessage(enrichedText);
    if (!sent) {
      addLog('error', 'WebSocket', '消息发送失败：WebSocket 未连接，请稍后重试');
      setProcessingStatus({ status: 'error', errorMessage: 'WebSocket 未连接' });
    } else {
      setProcessingStatus({ status: 'sending' });
    }
    // Clear file context items after sending
    setContextItems((prev) => prev.filter((i) => i.type !== 'file'));
  };

  const handleCreateGroup = useCallback(async (title: string, selectedAgentIds: string[]) => {
    // Bug #1: Call backend API to create session, not just local
    const { data: session, error } = await backendData.createSession(title, selectedAgentIds, 'group');
    if (session) {
      state.handleCreateGroup(title, selectedAgentIds, session.id);
    } else {
      addLog('error', 'Session', `群聊创建失败: ${error}`);
    }
    setIsGroupModalOpen(false);
  }, [state.handleCreateGroup, backendData.createSession, addLog]);

  const handleSelectProjectAndExpand = useCallback((projectId: string) => {
    state.handleSelectProject(projectId);
    if (projectId === state.activeProjectId) setIsFilesExpanded((prev) => !prev);
    else setIsFilesExpanded(true);
  }, [state.handleSelectProject, state.activeProjectId]);

  const openSingleChat = useCallback(() => { setIsSingleChat(true); setIsSessionModalOpen(true); }, []);
  const openMultiChat = useCallback(() => { setIsSingleChat(false); setIsSessionModalOpen(true); }, []);

  const handleConfirmSession = useCallback(async (selectedAgentIds: string[], sessionName: string) => {
    // Create session via backend API to get a real session ID for WebSocket
    const { data: session, error } = await backendData.createSession(sessionName, selectedAgentIds, selectedAgentIds.length > 1 ? 'group' : 'single');
    if (session) {
      // Create local session entry with the backend session ID
      state.handleCreateSession(selectedAgentIds, sessionName, session.id);
    } else {
      addLog('error', 'Session', `会话创建失败: ${error}`);
    }
    setIsSessionModalOpen(false);
  }, [state, backendData.createSession, addLog]);

  // Bug #3: Sync session delete to backend
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    state.handleDeleteSession(sessionId);
    backendData.deleteSession(sessionId);
  }, [state.handleDeleteSession, backendData.deleteSession]);

  const handlePinSession = useCallback((sessionId: string) => {
    state.handleTogglePinSession(sessionId);
  }, [state.handleTogglePinSession]);

  const handleArchiveSession = useCallback((sessionId: string) => {
    state.handleToggleArchiveSession(sessionId);
  }, [state.handleToggleArchiveSession]);

  const handleReply = useCallback((messageId: string) => {
    setReplyToId(messageId);
  }, []);

  const handleQuote = useCallback((messageId: string) => {
    const msg = allMessages.find((m) => m.id === messageId);
    if (msg) {
      const quoteText = `> ${msg.content.split('\n').slice(0, 3).join('\n> ')}\n\n`;
      setContextItems((prev) => [...prev, { id: `quote-${crypto.randomUUID()}`, type: 'snippet', name: quoteText }]);
    }
  }, [allMessages]);

  const handleRegenerate = useCallback((messageId: string) => {
    // Find the agent message and the preceding user message
    const msg = allMessages.find((m) => m.id === messageId);
    if (!msg || msg.senderType !== 'agent') return;
    const sessionMsgs = allMessages.filter((m) => m.sessionId === msg.sessionId);
    const msgIndex = sessionMsgs.findIndex((m) => m.id === messageId);
    const lastUserMsg = [...sessionMsgs].slice(0, msgIndex).reverse().find((m) => m.senderType === 'user');
    if (!lastUserMsg) {
      addLog('warn', 'Chat', '无法找到对应的用户消息进行重新生成');
      return;
    }
    // Remove the old agent message
    setAllMessages((prev) => prev.filter((m) => m.id !== messageId));
    addLog('info', 'Chat', `重新生成消息 ${messageId.slice(0, 8)}`);
    // Resend via WebSocket
    const sent = wsSendMessage(lastUserMsg.content);
    if (!sent) {
      addLog('error', 'WebSocket', '重新生成失败：WebSocket 未连接');
    }
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
    setAllMessages((prev) => prev.map((m) => 
      m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
    ));
  }, []);

  const handleClearReply = useCallback(() => {
    setReplyToId(null);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <ProjectDock projects={state.projects} activeProjectId={state.activeProjectId} theme={theme} onSelectProject={handleSelectProjectAndExpand} onOpenProject={state.handleOpenProject} onNewProject={() => setIsCreateProjectOpen(true)} onDeleteProject={state.handleDeleteProject} onThemeChange={setTheme} onOpenSettings={() => setIsSettingsOpen(true)} />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {state.activeProject && state.activeFileTree && (
            <div className={`${isFilesExpanded ? 'w-60' : 'w-0'} h-full border-r border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 shrink-0 bg-zinc-50 dark:bg-zinc-900/30`}>
              <FileExplorer root={state.activeFileTree} activeFileName={activeTab?.name ?? null} onOpenFile={handleOpenFile} onOpenFileTransient={handleOpenFileTransient} onFileAction={state.handleFileAction} onReauthorize={handleReauthorize} />
            </div>
          )}
          {state.activeProject && state.activeFileTree ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex min-h-0">
                <ContextSidebar project={{ ...state.activeProject, fileTree: state.activeFileTree }} activeSessionId={state.activeSessionId} width={contextWidth} onResizeStart={handleResizeStart('context')} onSelectSession={state.setActiveSessionId} onPlusClick={openSingleChat} onOpenGroupModal={() => setIsGroupModalOpen(true)} onDeleteSession={handleDeleteSession} onPinSession={handlePinSession} onArchiveSession={handleArchiveSession} />
                {state.activeSession ? (
                  <ChatArea session={state.activeSession} messages={activeMessages} agents={activeAgents} isRightPanelOpen={isRightPanelOpen} activeTabId={currentTabs.activeTabId} contextItems={contextItems} onContextItemsChange={setContextItems} onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)} onSend={handleSend} onApplyDiff={(diffLines) => { if (state.activeProjectId && currentTabs.activeTabId) injectDiff(state.activeProjectId, currentTabs.activeTabId, diffLines); setIsRightPanelOpen(true); }} onReply={handleReply} onQuote={handleQuote} onRegenerate={handleRegenerate} onPinMessage={handlePinMessage} onStop={handleStopGeneration} onRetry={handleRetryLastMessage} replyToId={replyToId} onClearReply={handleClearReply} fileTree={state.activeFileTree} processingStatus={processingStatus} />
                ) : <EmptyState text="暂无活跃会话" sub="点击左侧 + 按钮创建新会话" />}
                <AgentSidebar agents={activeAgents} isOpen={isRightPanelOpen} width={editorWidth} onResizeStart={handleResizeStart('editor')}>
                  <CodeEditor tabs={currentTabs.tabs} activeTab={activeTab} activeTabId={currentTabs.activeTabId} onSwitch={(id) => state.activeProjectId && setActiveTabId(state.activeProjectId, id)} onClose={(id) => state.activeProjectId && closeTab(state.activeProjectId, id)} onChange={(id, content) => state.activeProjectId && updateTabContent(state.activeProjectId, id, content)} onSave={handleSaveFile} onPinTab={(tabId) => state.activeProjectId && pinTab(state.activeProjectId, tabId)} onAcceptDiff={(tabId) => state.activeProjectId && applyDiff(state.activeProjectId, tabId)} onRejectDiff={(tabId) => state.activeProjectId && rejectDiff(state.activeProjectId, tabId)} />
                </AgentSidebar>
              </div>
            </div>
          ) : <EmptyState text="未检测到活跃项目" sub="点击左上角 📂 图标开启你的 AI 协同工作区" />}
        </div>
        <ConsolePanel isOpen={isConsoleOpen} logs={logs} onClear={() => setLogs([])} onToggle={() => setIsConsoleOpen((p) => !p)} />
      </div>
      <CreateSessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} onConfirm={handleConfirmSession} availableAgents={allAgents} singleSelect={isSingleChat} />
      <CreateGroupModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} availableAgents={allAgents} onCreate={handleCreateGroup} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} agents={backendData.agents.length > 0 ? backendData.agents : allAgents.map((a) => ({ ...a, userId: undefined, adapterType: 'openai', status: 'offline' as const }))} onAddAgent={backendData.createAgent} onUpdateAgent={backendData.updateAgent} onDeleteAgent={backendData.deleteAgent} />
      {showDialog && <FileOperationDialog operations={pendingOps} onApprove={approveOperations} onApproveAll={handleApproveAllFileOps} onReject={rejectOperations} />}
      <CreateProjectModal isOpen={isCreateProjectOpen} onClose={() => setIsCreateProjectOpen(false)} onCreate={(name, icon, fileTree, parentDirHandle) => { state.createProject(name, icon, fileTree, parentDirHandle); setAutoApprove(true); setIsCreateProjectOpen(false); }} />
    </div>
  );
}
