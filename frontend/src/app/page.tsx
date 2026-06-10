'use client';

import { useState, useEffect } from 'react';
import { ProjectDock } from '@/components/im/ProjectDock';
import { FileExplorer } from '@/components/im/FileExplorer';
import { ContextSidebar } from '@/components/im/ContextSidebar';
import { ChatArea } from '@/components/im/ChatArea';
import { AgentSidebar } from '@/components/im/AgentSidebar';
import { CodeEditor } from '@/components/im/CodeEditor';
import { ConsolePanel } from '@/components/im/ConsolePanel';
import { CreateSessionModal } from '@/components/im/CreateSessionModal';
import { CreateGroupModal } from '@/components/im/CreateGroupModal';
import { SettingsModal } from '@/components/im/SettingsModal';
import { FileOperationDialog } from '@/components/im/FileOperationDialog';
import { CreateProjectModal } from '@/components/im/CreateProjectModal';
import { MainLayout } from '@/components/im/MainLayout';
import { useAppState } from '@/hooks/useAppState';

function EmptyState({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-minimal-secondary">
      <div className="w-16 h-16 rounded-minimal bg-minimal-bg border border-minimal-border flex items-center justify-center"><span className="text-2xl">📂</span></div>
      <div className="text-center space-y-1"><p className="text-sm text-minimal-text">{text}</p><p className="text-xs text-minimal-secondary">{sub}</p></div>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div className="flex h-screen w-screen bg-minimal-bg dark:bg-minimal-dark-bg" />;
  }

  return <HomeContent />;
}

function HomeContent() {
  const s = useAppState();

  return (
    <>
      <MainLayout
        projectDock={<ProjectDock projects={s.state.projects} activeProjectId={s.state.activeProjectId} theme={s.theme} onSelectProject={s.handleSelectProjectAndExpand} onOpenProject={s.state.handleOpenProject} onNewProject={() => s.setIsCreateProjectOpen(true)} onDeleteProject={s.state.handleDeleteProject} onThemeChange={s.setTheme} onOpenSettings={() => s.setIsSettingsOpen(true)} />}
        fileExplorer={s.state.activeProject && (s.state.activeFileTree || s.state.needsReauth[s.state.activeProjectId!]) ? <FileExplorer root={s.state.activeFileTree ?? { name: s.state.activeProject!.name, type: 'dir', children: [] }} activeFileName={s.activeTab?.name ?? null} onOpenFile={s.handleOpenFile} onOpenFileTransient={s.handleOpenFileTransient} onFileAction={s.state.handleFileAction} onReauthorize={s.handleReauthorize} needsReauth={!!s.state.needsReauth[s.state.activeProjectId!]} /> : undefined}
        contextSidebar={s.state.activeProject && s.state.activeFileTree ? <ContextSidebar project={{ ...s.state.activeProject, fileTree: s.state.activeFileTree, sessions: s.mergedSessions }} activeSessionId={s.state.activeSessionId} width={s.contextWidth} onResizeStart={s.handleResizeStart('context')} onSelectSession={s.state.setActiveSessionId} onPlusClick={s.openSingleChat} onOpenGroupModal={() => s.setIsGroupModalOpen(true)} onDeleteSession={s.handleDeleteSession} onPinSession={s.handlePinSession} onArchiveSession={s.handleArchiveSession} /> : <EmptyState text="未检测到活跃项目" sub="点击左上角 📂 图标开启你的 AI 协同工作区" />}
        chatArea={s.activeSession ? <ChatArea session={s.activeSession} messages={s.activeMessages} agents={s.activeAgents} isRightPanelOpen={s.isRightPanelOpen} activeTabId={s.currentTabs.activeTabId} contextItems={s.contextItems} onContextItemsChange={s.setContextItems} onToggleRightPanel={() => s.setIsRightPanelOpen(!s.isRightPanelOpen)} onSend={s.handleSend} onApplyDiff={(diffLines) => { if (s.state.activeProjectId && s.currentTabs.activeTabId) s.injectDiff(s.state.activeProjectId, s.currentTabs.activeTabId, diffLines); s.setIsRightPanelOpen(true); }} onReply={s.handleReply} onQuote={s.handleQuote} onRegenerate={s.handleRegenerate} onPinMessage={s.handlePinMessage} onStop={s.handleStopGeneration} onRetry={s.handleRetryLastMessage} replyToId={s.replyToId} onClearReply={s.handleClearReply} fileTree={s.state.activeFileTree} processingStatus={s.processingStatus} onFileUploaded={s.handleFileUploaded} /> : <EmptyState text="暂无活跃会话" sub="点击左侧 + 按钮创建新会话" />}
        rightPanel={<AgentSidebar agents={s.activeAgents} isOpen={s.isRightPanelOpen} width={s.editorWidth} onResizeStart={s.handleResizeStart('editor')} agentStatuses={s.agentStatuses}><CodeEditor tabs={s.currentTabs.tabs} activeTab={s.activeTab} activeTabId={s.currentTabs.activeTabId} onSwitch={(id) => s.state.activeProjectId && s.setActiveTabId(s.state.activeProjectId, id)} onClose={(id) => s.state.activeProjectId && s.closeTab(s.state.activeProjectId, id)} onChange={(id, content) => s.state.activeProjectId && s.updateTabContent(s.state.activeProjectId, id, content)} onSave={s.handleSaveFile} onPinTab={(tabId) => s.state.activeProjectId && s.pinTab(s.state.activeProjectId, tabId)} onAcceptDiff={(tabId) => s.state.activeProjectId && s.applyDiff(s.state.activeProjectId, tabId)} onRejectDiff={(tabId) => s.state.activeProjectId && s.rejectDiff(s.state.activeProjectId, tabId)} /></AgentSidebar>}
        isFilesExpanded={s.isFilesExpanded}
        isRightPanelOpen={s.isRightPanelOpen}
      />
      <ConsolePanel isOpen={s.isConsoleOpen} logs={s.logs} onClear={() => s.setLogs([])} onToggle={() => s.setIsConsoleOpen((p) => !p)} />
      <CreateSessionModal isOpen={s.isSessionModalOpen} onClose={() => s.setIsSessionModalOpen(false)} onConfirm={s.handleConfirmSession} availableAgents={s.allAgents} singleSelect={s.isSingleChat} />
      <CreateGroupModal isOpen={s.isGroupModalOpen} onClose={() => s.setIsGroupModalOpen(false)} availableAgents={s.allAgents} onCreate={s.handleCreateGroup} />
      <SettingsModal isOpen={s.isSettingsOpen} onClose={() => s.setIsSettingsOpen(false)} agents={s.backendData.agents.length > 0 ? s.backendData.agents : s.allAgents.map((a) => ({ ...a, userId: undefined, adapterType: 'openai', status: 'offline' as const }))} onAddAgent={s.backendData.createAgent} onUpdateAgent={s.backendData.updateAgent} onDeleteAgent={s.backendData.deleteAgent} />
      {s.showDialog && <FileOperationDialog operations={s.pendingOps} onApprove={s.approveOperations} onApproveAll={s.handleApproveAllFileOps} onReject={s.rejectOperations} />}
      <CreateProjectModal isOpen={s.isCreateProjectOpen} onClose={() => s.setIsCreateProjectOpen(false)} onCreate={(name, icon, fileTree, parentDirHandle) => { s.state.createProject(name, icon, fileTree, parentDirHandle); s.setIsCreateProjectOpen(false); }} />
    </>
  );
}
