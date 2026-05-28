'use client';

import { useEffect, useRef } from 'react';
import type { FileNode } from './mockFiles';

interface FileContextMenuProps {
  x: number;
  y: number;
  targetNode: FileNode;
  onClose: () => void;
  onAction: (action: 'create' | 'delete' | 'copy', node: FileNode) => void;
}

export function FileContextMenu({ x, y, targetNode, onClose, onAction }: FileContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const items = [
    { action: 'create' as const, icon: '➕', label: '新建文件', cls: '' },
    { action: 'copy' as const, icon: '📋', label: '复制', cls: '' },
    { action: 'delete' as const, icon: '🗑️', label: '删除', cls: 'text-red-500' },
  ];

  return (
    <div
      ref={ref}
      className="fixed bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl py-1 w-40 z-50 text-xs text-zinc-700 dark:text-zinc-300"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          onClick={() => { onAction(item.action, targetNode); onClose(); }}
          className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${item.cls}`}
        >
          <span>{item.icon}</span><span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
