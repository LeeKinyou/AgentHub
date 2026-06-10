'use client';

import { useState, useRef, useEffect } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';

interface ChatHeaderProps {
  title: string;
  sessionType: 'single' | 'group';
  agents: AgentProfile[];
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
}

export function ChatHeader({ title, sessionType, agents, isRightPanelOpen, onToggleRightPanel }: ChatHeaderProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node) && btnRef.current && !btnRef.current.contains(e.target as Node)) setIsPopoverOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="relative h-14 px-6 flex items-center justify-between border-b border-minimal-glass-border bg-minimal-glass/50 backdrop-blur-xl shrink-0 z-30 shadow-minimal-glow">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg shrink-0">{sessionType === 'group' ? '👥' : '💬'}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-minimal-text truncate">{title}</h2>
          <p className="text-[11px] text-minimal-secondary">{agents.length} 个智能体在线</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto shrink-0 text-minimal-secondary" ref={popoverRef}>
        <button
          ref={btnRef}
          onClick={() => setIsPopoverOpen((prev) => !prev)}
          className="flex items-center gap-1 hover:bg-minimal-bg rounded-minimal px-2 py-1 transition-colors duration-300"
        >
          <div className="flex -space-x-2">
            {agents.slice(0, 4).map((agent) => (
              <div key={agent.id} className="w-7 h-7 rounded-full bg-minimal-bg border-2 border-white flex items-center justify-center text-xs" title={agent.name}>
                {agent.avatar}
              </div>
            ))}
            {agents.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-minimal-border border-2 border-white flex items-center justify-center text-[10px] text-minimal-secondary">
                +{agents.length - 4}
              </div>
            )}
          </div>
        </button>
        {isPopoverOpen && (
          <div className="absolute top-full right-12 mt-2 w-64 bg-minimal-glass/80 backdrop-blur-xl border border-minimal-glass-border rounded-minimal shadow-minimal-glass z-50 p-3 shadow-minimal-glow">
            <p className="text-[10px] text-minimal-tertiary uppercase tracking-wider mb-2">在线智能体</p>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-2.5 p-2 rounded-minimal hover:bg-minimal-bg transition-colors duration-300">
                  <span className="text-lg">{agent.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-minimal-text truncate block">{agent.name}</span>
                    <span className="text-[11px] text-minimal-tertiary truncate block">{agent.description}</span>
                  </div>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded shrink-0 ${agent.role === 'orchestrator' ? 'bg-minimal-accent/10 text-minimal-accent' : 'bg-minimal-success/10 text-minimal-success'}`}>
                    {agent.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={onToggleRightPanel}
          className={`p-2 rounded-minimal transition-colors duration-300 ${
            isRightPanelOpen ? 'bg-minimal-accent/10 text-minimal-accent' : 'hover:bg-minimal-bg text-minimal-tertiary hover:text-minimal-text'
          }`}
          title="编辑器面板"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
