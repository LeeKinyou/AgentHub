'use client';

import { useState, useCallback } from 'react';

export interface DiffLine {
  type: 'normal' | 'added' | 'removed';
  content: string;
}

export interface EditorTab {
  id: string;
  name: string;
  handle: FileSystemFileHandle;
  content: string;
  isDirty: boolean;
  isDiffMode?: boolean;
  diffLines?: DiffLine[];
  originalContent?: string;
}

interface ProjectTabs {
  tabs: EditorTab[];
  activeTabId: string | null;
}

export function useEditorTabs() {
  const [projectsTabs, setProjectsTabs] = useState<Record<string, ProjectTabs>>({});

  const getProjectTabs = useCallback(
    (projectId: string): ProjectTabs => projectsTabs[projectId] ?? { tabs: [], activeTabId: null },
    [projectsTabs],
  );

  const activeProjectTabs = useCallback(
    (projectId: string | null): ProjectTabs => (projectId ? getProjectTabs(projectId) : { tabs: [], activeTabId: null }),
    [getProjectTabs],
  );

  const openTab = useCallback(
    async (projectId: string, name: string, handle: FileSystemFileHandle) => {
      const pt = getProjectTabs(projectId);
      const existing = pt.tabs.find((t) => t.handle === handle);
      if (existing) {
        setProjectsTabs((prev) => ({ ...prev, [projectId]: { ...prev[projectId], activeTabId: existing.id } }));
        return;
      }
      try {
        const file = await handle.getFile();
        const content = await file.text();
        const id = crypto.randomUUID();
        const newTab: EditorTab = { id, name, handle, content, isDirty: false };
        setProjectsTabs((prev) => ({ ...prev, [projectId]: { tabs: [...pt.tabs, newTab], activeTabId: id } }));
      } catch (err) {
        console.error('读取文件失败:', err);
      }
    },
    [getProjectTabs],
  );

  const closeTab = useCallback(
    (projectId: string, tabId: string) => {
      const pt = getProjectTabs(projectId);
      const idx = pt.tabs.findIndex((t) => t.id === tabId);
      const next = pt.tabs.filter((t) => t.id !== tabId);
      let newActiveId = pt.activeTabId;
      if (pt.activeTabId === tabId) {
        newActiveId = next.length === 0 ? null : next[Math.min(idx, next.length - 1)].id;
      }
      setProjectsTabs((prev) => ({ ...prev, [projectId]: { tabs: next, activeTabId: newActiveId } }));
    },
    [getProjectTabs],
  );

  const setActiveTabId = useCallback((projectId: string, tabId: string) => {
    setProjectsTabs((prev) => ({ ...prev, [projectId]: { ...prev[projectId], activeTabId: tabId } }));
  }, []);

  const updateTabContent = useCallback((projectId: string, tabId: string, newContent: string) => {
    setProjectsTabs((prev) => {
      const pt = prev[projectId];
      if (!pt) return prev;
      return { ...prev, [projectId]: { ...pt, tabs: pt.tabs.map((t) => (t.id === tabId ? { ...t, content: newContent, isDirty: true } : t)) } };
    });
  }, []);

  const setTabClean = useCallback((projectId: string, tabId: string) => {
    setProjectsTabs((prev) => {
      const pt = prev[projectId];
      if (!pt) return prev;
      return { ...prev, [projectId]: { ...pt, tabs: pt.tabs.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)) } };
    });
  }, []);

  const injectDiff = useCallback((projectId: string, tabId: string, diffLines: DiffLine[]) => {
    setProjectsTabs((prev) => {
      const pt = prev[projectId];
      if (!pt) return prev;
      return {
        ...prev,
        [projectId]: {
          ...pt,
          tabs: pt.tabs.map((t) => (t.id === tabId ? { ...t, isDiffMode: true, diffLines, originalContent: t.content } : t)),
        },
      };
    });
  }, []);

  const applyDiff = useCallback((projectId: string, tabId: string) => {
    setProjectsTabs((prev) => {
      const pt = prev[projectId];
      if (!pt) return prev;
      return {
        ...prev,
        [projectId]: {
          ...pt,
          tabs: pt.tabs.map((t) => {
            if (t.id !== tabId || !t.diffLines) return t;
            const merged = t.diffLines.filter((l) => l.type !== 'removed').map((l) => l.content).join('\n');
            return { ...t, content: merged, isDiffMode: false, diffLines: undefined, originalContent: undefined, isDirty: true };
          }),
        },
      };
    });
  }, []);

  const rejectDiff = useCallback((projectId: string, tabId: string) => {
    setProjectsTabs((prev) => {
      const pt = prev[projectId];
      if (!pt) return prev;
      return {
        ...prev,
        [projectId]: {
          ...pt,
          tabs: pt.tabs.map((t) => (t.id === tabId ? { ...t, isDiffMode: false, diffLines: undefined, originalContent: undefined } : t)),
        },
      };
    });
  }, []);

  return {
    projectsTabs,
    getProjectTabs,
    activeProjectTabs,
    openTab,
    closeTab,
    setActiveTabId,
    updateTabContent,
    setTabClean,
    injectDiff,
    applyDiff,
    rejectDiff,
  };
}