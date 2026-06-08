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
    { action: 'delete' as const, icon: '🗑️', label: '删除', cls: 'text-minimal-error' },
  ];

  return (
    <div
      ref={ref}
      className="fixed bg-minimal-glass/80 dark:bg-minimal-dark-surface/80 backdrop-blur-xl border border-minimal-glass-border dark:border-minimal-dark-border rounded-minimal shadow-minimal-glass py-1 w-40 z-50 text-xs text-minimal-text dark:text-minimal-dark-text shadow-minimal-glow"
      style={{ left: x, top: y }}
    >
      {items.map((item) => (
        <button
          key={item.action}
          onClick={() => { onAction(item.action, targetNode); onClose(); }}
          className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-300 ${item.cls}`}
        >
          <span>{item.icon}</span><span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
