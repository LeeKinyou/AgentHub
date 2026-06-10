'use client';

import { useCallback } from 'react';
import type { LogItem } from '@/components/im/ConsolePanel';

interface UseEditorActionsParams {
  activeProjectId: string | null;
  openTab: (projectId: string, name: string, handle: FileSystemFileHandle, transient: boolean) => Promise<void>;
  setTabClean: (projectId: string, tabId: string) => void;
  setRightPanelOpen: (v: boolean) => void;
  addLog: (type: LogItem['type'], source: string, message: string) => void;
}

export function useEditorActions(params: UseEditorActionsParams) {
  const { activeProjectId, openTab, setTabClean, setRightPanelOpen, addLog } = params;

  const handleOpenFileTransient = useCallback(async (name: string, handle: FileSystemFileHandle) => {
    if (!activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(activeProjectId, name, handle, true); setRightPanelOpen(true); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  }, [activeProjectId, openTab, setRightPanelOpen, addLog]);

  const handleOpenFile = useCallback(async (name: string, handle: FileSystemFileHandle) => {
    if (!activeProjectId) { addLog('error', 'FileIO', '请先打开一个项目'); return; }
    try { await openTab(activeProjectId, name, handle, false); setRightPanelOpen(true); addLog('info', 'Editor', `Opened ${name}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '请点击 [重新授权] 或重新打开文件夹以激活文件读写' : '读取文件失败'; addLog('error', 'FileIO', msg); }
  }, [activeProjectId, openTab, setRightPanelOpen, addLog]);

  const handleSaveFile = useCallback(async (tab: { id: string; handle: FileSystemFileHandle; content: string }) => {
    if (!activeProjectId) return;
    try { const opts = { mode: 'readwrite' as const }; /* eslint-disable-next-line @typescript-eslint/no-explicit-any */ const h = tab.handle as any; let perm = await h.queryPermission(opts); if (perm !== 'granted') perm = await h.requestPermission(opts); if (perm !== 'granted') throw new DOMException('Permission denied', 'NotAllowedError'); const w = await tab.handle.createWritable(); await w.write(tab.content); await w.close(); setTabClean(activeProjectId, tab.id); addLog('success', 'FileIO', `Saved ${tab.id}`); }
    catch (err: unknown) { const msg = err instanceof Error && err.name === 'NotAllowedError' ? '文件句柄已失效，请重新打开文件夹授权' : '保存文件失败'; addLog('error', 'FileIO', msg); }
  }, [activeProjectId, setTabClean, addLog]);

  return { handleOpenFile, handleOpenFileTransient, handleSaveFile };
}
