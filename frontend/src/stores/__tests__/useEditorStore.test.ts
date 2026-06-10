import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../useEditorStore';

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({ tabs: {}, activeTabIds: {} });
  });

  it('has correct default values', () => {
    const state = useEditorStore.getState();
    expect(state.tabs).toEqual({});
    expect(state.activeTabIds).toEqual({});
  });

  it('opens a new tab', () => {
    const tab = {
      id: 'tab-1',
      name: 'test.ts',
      content: 'const x = 1;',
      isDirty: false,
      isTransient: false,
    };

    useEditorStore.getState().openTab('project-1', tab);
    const { tabs, activeTabIds } = useEditorStore.getState();

    expect(tabs['project-1']).toHaveLength(1);
    expect(tabs['project-1'][0].name).toBe('test.ts');
    expect(activeTabIds['project-1']).toBe('tab-1');
  });

  it('does not duplicate tabs with same name', () => {
    const tab = {
      id: 'tab-1',
      name: 'test.ts',
      content: 'const x = 1;',
      isDirty: false,
      isTransient: false,
    };

    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().openTab('project-1', { ...tab, id: 'tab-2', content: 'const y = 2;' });

    const { tabs, activeTabIds } = useEditorStore.getState();
    expect(tabs['project-1']).toHaveLength(1);
    expect(activeTabIds['project-1']).toBe('tab-1');
  });

  it('closes a tab', () => {
    const tab1 = { id: 'tab-1', name: 'a.ts', content: '', isDirty: false, isTransient: false };
    const tab2 = { id: 'tab-2', name: 'b.ts', content: '', isDirty: false, isTransient: false };

    useEditorStore.getState().openTab('project-1', tab1);
    useEditorStore.getState().openTab('project-1', tab2);
    useEditorStore.getState().closeTab('project-1', 'tab-1');

    const { tabs, activeTabIds } = useEditorStore.getState();
    expect(tabs['project-1']).toHaveLength(1);
    expect(tabs['project-1'][0].id).toBe('tab-2');
    expect(activeTabIds['project-1']).toBe('tab-2');
  });

  it('sets active tab id', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: '', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().setActiveTabId('project-1', 'tab-1');

    expect(useEditorStore.getState().activeTabIds['project-1']).toBe('tab-1');
  });

  it('updates tab content', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: 'old', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().updateTabContent('project-1', 'tab-1', 'new content');

    const updated = useEditorStore.getState().tabs['project-1'][0];
    expect(updated.content).toBe('new content');
    expect(updated.isDirty).toBe(true);
  });

  it('sets tab clean', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: 'x', isDirty: true, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().setTabClean('project-1', 'tab-1');

    expect(useEditorStore.getState().tabs['project-1'][0].isDirty).toBe(false);
  });

  it('pins a tab', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: '', isDirty: false, isTransient: true };
    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().pinTab('project-1', 'tab-1');

    expect(useEditorStore.getState().tabs['project-1'][0].isTransient).toBe(false);
  });

  it('injects diff', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: 'old code', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);

    const diffLines = [
      { type: 'removed' as const, content: 'old code' },
      { type: 'added' as const, content: 'new code' },
    ];

    useEditorStore.getState().injectDiff('project-1', 'tab-1', diffLines);

    const updated = useEditorStore.getState().tabs['project-1'][0];
    expect(updated.isDiffMode).toBe(true);
    expect(updated.diffLines).toEqual(diffLines);
    expect(updated.originalContent).toBe('old code');
  });

  it('applies diff', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: 'old', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);

    useEditorStore.getState().injectDiff('project-1', 'tab-1', [
      { type: 'removed' as const, content: 'old' },
      { type: 'added' as const, content: 'new' },
    ]);

    useEditorStore.getState().applyDiff('project-1', 'tab-1');

    const updated = useEditorStore.getState().tabs['project-1'][0];
    expect(updated.content).toBe('new');
    expect(updated.isDiffMode).toBe(false);
    expect(updated.isDirty).toBe(true);
  });

  it('rejects diff', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: 'old', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);

    useEditorStore.getState().injectDiff('project-1', 'tab-1', [
      { type: 'removed' as const, content: 'old' },
      { type: 'added' as const, content: 'new' },
    ]);

    useEditorStore.getState().rejectDiff('project-1', 'tab-1');

    const updated = useEditorStore.getState().tabs['project-1'][0];
    expect(updated.content).toBe('old');
    expect(updated.isDiffMode).toBe(false);
  });

  it('gets project tabs', () => {
    const tab = { id: 'tab-1', name: 'test.ts', content: '', isDirty: false, isTransient: false };
    useEditorStore.getState().openTab('project-1', tab);
    useEditorStore.getState().setActiveTabId('project-1', 'tab-1');

    const result = useEditorStore.getState().getProjectTabs('project-1');
    expect(result.tabs).toHaveLength(1);
    expect(result.activeTabId).toBe('tab-1');
  });
});
