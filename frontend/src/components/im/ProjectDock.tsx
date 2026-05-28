'use client';

import { useState, useRef, useEffect } from 'react';
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
}

export function ProjectDock({ projects, activeProjectId, theme, onSelectProject, onOpenProject, onNewProject, onDeleteProject, onThemeChange }: ProjectDockProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <aside className="w-16 h-screen bg-zinc-100 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-900 flex flex-col items-center justify-between py-3">
      <div className="flex flex-col items-center gap-2">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 flex items-center justify-center text-xl transition-all duration-150"
            title="打开项目"
          >
            📂
          </button>
          {isDropdownOpen && (
            <div className="absolute left-14 top-0 z-50 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1">
              <button
                onClick={() => { setIsDropdownOpen(false); onOpenProject(); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <span>📂</span><span>打开本地项目</span>
              </button>
              <button
                onClick={() => { setIsDropdownOpen(false); onNewProject(); }}
                className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
              >
                <span>✨</span><span>新建项目</span>
              </button>
            </div>
          )}
        </div>
        <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
        {projects.map((project) => (
          <div key={project.id} className="relative group">
            <button
              onClick={() => onSelectProject(project.id)}
              className={`relative w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all duration-150 ${
                project.id === activeProjectId ? 'bg-zinc-300 dark:bg-zinc-800' : 'bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800'
              }`}
              title={project.name}
            >
              {project.id === activeProjectId && (
                <div className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r" />
              )}
              <span className="group-hover:scale-110 transition-transform duration-150">{project.icon}</span>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-10"
              title="删除项目"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
      </div>
    </aside>
  );
}