import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isRightPanelOpen: false,
      isConsoleOpen: false,
      isFilesExpanded: true,
      isSessionModalOpen: false,
      isGroupModalOpen: false,
      isSettingsOpen: false,
      isCreateProjectOpen: false,
    });
  });

  it('has correct default values', () => {
    const state = useUIStore.getState();
    expect(state.isRightPanelOpen).toBe(false);
    expect(state.isConsoleOpen).toBe(false);
    expect(state.isFilesExpanded).toBe(true);
    expect(state.isSessionModalOpen).toBe(false);
  });

  it('toggles right panel', () => {
    const { setRightPanelOpen } = useUIStore.getState();
    setRightPanelOpen(true);
    expect(useUIStore.getState().isRightPanelOpen).toBe(true);
    setRightPanelOpen(false);
    expect(useUIStore.getState().isRightPanelOpen).toBe(false);
  });

  it('toggles console', () => {
    const { toggleConsole } = useUIStore.getState();
    toggleConsole();
    expect(useUIStore.getState().isConsoleOpen).toBe(true);
    toggleConsole();
    expect(useUIStore.getState().isConsoleOpen).toBe(false);
  });

  it('sets files expanded', () => {
    const { setFilesExpanded } = useUIStore.getState();
    setFilesExpanded(false);
    expect(useUIStore.getState().isFilesExpanded).toBe(false);
  });

  it('opens and closes modals', () => {
    const { setSessionModalOpen, setGroupModalOpen, setSettingsOpen, setCreateProjectOpen } = useUIStore.getState();

    setSessionModalOpen(true);
    expect(useUIStore.getState().isSessionModalOpen).toBe(true);

    setGroupModalOpen(true);
    expect(useUIStore.getState().isGroupModalOpen).toBe(true);

    setSettingsOpen(true);
    expect(useUIStore.getState().isSettingsOpen).toBe(true);

    setCreateProjectOpen(true);
    expect(useUIStore.getState().isCreateProjectOpen).toBe(true);
  });
});
