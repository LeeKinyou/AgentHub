'use client';

import { useState, useRef, useEffect } from 'react';
import type { FileNode } from './mockFiles';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, icon: string, fileTree: FileNode, parentDirHandle: FileSystemDirectoryHandle) => void;
}

const ICONS = ['✨', '🚀', '🎨', '⚙️', '📦', '🧪', '🌐', '📱', '🔧', '💡'];

export function CreateProjectModal({ isOpen, onClose, onCreate }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✨');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [parentHandle, setParentHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isPickingFolder, setIsPickingFolder] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setIcon('✨');
      setParentPath(null);
      setParentHandle(null);
      setPickError(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handlePickFolder = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPickingFolder(true);
    setPickError(null);
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setParentHandle(dirHandle);
      setParentPath(dirHandle.name);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
      } else {
        console.error('文件夹选择失败:', err);
        setPickError('文件夹选择失败，请重试');
      }
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (parentHandle) {
      try {
        const projectDirHandle = await parentHandle.getDirectoryHandle(name.trim(), { create: true });
        const projectFileTree: FileNode = {
          name: name.trim(),
          type: 'dir',
          children: [],
          dirHandle: projectDirHandle,
        };
        onCreate(name.trim(), icon, projectFileTree, parentHandle);
      } catch (err) {
        console.error('创建项目文件夹失败:', err);
        setPickError('创建项目文件夹失败，请检查权限或重试');
        return;
      }
    } else {
      const virtualTree: FileNode = {
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        type: 'dir',
        children: [],
      };
      onCreate(name.trim(), icon, virtualTree, null as unknown as FileSystemDirectoryHandle);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-minimal-glass/80 dark:bg-minimal-dark-surface/80 backdrop-blur-xl border border-minimal-glass-border dark:border-minimal-dark-border rounded-minimal shadow-minimal-glass w-[420px] shadow-minimal-glow" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-minimal-glass-border dark:border-minimal-dark-border">
          <div className="w-9 h-9 rounded-minimal bg-minimal-accent/10 border border-minimal-accent/20 flex items-center justify-center">
            <svg className="w-4.5 h-4.5 text-minimal-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-minimal-text dark:text-minimal-dark-text">新建项目</h3>
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">在选定位置创建项目文件夹</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5">项目名称</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              className="w-full px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary dark:placeholder-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-300"
              required
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5">项目图标</label>
            <div className="flex gap-1.5 flex-wrap">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-minimal flex items-center justify-center text-lg transition-all duration-300 ${
                    icon === ic
                      ? 'bg-minimal-accent/10 border-2 border-minimal-accent/30 scale-110'
                      : 'bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border hover:bg-minimal-border dark:hover:bg-minimal-dark-border'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Folder Picker */}
          <div>
            <label className="block text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary mb-1.5">父目录</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-sm min-h-[36px]">
                {parentPath ? (
                  <>
                    <span className="text-minimal-success text-xs">✓</span>
                    <span className="text-minimal-text dark:text-minimal-dark-text truncate font-mono text-xs">{parentPath}</span>
                    {name.trim() && (
                      <span className="text-minimal-accent text-[10px] ml-auto shrink-0 font-mono">/{name.trim()}</span>
                    )}
                  </>
                ) : (
                  <span className="text-minimal-tertiary dark:text-minimal-dark-tertiary text-xs">选择项目创建位置</span>
                )}
              </div>
              <button
                type="button"
                onClick={handlePickFolder}
                disabled={isPickingFolder}
                className="px-3 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-xs text-minimal-secondary dark:text-minimal-dark-secondary hover:bg-minimal-border dark:hover:bg-minimal-dark-border transition-colors duration-300 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
              >
                {isPickingFolder ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                ) : (
                  <span>📂</span>
                )}
                <span>{parentPath ? '重新选择' : '选择文件夹'}</span>
              </button>
            </div>
            {pickError && <p className="text-[10px] text-minimal-warning mt-1">{pickError}</p>}
            <p className="text-[10px] text-minimal-tertiary dark:text-minimal-dark-tertiary mt-1">
              {parentPath && name.trim()
                ? `将在 ${parentPath}/${name.trim()} 创建空项目文件夹`
                : '选择父目录后，将自动在其中创建以项目名命名的子文件夹'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text border border-minimal-border dark:border-minimal-dark-border rounded-minimal hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-300"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !parentHandle}
              className="px-5 py-2 text-xs font-medium text-white bg-minimal-accent hover:bg-minimal-accent-hover rounded-minimal transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              创建项目
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
