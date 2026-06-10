import { create } from 'zustand';

interface UIState {
  isRightPanelOpen: boolean;
  isSessionModalOpen: boolean;
  isConsoleOpen: boolean;
  isFilesExpanded: boolean;
  isGroupModalOpen: boolean;
  isSettingsOpen: boolean;
  isCreateProjectOpen: boolean;
  isOrchestratorOpen: boolean;
  setRightPanelOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleRightPanel: () => void;
  setSessionModalOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setConsoleOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleConsole: () => void;
  setFilesExpanded: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleFilesExpanded: () => void;
  setGroupModalOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setSettingsOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setCreateProjectOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  setOrchestratorOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isRightPanelOpen: false,
  isSessionModalOpen: false,
  isConsoleOpen: false,
  isFilesExpanded: true,
  isGroupModalOpen: false,
  isSettingsOpen: false,
  isCreateProjectOpen: false,
  isOrchestratorOpen: false,
  setRightPanelOpen: (v) => set((s) => ({ isRightPanelOpen: typeof v === 'function' ? v(s.isRightPanelOpen) : v })),
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  setSessionModalOpen: (v) => set((s) => ({ isSessionModalOpen: typeof v === 'function' ? v(s.isSessionModalOpen) : v })),
  setConsoleOpen: (v) => set((s) => ({ isConsoleOpen: typeof v === 'function' ? v(s.isConsoleOpen) : v })),
  toggleConsole: () => set((s) => ({ isConsoleOpen: !s.isConsoleOpen })),
  setFilesExpanded: (v) => set((s) => ({ isFilesExpanded: typeof v === 'function' ? v(s.isFilesExpanded) : v })),
  toggleFilesExpanded: () => set((s) => ({ isFilesExpanded: !s.isFilesExpanded })),
  setGroupModalOpen: (v) => set((s) => ({ isGroupModalOpen: typeof v === 'function' ? v(s.isGroupModalOpen) : v })),
  setSettingsOpen: (v) => set((s) => ({ isSettingsOpen: typeof v === 'function' ? v(s.isSettingsOpen) : v })),
  setCreateProjectOpen: (v) => set((s) => ({ isCreateProjectOpen: typeof v === 'function' ? v(s.isCreateProjectOpen) : v })),
  setOrchestratorOpen: (v) => set((s) => ({ isOrchestratorOpen: typeof v === 'function' ? v(s.isOrchestratorOpen) : v })),
}));
