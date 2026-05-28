'use client';

import { useState } from 'react';
import type { FileNode } from './mockFiles';

interface FileExplorerProps {
  root: FileNode;
  activeFileName: string | null;
  onOpenFile: (name: string, handle: FileSystemFileHandle) => void;
  onOpenFolder: () => void;
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

function FileTreeItem({ node, depth, activeFileName, onOpenFile }: { node: FileNode; depth: number; activeFileName: string | null; onOpenFile: (name: string, handle: FileSystemFileHandle) => void }) {
  const [isOpen, setIsOpen] = useState(depth === 0);

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors duration-150"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span>
          <span>📂</span>
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children?.map((child) => (
          <FileTreeItem key={child.name} node={child} depth={depth + 1} activeFileName={activeFileName} onOpenFile={onOpenFile} />
        ))}
      </div>
    );
  }

  const isActive = node.name === activeFileName;

  return (
    <button
      onClick={() => node.fileHandle && onOpenFile(node.name, node.fileHandle)}
      className={`w-full flex items-center gap-1 px-2 py-1 text-xs transition-colors duration-150 ${
        isActive ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span>{getFileIcon(node.name)}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileExplorer({ root, activeFileName, onOpenFile, onOpenFolder }: FileExplorerProps) {
  return (
    <div className="flex flex-col">
      <div className="px-2 py-1">
        <button
          onClick={onOpenFolder}
          className="w-full px-2 py-1.5 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 rounded transition-colors duration-150 flex items-center gap-1"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
          </svg>
          打开本地文件夹
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <FileTreeItem node={root} depth={0} activeFileName={activeFileName} onOpenFile={onOpenFile} />
      </div>
    </div>
  );
}
