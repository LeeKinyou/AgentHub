'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProjectDock } from '@/components/im/ProjectDock';
import { ContextSidebar } from '@/components/im/ContextSidebar';
import { ChatArea } from '@/components/im/ChatArea';
import { AgentSidebar } from '@/components/im/AgentSidebar';
import { CodeEditor } from '@/components/im/CodeEditor';
import { ConsolePanel } from '@/components/im/ConsolePanel';
import type { LogItem } from '@/components/im/ConsolePanel';
import { CreateSessionModal } from '@/components/im/CreateSessionModal';
import { agents, messages as mockMessages, ARTIFACT_HTML, ARTIFACT_PREFIX, ARTIFACT_SUFFIX } from '@/components/im/mockData';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useTheme } from '@/hooks/useTheme';
import { useProjectState } from '@/hooks/useProjectState';
import type { Message } from '@agenthub/shared/types/entities';

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
  const [allMessages, setAllMessages] = useState<(Message & { isStreaming?: boolean })[]>(mockMessages);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [logs, setLogs] = useState<LogItem[]>(INITIAL_LOGS);
  const [contextWidth, setContextWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(320);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { activeProjectTabs, openTab, closeTab, setActiveTabId, updateTabContent, pinTab, setTabClean, injectDiff, applyDiff, rejectDiff } = useEditorTabs();

  const currentTabs = activeProjectTabs(state.activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;
  const activeMessages = state.activeSessionId ? allMessages.filter((m) => m.sessionId === state.activeSessionId) : [];
  const activeAgents = state.activeSession ? agents.filter((a) => state.activeSession!.agentIds.includes(a.id)) : [];

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
    const userMsg: Message & { isStreaming?: boolean } = { id: crypto.randomUUID(), sessionId: state.activeSessionId, senderType: 'user', senderId: 'user-001', content: text, contentType: 'text', createdAt: new Date().toISOString() };
    setAllMessages((prev) => [...prev, userMsg]);
    addLog('info', 'Chat', `User: ${text.slice(0, 50)}`);
    if (text.trim().toLowerCase() === '/artifact') {
      const aiMsgId = crypto.randomUUID();
      const fullText = ARTIFACT_PREFIX + ARTIFACT_HTML + ARTIFACT_SUFFIX;
      let charIndex = 0;
      setAllMessages((prev) => [...prev, { id: aiMsgId, sessionId: state.activeSessionId!, senderType: 'agent', senderId: 'agent-codex-001', content: '', contentType: 'markdown', createdAt: new Date().toISOString(), isStreaming: true }]);
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      streamTimerRef.current = setInterval(() => {
        charIndex += 8;
        if (charIndex >= fullText.length) { charIndex = fullText.length; if (streamTimerRef.current) { clearInterval(streamTimerRef.current); streamTimerRef.current = null; } }
        setAllMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m));
      }, 30);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <ProjectDock projects={state.projects} activeProjectId={state.activeProjectId} theme={theme} logCount={logs.length} isConsoleOpen={isConsoleOpen} onSelectProject={state.handleSelectProject} onOpenProject={state.handleOpenProject} onNewProject={state.handleNewProject} onDeleteProject={state.handleDeleteProject} onThemeChange={setTheme} onToggleConsole={() => setIsConsoleOpen((p) => !p)} />
      {state.activeProject && state.activeFileTree ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex min-h-0">
            <ContextSidebar project={{ ...state.activeProject, fileTree: state.activeFileTree }} activeSessionId={state.activeSessionId} activeFileName={activeTab?.name ?? null} agents={agents} width={contextWidth} onResizeStart={handleResizeStart('context')} onSelectSession={state.setActiveSessionId} onPlusClick={() => setIsSessionModalOpen(true)} onOpenFolder={state.handleOpenProject} onOpenFile={handleOpenFile} onOpenFileTransient={handleOpenFileTransient} onFileAction={state.handleFileAction} onDeleteSession={state.handleDeleteSession} />
            {state.activeSession ? (
              <ChatArea session={state.activeSession} messages={activeMessages} agents={activeAgents} isRightPanelOpen={isRightPanelOpen} activeTabId={currentTabs.activeTabId} onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)} onSend={handleSend} onApplyDiff={(diffLines) => { if (state.activeProjectId && currentTabs.activeTabId) injectDiff(state.activeProjectId, currentTabs.activeTabId, diffLines); setIsRightPanelOpen(true); }} />
            ) : <EmptyState text="暂无活跃会话" sub="点击左侧 + 按钮创建新会话" />}
            <AgentSidebar agents={activeAgents} isOpen={isRightPanelOpen} width={editorWidth} onResizeStart={handleResizeStart('editor')}>
              <CodeEditor tabs={currentTabs.tabs} activeTab={activeTab} activeTabId={currentTabs.activeTabId} onSwitch={(id) => state.activeProjectId && setActiveTabId(state.activeProjectId, id)} onClose={(id) => state.activeProjectId && closeTab(state.activeProjectId, id)} onChange={(id, content) => state.activeProjectId && updateTabContent(state.activeProjectId, id, content)} onSave={handleSaveFile} onPinTab={(tabId) => state.activeProjectId && pinTab(state.activeProjectId, tabId)} onAcceptDiff={(tabId) => state.activeProjectId && applyDiff(state.activeProjectId, tabId)} onRejectDiff={(tabId) => state.activeProjectId && rejectDiff(state.activeProjectId, tabId)} />
            </AgentSidebar>
          </div>
          <ConsolePanel isOpen={isConsoleOpen} logs={logs} onClear={() => setLogs([])} onClose={() => setIsConsoleOpen(false)} />
        </div>
      ) : <EmptyState text="未检测到活跃项目" sub="点击左上角 📂 图标开启你的 AI 协同工作区" />}
      <CreateSessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} onConfirm={state.handleCreateSession} availableAgents={agents} />
    </div>
  );
}
