'use client';

import { useState, useRef, useEffect } from 'react';
import type { Theme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const AutoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const options: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: 'light', icon: <SunIcon />, label: '浅色' },
  { value: 'dark', icon: <MoonIcon />, label: '深色' },
  { value: 'system', icon: <AutoIcon />, label: '自动' },
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
        className="w-10 h-10 rounded-minimal bg-minimal-bg dark:bg-zinc-800 hover:bg-minimal-border dark:hover:bg-zinc-700 flex items-center justify-center text-sm transition-all duration-300"
        title="切换主题"
      >
        <span className="text-sm">{current.icon}</span>
      </button>
      {isOpen && (
        <div className="absolute bottom-0 left-full ml-3 mb-0 w-32 bg-minimal-surface dark:bg-zinc-900 border border-minimal-border dark:border-zinc-700 rounded-minimal shadow-minimal-md py-1 z-50">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onThemeChange(opt.value); setIsOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors duration-300 ${
                theme === opt.value
                  ? 'text-minimal-accent bg-minimal-accent/5 dark:bg-minimal-accent/10'
                  : 'text-minimal-text dark:text-zinc-200 hover:bg-minimal-bg dark:hover:bg-zinc-800'
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
