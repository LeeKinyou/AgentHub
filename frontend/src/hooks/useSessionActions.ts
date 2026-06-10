'use client';

import { useCallback } from 'react';
import type { LogItem } from '@/components/im/ConsolePanel';

interface UseSessionActionsParams {
  handleCreateGroup: (title: string, selectedAgentIds: string[], backendSessionId?: string) => void;
  handleCreateSession: (selectedAgentIds: string[], sessionName: string, backendSessionId?: string) => void;
  handleDeleteSession: (sessionId: string) => void;
  handleTogglePinSession: (sessionId: string) => void;
  handleToggleArchiveSession: (sessionId: string) => void;
  handleSelectProject: (projectId: string) => void;
  activeProjectId: string | null;
  activeProject: { sessions: Array<{ id: string; isPinned?: boolean; isArchived?: boolean }> } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createSession: (title: string, agentIds: string[], type?: 'single' | 'group') => Promise<any>;
  deleteSession: (id: string) => void;
  updateSessionPin: (id: string, isPinned: boolean) => void;
  updateSessionArchive: (id: string, isArchived: boolean) => void;
  setSessionModalOpen: (v: boolean) => void;
  setGroupModalOpen: (v: boolean) => void;
  setFilesExpanded: (v: boolean) => void;
  toggleFilesExpanded: () => void;
  addLog: (type: LogItem['type'], source: string, message: string) => void;
}

export function useSessionActions(params: UseSessionActionsParams) {
  const {
    handleCreateGroup: stateCreateGroup, handleCreateSession: stateCreateSession,
    handleDeleteSession: stateDeleteSession, handleTogglePinSession, handleToggleArchiveSession,
    handleSelectProject, activeProjectId, activeProject,
    createSession, deleteSession, updateSessionPin, updateSessionArchive,
    setSessionModalOpen, setGroupModalOpen, setFilesExpanded, toggleFilesExpanded, addLog,
  } = params;

  const handleCreateGroup = useCallback(async (title: string, selectedAgentIds: string[]) => {
    const { data: session, error } = await createSession(title, selectedAgentIds, 'group');
    if (session) stateCreateGroup(title, selectedAgentIds, session.id);
    else addLog('error', 'Session', `群聊创建失败: ${error}`);
    setGroupModalOpen(false);
  }, [stateCreateGroup, createSession, addLog, setGroupModalOpen]);

  const handleSelectProjectAndExpand = useCallback((projectId: string) => {
    handleSelectProject(projectId);
    if (projectId === activeProjectId) toggleFilesExpanded();
    else setFilesExpanded(true);
  }, [handleSelectProject, activeProjectId, setFilesExpanded, toggleFilesExpanded]);

  const handleConfirmSession = useCallback(async (selectedAgentIds: string[], sessionName: string) => {
    const { data: session, error } = await createSession(sessionName, selectedAgentIds, selectedAgentIds.length > 1 ? 'group' : 'single');
    if (session) stateCreateSession(selectedAgentIds, sessionName, session.id);
    else addLog('error', 'Session', `会话创建失败: ${error}`);
    setSessionModalOpen(false);
  }, [stateCreateSession, createSession, addLog, setSessionModalOpen]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    stateDeleteSession(sessionId);
    deleteSession(sessionId);
  }, [stateDeleteSession, deleteSession]);

  const handlePinSession = useCallback((sessionId: string) => {
    handleTogglePinSession(sessionId);
    const session = activeProject?.sessions.find((s) => s.id === sessionId);
    if (session) updateSessionPin(sessionId, !session.isPinned);
  }, [handleTogglePinSession, activeProject, updateSessionPin]);

  const handleArchiveSession = useCallback((sessionId: string) => {
    handleToggleArchiveSession(sessionId);
    const session = activeProject?.sessions.find((s) => s.id === sessionId);
    if (session) updateSessionArchive(sessionId, !session.isArchived);
  }, [handleToggleArchiveSession, activeProject, updateSessionArchive]);

  return {
    handleCreateGroup, handleSelectProjectAndExpand, handleConfirmSession,
    handleDeleteSession, handlePinSession, handleArchiveSession,
  };
}
