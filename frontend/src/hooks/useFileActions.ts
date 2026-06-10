'use client';

import { useCallback, useEffect } from 'react';
import type { FileNode } from '@/components/im/mockFiles';
import type { FileOperation } from '@/components/im/FileOperationDialog';
import type { EditorTab } from '@/hooks/useEditorTabs';
import type { LogItem } from '@/components/im/ConsolePanel';
import { writeFileAtPath, deleteFileAtPath, traverseDirectory } from '@/components/im/fileSystemUtils';

interface UseFileActionsParams {
  activeProjectId: string | null;
  activeFileTree: FileNode | null;
  updateFileTree: (updater: (tree: FileNode) => FileNode) => void;
  setRealFileTrees: React.Dispatch<React.SetStateAction<Record<string, FileNode>>>;
  activeProjectTabs: (projectId: string | null) => { tabs: EditorTab[]; activeTabId: string | null };
  updateTabContent: (projectId: string, tabId: string, content: string) => void;
  setAutoApprove: (v: boolean) => void;
  approveOperations: (ops: FileOperation[]) => void;
  setOnApproved: (fn: (ops: FileOperation[]) => void) => void;
  addLog: (type: LogItem['type'], source: string, message: string) => void;
}

export function useFileActions(params: UseFileActionsParams) {
  const {
    activeProjectId, activeFileTree, updateFileTree, setRealFileTrees,
    activeProjectTabs, updateTabContent, setAutoApprove, approveOperations,
    setOnApproved, addLog,
  } = params;

  const handleApproveFileOps = useCallback(async (ops: FileOperation[]) => {
    if (!activeProjectId) return;
    const projId = activeProjectId;
    const rootDir = activeFileTree?.dirHandle as FileSystemDirectoryHandle | undefined;
    for (const op of ops) {
      const fileName = op.path.split('/').pop() ?? op.path;
      if (op.action === 'create' && op.content) {
        updateFileTree((tree: FileNode) => {
          const parts = op.path.split('/');
          const addRecursive = (node: FileNode, depth: number): FileNode => {
            if (depth === parts.length - 1) return { ...node, children: [...(node.children ?? []), { name: parts[depth], type: 'file' as const }] };
            if (node.type === 'dir') {
              const childIdx = node.children?.findIndex((c) => c.name === parts[depth]) ?? -1;
              if (childIdx >= 0 && node.children) { const updated = [...node.children]; updated[childIdx] = addRecursive(updated[childIdx], depth + 1); return { ...node, children: updated }; }
              return { ...node, children: [...(node.children ?? []), addRecursive({ name: parts[depth], type: 'dir' as const, children: [] }, depth + 1)] };
            }
            return node;
          };
          return addRecursive(tree, 0);
        });
        if (rootDir) { try { await writeFileAtPath(rootDir, op.path, op.content); addLog('success', 'FileIO', `已写入磁盘: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Created ${op.path} (仅内存)`); }
      } else if (['modify', 'edit', 'update', 'write'].includes(op.action) && op.newContent) {
        const tabs = activeProjectTabs(projId);
        const existingTab = tabs.tabs.find((t: EditorTab) => t.name === fileName);
        if (existingTab) updateTabContent(projId, existingTab.id, op.newContent);
        if (rootDir) { try { await writeFileAtPath(rootDir, op.path, op.newContent); addLog('success', 'FileIO', `已更新磁盘: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘写入失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Modified ${op.path} (仅内存)`); }
      } else if (['delete', 'remove'].includes(op.action)) {
        updateFileTree((tree: FileNode) => {
          const removeFromDir = (n: FileNode): FileNode => { if (n.type === 'dir') return { ...n, children: n.children?.filter((c) => c.name !== fileName).map(removeFromDir) }; return n; };
          return removeFromDir(tree);
        });
        if (rootDir) { try { await deleteFileAtPath(rootDir, op.path); addLog('success', 'FileIO', `已从磁盘删除: ${op.path}`); } catch { addLog('warn', 'FileIO', `内存已更新但磁盘删除失败: ${op.path}`); } }
        else { addLog('info', 'FileIO', `Deleted ${op.path} (仅内存)`); }
      }
    }
  }, [activeProjectId, activeFileTree, updateFileTree, activeProjectTabs, updateTabContent, addLog]);

  useEffect(() => { setOnApproved(handleApproveFileOps); }, [setOnApproved, handleApproveFileOps]);

  const handleReauthorize = useCallback(async () => {
    if (!activeProjectId) return;
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const children = await traverseDirectory(dirHandle);
      const tree: FileNode = { name: dirHandle.name, type: 'dir', children, dirHandle };
      setRealFileTrees((prev: Record<string, FileNode>) => ({ ...prev, [activeProjectId!]: tree }));
      addLog('success', 'FileIO', `已重新授权: ${dirHandle.name}`);
    } catch (err: unknown) { if (err instanceof DOMException && err.name === 'AbortError') return; addLog('error', 'FileIO', '重新授权失败'); }
  }, [activeProjectId, setRealFileTrees, addLog]);

  const handleApproveAllFileOps = useCallback((ops: FileOperation[], remember: boolean) => {
    if (remember) setAutoApprove(true);
    handleApproveFileOps(ops);
    approveOperations(ops);
  }, [setAutoApprove, handleApproveFileOps, approveOperations]);

  return { handleApproveFileOps, handleApproveAllFileOps, handleReauthorize };
}
