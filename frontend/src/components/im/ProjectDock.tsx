'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Project } from './mockProjects';
import type { Theme } from '@/hooks/useTheme';
import { ThemeToggle } from './ThemeToggle';

interface ProjectDockProps {
  projects: Project[];
  activeProjectId: string | null;
  theme: Theme;
  onSelectProject: (projectId: string) => void;
  onOpenProject: () => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onThemeChange: (theme: Theme) => void;
  onOpenSettings: () => void;
}

export function ProjectDock({ projects, activeProjectId, theme, onSelectProject, onOpenProject, onNewProject, onDeleteProject, onThemeChange, onOpenSettings }: ProjectDockProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsDropdownOpen(false);
      if (resetRef.current && !resetRef.current.contains(e.target as Node)) setShowResetConfirm(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFactoryReset = useCallback(() => { localStorage.clear(); window.location.reload(); }, []);

  return (
    <aside className="w-16 h-screen bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col items-center justify-between py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-12 h-12 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-dashed border-indigo-500/40 flex items-center justify-center text-xl transition-all duration-150" title="新建 / 打开项目">
            <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          {isDropdownOpen && (
            <div className="absolute left-14 top-0 z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1">
              <button onClick={() => { setIsDropdownOpen(false); onOpenProject(); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"><span>📂</span><span>打开本地项目</span></button>
              <button onClick={() => { setIsDropdownOpen(false); onNewProject(); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"><span>✨</span><span>新建项目</span></button>
            </div>
          )}
        </div>
        <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
        {projects.length === 0 && (
          <div className="px-2 py-4 text-center">
            <p className="text-[10px] text-zinc-500 leading-relaxed">点击上方<br />打开项目</p>
          </div>
        )}
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <button onClick={() => onSelectProject(project.id)}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-150 ${project.id === activeProjectId ? 'bg-zinc-300 dark:bg-zinc-800 ring-2 ring-indigo-500/50' : 'bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800'}`} title={project.name}>
              {project.id === activeProjectId && <div className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r" />}
              <span className="group-hover:scale-110 transition-transform duration-150">{project.icon}</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10" title="删除项目">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <div className="relative" ref={resetRef}>
          <button onClick={() => setShowResetConfirm(true)}
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="重置工作区">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          {showResetConfirm && (
            <div className="absolute bottom-0 left-full ml-3 mb-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-3 z-50">
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-3">⚠️ 将清除所有项目数据、会话记录和编辑器状态，此操作不可撤销！</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowResetConfirm(false)} className="px-2 py-1 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">取消</button>
                <button onClick={handleFactoryReset} className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors">确认重置</button>
              </div>
            </div>
          )}
        </div>
        <button onClick={onOpenSettings}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="设置">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        </button>
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </div>
    </aside>
  );
}
