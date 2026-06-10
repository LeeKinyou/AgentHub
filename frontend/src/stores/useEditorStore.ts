import { create } from 'zustand';
import type { EditorTab, DiffLine } from '@/hooks/useEditorTabs';

interface EditorState {
  tabs: Record<string, EditorTab[]>;
  activeTabIds: Record<string, string | null>;
  openTab: (projectId: string, tab: EditorTab) => void;
  closeTab: (projectId: string, tabId: string) => void;
  setActiveTabId: (projectId: string, tabId: string | null) => void;
  updateTabContent: (projectId: string, tabId: string, content: string) => void;
  setTabClean: (projectId: string, tabId: string) => void;
  pinTab: (projectId: string, tabId: string) => void;
  injectDiff: (projectId: string, tabId: string, diffLines: DiffLine[]) => void;
  applyDiff: (projectId: string, tabId: string) => void;
  rejectDiff: (projectId: string, tabId: string) => void;
  getProjectTabs: (projectId: string) => { tabs: EditorTab[]; activeTabId: string | null };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: {},
  activeTabIds: {},
  openTab: (projectId, tab) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      const found = existing.find((t) => t.name === tab.name);
      if (found) {
        return {
          activeTabIds: { ...state.activeTabIds, [projectId]: found.id },
        };
      }
      return {
        tabs: { ...state.tabs, [projectId]: [...existing, tab] },
        activeTabIds: { ...state.activeTabIds, [projectId]: tab.id },
      };
    }),
  closeTab: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      const filtered = existing.filter((t) => t.id !== tabId);
      const currentActive = state.activeTabIds[projectId];
      const newActive = currentActive === tabId ? (filtered[0]?.id ?? null) : currentActive;
      return {
        tabs: { ...state.tabs, [projectId]: filtered },
        activeTabIds: { ...state.activeTabIds, [projectId]: newActive },
      };
    }),
  setActiveTabId: (projectId, tabId) =>
    set((state) => ({ activeTabIds: { ...state.activeTabIds, [projectId]: tabId } })),
  updateTabContent: (projectId, tabId, content) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) => (t.id === tabId ? { ...t, content, isDirty: true } : t)),
        },
      };
    }),
  setTabClean: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) => (t.id === tabId ? { ...t, isDirty: false } : t)),
        },
      };
    }),
  pinTab: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) => (t.id === tabId ? { ...t, isTransient: false } : t)),
        },
      };
    }),
  injectDiff: (projectId, tabId, diffLines) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) =>
            t.id === tabId ? { ...t, isDiffMode: true, diffLines, originalContent: t.content } : t
          ),
        },
      };
    }),
  applyDiff: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) => {
            if (t.id !== tabId || !t.diffLines) return t;
            const newContent = t.diffLines
              .filter((l) => l.type !== 'removed')
              .map((l) => l.content)
              .join('\n');
            return { ...t, content: newContent, isDiffMode: false, diffLines: undefined, isDirty: true };
          }),
        },
      };
    }),
  rejectDiff: (projectId, tabId) =>
    set((state) => {
      const existing = state.tabs[projectId] ?? [];
      return {
        tabs: {
          ...state.tabs,
          [projectId]: existing.map((t) =>
            t.id === tabId ? { ...t, isDiffMode: false, diffLines: undefined } : t
          ),
        },
      };
    }),
  getProjectTabs: (projectId) => ({
    tabs: get().tabs[projectId] ?? [],
    activeTabId: get().activeTabIds[projectId] ?? null,
  }),
}));
