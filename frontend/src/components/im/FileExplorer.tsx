'use client';

import { useState, useRef, useEffect } from 'react';
import type { FileNode } from './mockFiles';
import { FileContextMenu } from './FileContextMenu';

interface FileExplorerProps {
  root: FileNode;
  activeFileName: string | null;
  onOpenFile: (name: string, handle: FileSystemFileHandle) => void;
  onOpenFileTransient: (name: string, handle: FileSystemFileHandle) => void;
  onFileAction: (action: 'create' | 'delete' | 'copy', node: FileNode, fileName?: string) => void;
  onReauthorize?: () => void;
  needsReauth?: boolean;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return '📘';
  if (name.endsWith('.py')) return '🐍';
  if (name.endsWith('.json')) return '📋';
  if (name.endsWith('.md')) return '📝';
  if (name.endsWith('.css')) return '🎨';
  if (name.endsWith('.toml') || name.endsWith('.yaml')) return '⚙️';
  if (name === 'Dockerfile') return '🐳';
  if (name.endsWith('.js')) return '📒';
  return '📄';
}

interface ContextMenuState { x: number; y: number; node: FileNode; }

function FileTreeItem({ node, depth, activeFileName, onOpenFile, onOpenFileTransient, onContextMenu }: {
  node: FileNode; depth: number; activeFileName: string | null;
  onOpenFile: (n: string, h: FileSystemFileHandle) => void;
  onOpenFileTransient: (n: string, h: FileSystemFileHandle) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}) {
  const [isOpen, setIsOpen] = useState(depth === 0);

  if (node.type === 'dir') {
    return (
      <div>
        <button onClick={() => setIsOpen(!isOpen)} onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
          className="w-full flex items-center gap-1 px-2 py-1 text-xs text-minimal-secondary dark:text-minimal-dark-secondary hover:bg-minimal-bg dark:hover:bg-minimal-dark-surface hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span><span>📂</span><span className="truncate">{node.name}</span>
        </button>
        {isOpen && (
          node.children && node.children.length > 0
            ? node.children.map((c) => <FileTreeItem key={c.name} node={c} depth={depth + 1} activeFileName={activeFileName} onOpenFile={onOpenFile} onOpenFileTransient={onOpenFileTransient} onContextMenu={onContextMenu} />)
            : isOpen && depth < 2 && <span className="block text-[10px] text-minimal-tertiary dark:text-minimal-dark-tertiary italic" style={{ paddingLeft: `${(depth + 1) * 12 + 20}px` }}>空文件夹</span>
        )}
      </div>
    );
  }

  const isActive = node.name === activeFileName;
  const hasHandle = !!node.fileHandle;
  const handleDragStart = (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', node.name); e.dataTransfer.effectAllowed = 'copy'; };

  return (
    <button draggable onDragStart={handleDragStart}
      onClick={() => hasHandle ? onOpenFileTransient(node.name, node.fileHandle!) : undefined}
      onDoubleClick={() => hasHandle ? onOpenFile(node.name, node.fileHandle!) : undefined}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
      className={`w-full flex items-center gap-1 px-2 py-1 text-xs transition-colors duration-300 cursor-grab active:cursor-grabbing ${isActive ? 'bg-minimal-accent/5 dark:bg-minimal-accent/10 text-minimal-text dark:text-minimal-dark-text' : hasHandle ? 'text-minimal-secondary dark:text-minimal-dark-secondary hover:bg-minimal-bg dark:hover:bg-minimal-dark-surface hover:text-minimal-text dark:hover:text-minimal-dark-text' : 'text-minimal-tertiary dark:text-minimal-dark-tertiary opacity-50 cursor-not-allowed'}`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}>
      <span>{getFileIcon(node.name)}</span>
      <span className="truncate">{node.name}</span>
      {!hasHandle && <span className="text-[9px] text-minimal-warning dark:text-minimal-warning ml-auto" title="需要重新授权">⚠</span>}
    </button>
  );
}

export function FileExplorer({ root, activeFileName, onOpenFile, onOpenFileTransient, onFileAction, onReauthorize, needsReauth }: FileExplorerProps) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [createTarget, setCreateTarget] = useState<FileNode | null>(null);
  const [newFileName, setNewFileName] = useState('untitled.txt');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (createTarget) inputRef.current?.focus(); }, [createTarget]);

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => setContextMenu({ x: e.clientX, y: e.clientY, node });

  const handleAction = (action: 'create' | 'delete' | 'copy', node: FileNode) => {
    if (action === 'create') { setCreateTarget(node); setNewFileName('untitled.txt'); }
    else onFileAction(action, node);
  };

  const handleCreateConfirm = () => {
    if (createTarget && newFileName.trim()) { onFileAction('create', createTarget, newFileName.trim()); setCreateTarget(null); }
  };

  const isEmpty = !root.children || root.children.length === 0;

  return (
    <div className="flex flex-col h-full">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <span className="text-2xl">{needsReauth ? '🔐' : '📂'}</span>
          <p className="text-xs text-minimal-secondary dark:text-minimal-dark-secondary">{needsReauth ? '文件访问权限已过期' : '项目文件夹为空'}</p>
          <button onClick={onReauthorize} className="px-3 py-1.5 rounded-minimal text-xs font-medium bg-minimal-accent hover:bg-minimal-accent-hover text-white transition-colors duration-300">{needsReauth ? '重新授权' : '打开文件夹'}</button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600">
          <FileTreeItem node={root} depth={0} activeFileName={activeFileName} onOpenFile={onOpenFile} onOpenFileTransient={onOpenFileTransient} onContextMenu={handleContextMenu} />
        </div>
      )}
      {contextMenu && <FileContextMenu x={contextMenu.x} y={contextMenu.y} targetNode={contextMenu.node} onClose={() => setContextMenu(null)} onAction={handleAction} />}
      {createTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setCreateTarget(null)}>
          <div className="bg-white dark:bg-minimal-dark-surface border border-minimal-border dark:border-minimal-dark-border rounded-minimal shadow-minimal-md dark:shadow-none p-4 w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-minimal-text dark:text-minimal-dark-text">在 <span className="text-minimal-accent">{createTarget.name}</span> 中新建文件</p>
            <input ref={inputRef} value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
              className="w-full px-3 py-1.5 text-xs bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-minimal-text dark:text-minimal-dark-text focus:outline-none focus:border-minimal-accent transition-colors duration-300" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateTarget(null)} className="px-2 py-1 rounded-minimal text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-300">取消</button>
              <button onClick={handleCreateConfirm} className="bg-minimal-accent hover:bg-minimal-accent-hover text-white px-3 py-1 rounded-minimal text-xs font-medium transition-colors duration-300">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
