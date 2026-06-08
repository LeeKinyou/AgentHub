'use client';

import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { MentionList } from './MentionList';

const SETTINGS_KEY = 'agenthub_general_settings';

function getSendTrigger(): string {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw).sendTrigger ?? 'enter';
  } catch {}
  return 'enter';
}

interface InputBarProps {
  agents: AgentProfile[];
  onSend: (text: string) => void;
}

export function InputBar({ agents, onSend }: InputBarProps) {
  const [text, setText] = useState('');
  const [mentionKey, setMentionKey] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [sendTrigger, setSendTrigger] = useState(getSendTrigger);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(mentionKey.toLowerCase())
  );

  // Re-read setting when settings change
  useEffect(() => {
    const refresh = () => setSendTrigger(getSendTrigger());
    window.addEventListener('agenthub-settings-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('agenthub-settings-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

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

  const doSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Mention navigation
    if (isMentionOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => Math.min(prev + 1, filteredAgents.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleSelectMention(filteredAgents[highlightIndex]);
        return;
      } else if (e.key === 'Escape') {
        setIsMentionOpen(false);
        return;
      }
    }

    // Send trigger: ctrl-enter mode
    if (sendTrigger === 'ctrl-enter') {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        doSend();
        return;
      }
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        // Let Enter create a newline — insert it manually since input is type="text"
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        const start = target.selectionStart ?? text.length;
        const end = target.selectionEnd ?? text.length;
        setText(text.slice(0, start) + '\n' + text.slice(end));
        return;
      }
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // In ctrl-enter mode, form submit should not send
    if (sendTrigger === 'ctrl-enter') return;
    doSend();
  };

  return (
    <form onSubmit={handleSubmit} className="relative p-4 border-t border-minimal-glass-border dark:border-minimal-dark-border bg-minimal-glass/30 dark:bg-minimal-dark-surface/30 backdrop-blur-xl shrink-0">
      <MentionList
        agents={filteredAgents}
        isOpen={isMentionOpen}
        highlightIndex={highlightIndex}
        onSelect={handleSelectMention}
      />
      <p className="text-[11px] text-minimal-tertiary dark:text-minimal-dark-tertiary mb-2">
        使用 @ 唤醒特定智能体 · 输入 /artifact 体验 Artifacts · {sendTrigger === 'ctrl-enter' ? 'Ctrl+Enter 发送，Enter 换行' : 'Enter 发送，Shift+Enter 换行'}
      </p>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          className="flex-1 px-4 py-2 bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border rounded-minimal text-sm text-minimal-text dark:text-minimal-dark-text placeholder-minimal-tertiary dark:placeholder-minimal-dark-tertiary focus:outline-none focus:border-minimal-accent transition-all duration-300"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-4 py-2 bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border dark:disabled:bg-minimal-dark-border disabled:text-minimal-tertiary dark:disabled:text-minimal-dark-tertiary text-white text-sm rounded-minimal transition-colors duration-300"
        >
          发送
        </button>
      </div>
    </form>
  );
}
