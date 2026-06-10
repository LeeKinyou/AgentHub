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
  setRightPanelOpen: (v: boolean) => void;
  toggleRightPanel: () => void;
  setSessionModalOpen: (v: boolean) => void;
  toggleConsole: () => void;
  setFilesExpanded: (v: boolean) => void;
  toggleFilesExpanded: () => void;
  setGroupModalOpen: (v: boolean) => void;
  setSettingsOpen: (v: boolean) => void;
  setCreateProjectOpen: (v: boolean) => void;
  setOrchestratorOpen: (v: boolean) => void;
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
  setRightPanelOpen: (v) => set({ isRightPanelOpen: v }),
  toggleRightPanel: () => set((s) => ({ isRightPanelOpen: !s.isRightPanelOpen })),
  setSessionModalOpen: (v) => set({ isSessionModalOpen: v }),
  toggleConsole: () => set((s) => ({ isConsoleOpen: !s.isConsoleOpen })),
  setFilesExpanded: (v) => set({ isFilesExpanded: v }),
  toggleFilesExpanded: () => set((s) => ({ isFilesExpanded: !s.isFilesExpanded })),
  setGroupModalOpen: (v) => set({ isGroupModalOpen: v }),
  setSettingsOpen: (v) => set({ isSettingsOpen: v }),
  setCreateProjectOpen: (v) => set({ isCreateProjectOpen: v }),
  setOrchestratorOpen: (v) => set({ isOrchestratorOpen: v }),
}));
