'use client';

import { useState, useRef, useEffect } from 'react';
import type { Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const options: { value: Theme; icon: string; label: string }[] = [
  { value: 'light', icon: '☀️', label: '浅色' },
  { value: 'dark', icon: '🌙', label: '深色' },
  { value: 'system', icon: '💻', label: '自动' },
];

export function ThemeToggle({ theme, onThemeChange }: ThemeToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = options.find((o) => o.value === theme) ?? options[2];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-900 hover:bg-zinc-300 dark:hover:bg-zinc-800 flex items-center justify-center text-sm transition-all duration-150"
        title="切换主题"
      >
        <span className="text-sm">{current.icon}</span>
      </button>
      {isOpen && (
        <div className="absolute bottom-0 left-full ml-3 mb-0 w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onThemeChange(opt.value); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                theme === opt.value
                  ? 'text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-600/10'
                  : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <span>{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}