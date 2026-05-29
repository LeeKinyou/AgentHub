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
          className="w-full flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-150"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}>
          <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span><span>📂</span><span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children?.map((c) => <FileTreeItem key={c.name} node={c} depth={depth + 1} activeFileName={activeFileName} onOpenFile={onOpenFile} onOpenFileTransient={onOpenFileTransient} onContextMenu={onContextMenu} />)}
      </div>
    );
  }

  const isActive = node.name === activeFileName;
  const handleDragStart = (e: React.DragEvent) => { e.dataTransfer.setData('text/plain', node.name); e.dataTransfer.effectAllowed = 'copy'; };

  return (
    <button draggable onDragStart={handleDragStart}
      onClick={() => node.fileHandle && onOpenFileTransient(node.name, node.fileHandle)}
      onDoubleClick={() => node.fileHandle && onOpenFile(node.name, node.fileHandle)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node); }}
      className={`w-full flex items-center gap-1 px-2 py-1 text-xs transition-colors duration-150 cursor-grab active:cursor-grabbing ${isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'}`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}>
      <span>{getFileIcon(node.name)}</span><span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ root, activeFileName, onOpenFile, onOpenFileTransient, onFileAction }: FileExplorerProps) {
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <FileTreeItem node={root} depth={0} activeFileName={activeFileName} onOpenFile={onOpenFile} onOpenFileTransient={onOpenFileTransient} onContextMenu={handleContextMenu} />
      </div>
      {contextMenu && <FileContextMenu x={contextMenu.x} y={contextMenu.y} targetNode={contextMenu.node} onClose={() => setContextMenu(null)} onAction={handleAction} />}
      {createTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreateTarget(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-4 w-64 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">在 <span className="text-indigo-500">{createTarget.name}</span> 中新建文件</p>
            <input ref={inputRef} value={newFileName} onChange={(e) => setNewFileName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreateConfirm()}
              className="w-full px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCreateTarget(null)} className="px-2 py-1 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">取消</button>
              <button onClick={handleCreateConfirm} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-xs font-medium transition-colors">创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
