'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Project } from './mockProjects';
import type { Theme } from '@/hooks/useTheme';
import { ThemeToggle } from './ThemeToggle';

interface ProjectDockProps {
  projects: Project[];
  activeProjectId: string | null;
  theme: Theme;
  logCount: number;
  isConsoleOpen: boolean;
  onSelectProject: (projectId: string) => void;
  onOpenProject: () => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onThemeChange: (theme: Theme) => void;
  onToggleConsole: () => void;
}

export function ProjectDock({ projects, activeProjectId, theme, logCount, isConsoleOpen, onSelectProject, onOpenProject, onNewProject, onDeleteProject, onThemeChange, onToggleConsole }: ProjectDockProps) {
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
            className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 flex items-center justify-center text-xl transition-all duration-150" title="打开项目">📂</button>
          {isDropdownOpen && (
            <div className="absolute left-14 top-0 z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1">
              <button onClick={() => { setIsDropdownOpen(false); onOpenProject(); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"><span>📂</span><span>打开本地项目</span></button>
              <button onClick={() => { setIsDropdownOpen(false); onNewProject(); }} className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"><span>✨</span><span>新建项目</span></button>
            </div>
          )}
        </div>
        <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <button onClick={() => onSelectProject(project.id)}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-150 ${project.id === activeProjectId ? 'bg-zinc-300 dark:bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800'}`} title={project.name}>
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
        <button onClick={onToggleConsole}
          className={`p-2 rounded-lg transition-colors relative ${isConsoleOpen ? 'text-indigo-500 bg-indigo-500/10' : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          title="控制台日志">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          <span className={`absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[10px] font-bold ${logCount > 0 ? 'bg-indigo-500 text-white' : 'bg-zinc-300 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'}`}>{logCount}</span>
        </button>
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
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </div>
    </aside>
  );
}
