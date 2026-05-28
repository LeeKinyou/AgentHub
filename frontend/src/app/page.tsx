'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProjectDock } from '@/components/im/ProjectDock';
import { ContextSidebar } from '@/components/im/ContextSidebar';
import { ChatArea } from '@/components/im/ChatArea';
import { AgentSidebar } from '@/components/im/AgentSidebar';
import { CodeEditor } from '@/components/im/CodeEditor';
import { CreateSessionModal } from '@/components/im/CreateSessionModal';
import { agents, messages as mockMessages } from '@/components/im/mockData';
import { openDirectoryPicker } from '@/components/im/fileSystemUtils';
import { useEditorTabs } from '@/hooks/useEditorTabs';
import { useTheme } from '@/hooks/useTheme';
import type { Project } from '@/components/im/mockProjects';
import type { Message, Session } from '@agenthub/shared/types/entities';
import type { FileNode } from '@/components/im/mockFiles';

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-400 dark:text-zinc-600">
      <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
        <span className="text-3xl">📂</span>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
        <p className="text-xs text-zinc-400 dark:text-zinc-600">{sub}</p>
      </div>
    </div>
  );
}

const ARTIFACT_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); font-family: 'Segoe UI', sans-serif; overflow: hidden; }
  .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; text-align: center; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.3); transition: transform 0.3s; }
  .card:hover { transform: translateY(-5px); }
  .clock { font-size: 64px; font-weight: 200; letter-spacing: 4px; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s ease-in-out infinite; }
  @keyframes shimmer { 0%,100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(90deg); } }
  .label { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 8px; letter-spacing: 6px; text-transform: uppercase; }
  .dots { display: flex; justify-content: center; gap: 8px; margin-top: 24px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
  .dot:nth-child(1) { background: #667eea; animation-delay: 0s; }
  .dot:nth-child(2) { background: #764ba2; animation-delay: 0.3s; }
  .dot:nth-child(3) { background: #f093fb; animation-delay: 0.6s; }
  @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.3); opacity: 1; } }
  .btn { margin-top: 20px; padding: 10px 28px; border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; background: transparent; color: #fff; cursor: pointer; transition: all 0.3s; }
  .btn:hover { background: rgba(255,255,255,0.1); border-color: #667eea; }
</style>
</head>
<body>
<div class="card">
  <div class="clock" id="clock">00:00:00</div>
  <div class="label">Digital Clock</div>
  <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <button class="btn" onclick="document.querySelector('.clock').style.animationDuration = document.querySelector('.clock').style.animationDuration === '0.5s' ? '3s' : '0.5s'">✨ Toggle Speed</button>
</div>
<script>
  function update() {
    const d = new Date();
    document.getElementById('clock').textContent =
      [d.getHours(),d.getMinutes(),d.getSeconds()].map(v => String(v).padStart(2,'0')).join(':');
  }
  update(); setInterval(update, 1000);
</script>
</body>
</html>`;

const ARTIFACT_PREFIX = '好的，我为你生成了一个炫酷的数字时钟 HTML 艺术品：\n\n```html\n';
const ARTIFACT_SUFFIX = '\n```\n\n你可以点击 Preview 标签页查看实时效果，支持鼠标交互！';

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<(Message & { isStreaming?: boolean })[]>(mockMessages);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [realFileTrees, setRealFileTrees] = useState<Record<string, FileNode>>({});
  const [contextWidth, setContextWidth] = useState(260);
  const [editorWidth, setEditorWidth] = useState(320);
  const streamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { activeProjectTabs, openTab, closeTab, setActiveTabId, updateTabContent, setTabClean, injectDiff, applyDiff, rejectDiff } = useEditorTabs();

  const currentTabs = activeProjectTabs(activeProjectId);
  const activeTab = currentTabs.tabs.find((t) => t.id === currentTabs.activeTabId) ?? null;

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeSession = activeProject?.sessions.find((s) => s.id === activeSessionId) ?? activeProject?.sessions[0] ?? null;
  const activeMessages = activeSessionId ? allMessages.filter((m) => m.sessionId === activeSessionId) : [];
  const activeAgents = activeSession ? agents.filter((a) => activeSession.agentIds.includes(a.id)) : [];
  const activeFileTree = activeProjectId ? (realFileTrees[activeProjectId] ?? activeProject?.fileTree) : null;

  const resizeRef = useRef<{ type: 'context' | 'editor'; startX: number; startW: number } | null>(null);

  const handleResizeStart = useCallback((type: 'context' | 'editor') => (e: React.MouseEvent) => {
    e.preventDefault();
    const startW = type === 'context' ? contextWidth : editorWidth;
    resizeRef.current = { type, startX: e.clientX, startW };
    const handleMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      if (resizeRef.current.type === 'context') setContextWidth(Math.min(450, Math.max(200, resizeRef.current.startW + delta)));
      else setEditorWidth(Math.min(600, Math.max(240, resizeRef.current.startW - delta)));
    };
    const handleMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [contextWidth, editorWidth]);

  useEffect(() => {
    return () => { if (streamTimerRef.current) clearInterval(streamTimerRef.current); };
  }, []);

  const handleSelectProject = (projectId: string) => {
    setActiveProjectId(projectId);
    setActiveSessionId(projects.find((p) => p.id === projectId)?.sessions[0]?.id ?? null);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (activeProjectId === projectId) { setActiveProjectId(null); setActiveSessionId(null); }
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, sessions: p.sessions.filter((s) => s.id !== sessionId) } : p)));
    if (activeSessionId === sessionId) {
      const remaining = activeProject?.sessions.filter((s) => s.id !== sessionId) ?? [];
      setActiveSessionId(remaining[0]?.id ?? null);
    }
  };

  const handleOpenProject = async () => {
    const fileTree = await openDirectoryPicker();
    if (!fileTree) return;
    const newProject: Project = { id: crypto.randomUUID(), name: fileTree.name, icon: '📁', fileTree, sessions: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveSessionId(null);
  };

  const handleNewProject = () => {
    const newProject: Project = { id: crypto.randomUUID(), name: '未命名项目', icon: '✨', fileTree: { name: 'untitled', type: 'dir', children: [] }, sessions: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveSessionId(null);
  };

  const handleOpenFile = async (name: string, handle: FileSystemFileHandle) => {
    if (!activeProjectId) return;
    await openTab(activeProjectId, name, handle);
    setIsRightPanelOpen(true);
  };

  const handleSaveFile = useCallback(async (tab: { id: string; handle: FileSystemFileHandle; content: string }) => {
    if (!activeProjectId) return;
    try {
      const writable = await tab.handle.createWritable();
      await writable.write(tab.content);
      await writable.close();
      setTabClean(activeProjectId, tab.id);
    } catch (err) {
      console.error('保存文件失败:', err);
    }
  }, [activeProjectId, setTabClean]);

  const handleSend = (text: string) => {
    if (!activeSessionId) return;
    const userMsg: Message & { isStreaming?: boolean } = {
      id: crypto.randomUUID(), sessionId: activeSessionId, senderType: 'user', senderId: 'user-001',
      content: text, contentType: 'text', createdAt: new Date().toISOString(),
    };
    setAllMessages((prev) => [...prev, userMsg]);
    if (text.trim().toLowerCase() === '/artifact') {
      const aiMsgId = crypto.randomUUID();
      const fullText = ARTIFACT_PREFIX + ARTIFACT_HTML + ARTIFACT_SUFFIX;
      let charIndex = 0;
      setAllMessages((prev) => [...prev, {
        id: aiMsgId, sessionId: activeSessionId, senderType: 'agent', senderId: 'agent-codex-001',
        content: '', contentType: 'markdown', createdAt: new Date().toISOString(), isStreaming: true,
      }]);
      if (streamTimerRef.current) clearInterval(streamTimerRef.current);
      streamTimerRef.current = setInterval(() => {
        charIndex += 8;
        if (charIndex >= fullText.length) {
          charIndex = fullText.length;
          if (streamTimerRef.current) { clearInterval(streamTimerRef.current); streamTimerRef.current = null; }
        }
        setAllMessages((prev) => prev.map((m) => m.id === aiMsgId ? { ...m, content: fullText.slice(0, charIndex), isStreaming: charIndex < fullText.length } : m));
        if (charIndex >= fullText.length && streamTimerRef.current) { clearInterval(streamTimerRef.current); streamTimerRef.current = null; }
      }, 30);
    }
  };

  const handleCreateSession = (selectedAgentIds: string[], sessionName: string) => {
    if (!activeProjectId) return;
    const newSession: Session = {
      id: crypto.randomUUID(), title: sessionName,
      type: selectedAgentIds.length > 1 ? 'group' : 'single',
      agentIds: selectedAgentIds, createdAt: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, sessions: [...p.sessions, newSession] } : p)));
    setActiveSessionId(newSession.id);
    setIsSessionModalOpen(false);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200">
      <ProjectDock projects={projects} activeProjectId={activeProjectId} theme={theme} onSelectProject={handleSelectProject} onOpenProject={handleOpenProject} onNewProject={handleNewProject} onDeleteProject={handleDeleteProject} onThemeChange={setTheme} />
      {activeProject && activeFileTree ? (
        <>
          <ContextSidebar project={{ ...activeProject, fileTree: activeFileTree }} activeSessionId={activeSessionId} activeFileName={activeTab?.name ?? null} agents={agents} width={contextWidth} onResizeStart={handleResizeStart('context')} onSelectSession={setActiveSessionId} onPlusClick={() => setIsSessionModalOpen(true)} onOpenFolder={handleOpenProject} onOpenFile={handleOpenFile} onDeleteSession={handleDeleteSession} />
          {activeSession ? (
            <ChatArea session={activeSession} messages={activeMessages} agents={activeAgents} isRightPanelOpen={isRightPanelOpen} activeTabId={currentTabs.activeTabId} onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)} onSend={handleSend} onApplyDiff={(diffLines) => { if (activeProjectId && currentTabs.activeTabId) injectDiff(activeProjectId, currentTabs.activeTabId, diffLines); setIsRightPanelOpen(true); }} />
          ) : (
            <EmptyState text="暂无活跃会话" sub="点击左侧 + 按钮创建新会话" />
          )}
          <AgentSidebar agents={activeAgents} isOpen={isRightPanelOpen} width={editorWidth} onResizeStart={handleResizeStart('editor')}>
            <CodeEditor tabs={currentTabs.tabs} activeTab={activeTab} activeTabId={currentTabs.activeTabId} onSwitch={(id) => activeProjectId && setActiveTabId(activeProjectId, id)} onClose={(id) => activeProjectId && closeTab(activeProjectId, id)} onChange={(id, content) => activeProjectId && updateTabContent(activeProjectId, id, content)} onSave={handleSaveFile} onAcceptDiff={(tabId) => activeProjectId && applyDiff(activeProjectId, tabId)} onRejectDiff={(tabId) => activeProjectId && rejectDiff(activeProjectId, tabId)} />
          </AgentSidebar>
        </>
      ) : (
        <EmptyState text="未检测到活跃项目" sub="点击左上角 📂 图标开启你的 AI 协同工作区" />
      )}
      <CreateSessionModal isOpen={isSessionModalOpen} onClose={() => setIsSessionModalOpen(false)} onConfirm={handleCreateSession} availableAgents={agents} />
    </div>
  );
}