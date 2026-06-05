'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProjectDock } from '@/components/im/ProjectDock';
import { FileExplorer } from '@/components/im/FileExplorer';
import { ContextSidebar } from '@/components/im/ContextSidebar';
import { ChatArea } from '@/components/im/ChatArea';
import { AgentSidebar } from '@/components/im/AgentSidebar';
import { CodeEditor } from '@/components/im/CodeEditor';
import type { LogItem } from '@/components/im/ConsolePanel';
import { ConsolePanel } from '@/components/im/ConsolePanel';
import type { ContextItem } from '@/components/im/InputContextArea';
import { CreateSessionModal } from '@/components/im/CreateSessionModal';
import { CreateGroupModal } from '@/components/im/CreateGroupModal';
import { SettingsModal } from '@/components/im/SettingsModal';
import { agents as defaultAgents, messages as mockMessages, ARTIFACT_HTML, ARTIFACT_PREFIX, ARTIFACT_SUFFIX } from '@/components/im/mockData';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { getMockResponses, type MockMessage } from '@/mock/mockScripts';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useTheme } from '@/hooks/useTheme';
import { useProjectState } from '@/hooks/useProjectState';

const INITIAL_LOGS: LogItem[] = [
  { id: '1', type: 'success', source: 'System', message: 'Web Access Token Initialized.', timestamp: new Date().toISOString() },
  { id: '2', type: 'info', source: 'Agent', message: 'Orchestrator is standing by.', timestamp: new Date().toISOString() },
  { id: '3', type: 'warn', source: 'Runtime', message: 'Telemetry pipeline idle — no active sessions.', timestamp: new Date().toISOString() },
];

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 dark:text-zinc-600">
      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><span className="text-3xl">📂</span></div>
      <div className="text-center space-y-1"><p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p><p className="text-xs text-zinc-400 dark:text-zinc-600">{sub}</p></div>
    </div>
  );
}

export default function Home() {
  const { theme, setTheme } = useTheme();
  const state = useProjectState();
  const [allMessages, setAllMessages] = useState<MockMessage[]>(mockMessages as MockMessage[]);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isSingleChat, setIsSingleChat] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentProfile[]>(defaultAgents);
  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [contextWidth, setContextWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(320);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { activeProjectTabs, openTab, closeTab, setActiveTabId, updateTabContent, pinTab, setTabClean, injectDiff, applyDiff, rejectDiff } = useEditorTabs();

  const currentTabs = activeProjectTabs(state.activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;
  const activeMessages = state.activeSessionId ? allMessages.filter((m) => m.sessionId === state.activeSessionId) : [];
  const activeAgents = state.activeSession ? allAgents.filter((a) => state.activeSession!.agentIds.includes(a.id)) : [];

  const addLog = useCallback((type: LogItem['type'], source: string, message: string) => {
    setLogs((prev) => [...prev, { id: crypto.randomUUID(), type, source, message, timestamp: new Date().toISOString() }]);
  }, []);

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
    addLog('info', 'Session', `Switched to session ${state.activeSessionId ?? 'none'}`);
  }, [state.activeSessionId]);

  const handleOpenFileTransient = async (name: string, handle: FileSystemFileHandle) => {
    try { await openTab(state.activeProjectId!, name, handle, true); setIsRightPanelOpen(true); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  };

  const handleOpenFile = async (name: string, handle: FileSystemFileHandle) => {
    try { await openTab(state.activeProjectId!, name, handle, false); setIsRightPanelOpen(true); addLog('info', 'Editor', `Opened ${name}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  };

  const handleSaveFile = useCallback(async (tab: { id: string; handle: FileSystemFileHandle; content: string }) => {
    if (!state.activeProjectId) return;
    try { const w = await tab.handle.createWritable(); await w.write(tab.content); await w.close(); setTabClean(state.activeProjectId, tab.id); addLog('success', 'FileIO', `Saved ${tab.id}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '文件句柄已失效，请重新打开文件夹授权' : '保存文件失败'; addLog('error', 'FileIO', msg); }
  }, [state.activeProjectId, setTabClean, addLog]);

  const handleSend = (text: string) => {
    if (!state.activeSessionId) return;
    const sid = state.activeSessionId;
    const userMsg: MockMessage = { id: crypto.randomUUID(), sessionId: sid, senderType: 'user', senderId: 'user-001', content: text, contentType: 'text', createdAt: new Date().toISOString() };
    setAllMessages((prev) => [...prev, userMsg]);
    addLog('info', 'Chat', `User: ${text.slice(0, 50)}`);

    const mock = getMockResponses(text, sid);
    if (mock) {
      setAllMessages((prev) => [...prev, ...mock]);
      mock.forEach((m) => addLog('info', 'Mock', `[${m.senderId}] ${m.content.slice(0, 40)}`));
      const deployMsg = mock.find((m) => m.deployStatus === 'building');
      if (deployMsg) {
        setTimeout(() => {
          setAllMessages((prev) => prev.map((m) => m.id === deployMsg.id ? { ...m, deployStatus: 'success' as const } : m));
          addLog('success', 'Deploy', 'Deployment succeeded');
        }, 2000);
      }
      return;
    }

    if (text.trim().toLowerCase() === '/artifact') {
      const aiMsgId = crypto.randomUUID();
      const fullText = ARTIFACT_PREFIX + ARTIFACT_HTML + ARTIFACT_SUFFIX;
      let charIndex = 0;
      setAllMessages((prev) => [...prev, { id: aiMsgId, sessionId: sid, senderType: 'agent', senderId: 'agent-codex-001', content: '', contentType: 'markdown', createdAt: new Date().toISOString(), isStreaming: true }]);
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      streamTimerRef.current = setInterval(() => {
        charIndex += 8;
        if (charIndex >= fullText.length) { charIndex = fullText.length; if (streamTimerRef.current) { clearInterval(streamTimerRef.current); streamTimerRef.current = null; } }
        setAllMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m));
      }, 30);
    }
  };

  const handleCreateGroup = useCallback((title: string, selectedAgentIds: string[]) => {
    state.handleCreateGroup(title, selectedAgentIds);
    setIsGroupModalOpen(false);
  }, [state.handleCreateGroup]);

  const handleSelectProjectAndExpand = useCallback((projectId: string) => {
    state.handleSelectProject(projectId);
    if (projectId === state.activeProjectId) setIsFilesExpanded((prev) => !prev);
    else setIsFilesExpanded(true);
  }, [state.handleSelectProject, state.activeProjectId]);

  const openSingleChat = useCallback(() => { setIsSingleChat(true); setIsSessionModalOpen(true); }, []);
  const openMultiChat = useCallback(() => { setIsSingleChat(false); setIsSessionModalOpen(true); }, []);

  const handleConfirmSession = useCallback((selectedAgentIds: string[], sessionName: string) => {
    state.handleCreateSession(selectedAgentIds, sessionName);
    setIsSessionModalOpen(false);
  }, [state.handleCreateSession]);

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
    addLog('info', 'Chat', `Regenerating message ${messageId}`);
  }, [addLog]);

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
      <ProjectDock projects={state.projects} activeProjectId={state.activeProjectId} theme={theme} onSelectProject={handleSelectProjectAndExpand} onOpenProject={state.handleOpenProject} onNewProject={state.handleNewProject} onDeleteProject={state.handleDeleteProject} onThemeChange={setTheme} onOpenSettings={() => setIsSettingsOpen(true)} />
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {state.activeProject && state.activeFileTree && (
            <div className={`${isFilesExpanded ? 'w-60' : 'w-0'} h-full border-r border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-200 shrink-0 bg-zinc-50 dark:bg-zinc-900/30`}>
              <FileExplorer root={state.activeFileTree} activeFileName={activeTab?.name ?? null} onOpenFile={handleOpenFile} onOpenFileTransient={handleOpenFileTransient} onFileAction={state.handleFileAction} />
            </div>
          )}
          {state.activeProject && state.activeFileTree ? (
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex min-h-0">
                <ContextSidebar project={{ ...state.activeProject, fileTree: state.activeFileTree }} activeSessionId={state.activeSessionId} width={contextWidth} onResizeStart={handleResizeStart('context')} onSelectSession={state.setActiveSessionId} onPlusClick={openSingleChat} onOpenGroupModal={() => setIsGroupModalOpen(true)} onDeleteSession={state.handleDeleteSession} onPinSession={handlePinSession} onArchiveSession={handleArchiveSession} />
                {state.activeSession ? (
                  <ChatArea session={state.activeSession} messages={activeMessages} agents={activeAgents} isRightPanelOpen={isRightPanelOpen} activeTabId={currentTabs.activeTabId} contextItems={contextItems} onContextItemsChange={setContextItems} onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)} onSend={handleSend} onApplyDiff={(diffLines) => { if (state.activeProjectId && currentTabs.activeTabId) injectDiff(state.activeProjectId, currentTabs.activeTabId, diffLines); setIsRightPanelOpen(true); }} onReply={handleReply} onQuote={handleQuote} onRegenerate={handleRegenerate} onPinMessage={handlePinMessage} replyToId={replyToId} onClearReply={handleClearReply} />
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
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} agents={allAgents} onAddAgent={(agent) => setAllAgents((prev) => [...prev, agent])} onDeleteAgent={(id) => setAllAgents((prev) => prev.filter((a) => a.id !== id))} />
    </div>
  );
}
