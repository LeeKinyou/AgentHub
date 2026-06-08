'use client';

import { useState, useEffect, useCallback } from 'react';
import { openDirectoryPicker, traverseDirectory } from '@/components/im/fileSystemUtils';
import type { Project } from '@/components/im/mockProjects';
import type { Session } from '@agenthub/shared/types/entities';
import type { FileNode } from '@/components/im/mockFiles';
import { saveDirHandle, getDirHandle, deleteDirHandle } from '@/utils/handleStore';

const KEYS = {
  projects: 'agenthub_projects',
  activeProjectId: 'agenthub_active_project_id',
  activeSessionId: 'agenthub_active_session_id',
} as const;

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function useProjectState() {
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage(KEYS.projects, []));
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => loadFromStorage(KEYS.activeProjectId, null));
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => loadFromStorage(KEYS.activeSessionId, null));
  const [realFileTrees, setRealFileTrees] = useState<Record<string, FileNode>>({});

  useEffect(() => { localStorage.setItem(KEYS.projects, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(KEYS.activeProjectId, JSON.stringify(activeProjectId)); }, [activeProjectId]);
  useEffect(() => { localStorage.setItem(KEYS.activeSessionId, JSON.stringify(activeSessionId)); }, [activeSessionId]);

  const activeProject = projects.find((p) => p.id === activeProjectId) ?? null;
  const activeSession = activeProject?.sessions.find((s) => s.id === activeSessionId) ?? null;
  const activeFileTree = activeProjectId ? (realFileTrees[activeProjectId] ?? activeProject?.fileTree) : null;

  // Restore file trees from IndexedDB handles on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const proj of projects) {
        if (cancelled) break;
        if (realFileTrees[proj.id]) continue; // already have a live tree
        try {
          const dirHandle = await getDirHandle(proj.id);
          if (dirHandle && !cancelled) {
            const children = await traverseDirectory(dirHandle);
            if (!cancelled && children.length > 0) {
              const tree: FileNode = { name: dirHandle.name, type: 'dir', children, dirHandle };
              setRealFileTrees((prev) => ({ ...prev, [proj.id]: tree }));
            }
          }
        } catch { /* ignore */ }
      }
    })();
    return () => { cancelled = true; };
  }, [projects]);

  // Sync activeSessionId if it becomes stale (e.g., session deleted externally)
  useEffect(() => {
    if (activeProject && activeSessionId && !activeProject.sessions.find((s) => s.id === activeSessionId)) {
      setActiveSessionId(activeProject.sessions[0]?.id ?? null);
    }
  }, [activeProject, activeSessionId]);

  const handleSelectProject = useCallback((projectId: string) => {
    setActiveProjectId(projectId);
    setActiveSessionId(projects.find((p) => p.id === projectId)?.sessions[0]?.id ?? null);
  }, [projects]);

  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setRealFileTrees((prev) => { const next = { ...prev }; delete next[projectId]; return next; });
    if (activeProjectId === projectId) { setActiveProjectId(null); setActiveSessionId(null); }
    deleteDirHandle(projectId).catch(() => {});
  }, [activeProjectId]);

  const handleDeleteSession = useCallback((sessionId: string) => {
    if (!activeProjectId) return;
    let nextActiveId: string | null | undefined;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== activeProjectId) return p;
      const remaining = p.sessions.filter((s) => s.id !== sessionId);
      if (activeSessionId === sessionId) {
        nextActiveId = remaining[0]?.id ?? null;
      }
      return { ...p, sessions: remaining };
    }));
    if (nextActiveId !== undefined) {
      setActiveSessionId(nextActiveId);
    }
  }, [activeProjectId, activeSessionId]);

  const handleOpenProject = useCallback(async () => {
    const fileTree = await openDirectoryPicker();
    if (!fileTree) return;
    const newId = crypto.randomUUID();
    const newProject: Project = { id: newId, name: fileTree.name, icon: '📁', fileTree, sessions: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newId);
    setActiveSessionId(null);
    setRealFileTrees((prev) => ({ ...prev, [newId]: fileTree }));
    if (fileTree.dirHandle) {
      await saveDirHandle(newId, fileTree.dirHandle);
    }
  }, []);

  const handleNewProject = useCallback(() => {
    const newProject: Project = { id: crypto.randomUUID(), name: '未命名项目', icon: '✨', fileTree: { name: 'untitled', type: 'dir', children: [] }, sessions: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newProject.id);
    setActiveSessionId(null);
  }, []);

  const createProject = useCallback(async (name: string, icon: string, fileTree: FileNode, parentDirHandle?: FileSystemDirectoryHandle) => {
    const newId = crypto.randomUUID();
    const newProject: Project = { id: newId, name, icon, fileTree, sessions: [] };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectId(newId);
    setActiveSessionId(null);
    setRealFileTrees((prev) => ({ ...prev, [newId]: fileTree }));
    if (parentDirHandle) {
      await saveDirHandle(newId, parentDirHandle);
    }
  }, []);

  const handleOpenFile = useCallback(async (name: string, handle: FileSystemFileHandle) => {
    try {
      return { name, handle, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error && err.name === 'NotAllowedError'
        ? '请点击左侧 [重新授权] 或重新打开文件夹以激活文件本地读写'
        : '读取文件失败';
      console.error(message, err);
      return { name, handle, error: message };
    }
  }, []);

  const handleCreateSession = useCallback((selectedAgentIds: string[], sessionName: string, backendSessionId?: string) => {
    if (!activeProjectId) return;
    const newSession: Session = {
      id: backendSessionId ?? crypto.randomUUID(), title: sessionName,
      type: selectedAgentIds.length > 1 ? 'group' : 'single',
      agentIds: selectedAgentIds, createdAt: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, sessions: [...p.sessions, newSession] } : p)));
    setActiveSessionId(newSession.id);
  }, [activeProjectId]);

  const handleCreateGroup = useCallback((title: string, selectedAgentIds: string[], backendSessionId?: string) => {
    if (!activeProjectId) return;
    const newSession: Session = {
      id: backendSessionId ?? crypto.randomUUID(), title,
      type: 'group',
      agentIds: selectedAgentIds, createdAt: new Date().toISOString(),
    };
    setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? { ...p, sessions: [...p.sessions, newSession] } : p)));
    setActiveSessionId(newSession.id);
  }, [activeProjectId]);

  const updateSessionMeta = useCallback((sessionId: string, meta: { lastMessagePreview?: string }) => {
    if (!activeProjectId) return;
    const now = new Date().toISOString();
    setProjects((prev) => prev.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sessions: p.sessions.map((s) => {
          if (s.id !== sessionId) return s;
          return { ...s, lastActiveAt: now, ...meta };
        }),
      };
    }));
  }, [activeProjectId]);

  const handleTogglePinSession = useCallback((sessionId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sessions: p.sessions.map((s) => 
          s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s
        ),
      };
    }));
  }, [activeProjectId]);

  const handleToggleArchiveSession = useCallback((sessionId: string) => {
    if (!activeProjectId) return;
    setProjects((prev) => prev.map((p) => {
      if (p.id !== activeProjectId) return p;
      return {
        ...p,
        sessions: p.sessions.map((s) => 
          s.id === sessionId ? { ...s, isArchived: !s.isArchived } : s
        ),
      };
    }));
  }, [activeProjectId]);

  const updateFileTree = useCallback((updater: (tree: FileNode) => FileNode) => {
    if (!activeProjectId) return;
    setRealFileTrees((prev) => {
      const current = prev[activeProjectId] ?? activeProject?.fileTree;
      if (!current) return prev;
      return { ...prev, [activeProjectId]: updater(current) };
    });
  }, [activeProjectId, activeProject]);

  const handleFileAction = useCallback(async (action: 'create' | 'delete' | 'copy', node: FileNode, fileName?: string) => {
    if (!activeProjectId) return;
    if (action === 'create') {
      if (!fileName) return;
      const newNode: FileNode = { name: fileName, type: 'file' };
      updateFileTree((tree) => {
        const addToDir = (n: FileNode): FileNode => {
          if (n.type === 'dir' && n.name === node.name) return { ...n, children: [...(n.children ?? []), newNode] };
          if (n.type === 'dir') return { ...n, children: n.children?.map(addToDir) };
          return n;
        };
        return addToDir(tree);
      });
      try {
        const dirHandle = node.dirHandle as FileSystemDirectoryHandle | undefined;
        if (dirHandle) await dirHandle.getFileHandle(fileName, { create: true });
      } catch (err) { console.error('物理创建文件失败:', err); }
    } else if (action === 'delete') {
      updateFileTree((tree) => {
        const removeFromDir = (n: FileNode): FileNode => {
          if (n.type === 'dir') return { ...n, children: n.children?.filter((c) => c.name !== node.name).map(removeFromDir) };
          return n;
        };
        return removeFromDir(tree);
      });
      try {
        if (node.fileHandle) await (node.fileHandle as unknown as { remove: () => Promise<void> }).remove();
      } catch (err) { console.error('物理删除文件失败:', err); }
    } else if (action === 'copy') {
      const ext = node.name.includes('.') ? '.' + node.name.split('.').pop() : '';
      const base = node.name.replace(ext, '');
      const copyName = `${base}_copy${ext}`;
      const newNode: FileNode = { name: copyName, type: 'file' };
      updateFileTree((tree) => {
        const addToDir = (n: FileNode): FileNode => {
          if (n.type === 'dir' && n.children?.some((c) => c.name === node.name)) return { ...n, children: [...n.children, newNode] };
          if (n.type === 'dir') return { ...n, children: n.children?.map(addToDir) };
          return n;
        };
        return addToDir(tree);
      });
    }
  }, [activeProjectId, updateFileTree]);

  return {
    projects, activeProjectId, activeSessionId, activeProject, activeSession, activeFileTree,
    setActiveSessionId, setRealFileTrees, handleSelectProject, handleDeleteProject,
    handleDeleteSession, handleOpenProject, handleNewProject, createProject, handleOpenFile, handleCreateSession, handleCreateGroup, handleFileAction,
    handleTogglePinSession, handleToggleArchiveSession, updateSessionMeta,
    updateFileTree,
  };
}
