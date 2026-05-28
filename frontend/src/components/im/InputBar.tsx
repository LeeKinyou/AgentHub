'use client';

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { MentionList } from './MentionList';

interface InputBarProps {
  agents: AgentProfile[];
  onSend: (text: string) => void;
}

export function InputBar({ agents, onSend }: InputBarProps) {
  const [text, setText] = useState('');
  const [mentionKey, setMentionKey] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(mentionKey.toLowerCase())
  );

  useEffect(() => {
    const match = text.match(/@(\w*)$/);
    if (match) {
      setMentionKey(match[1]);
      setIsMentionOpen(true);
      setHighlightIndex(0);
    } else {
      setIsMentionOpen(false);
    }
  }, [text]);

  const handleSelectMention = (agent: AgentProfile) => {
    const newText = text.replace(/@\w*$/, `@${agent.name} `);
    setText(newText);
    setIsMentionOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isMentionOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, filteredAgents.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && isMentionOpen) {
      e.preventDefault();
      handleSelectMention(filteredAgents[highlightIndex]);
    } else if (e.key === 'Escape') {
      setIsMentionOpen(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
      <MentionList
        agents={filteredAgents}
        isOpen={isMentionOpen}
        highlightIndex={highlightIndex}
        onSelect={handleSelectMention}
      />
      <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mb-2">
        使用 @ 唤醒特定智能体 · 输入 /artifact 体验 Artifacts · Enter 发送
      </p>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors"
        >
          发送
        </button>
      </div>
    </form>
  );
}
