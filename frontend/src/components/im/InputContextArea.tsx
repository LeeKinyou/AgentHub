'use client';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { MentionList } from './MentionList';

export interface ContextItem {
  id: string;
  type: 'file' | 'agent' | 'snippet';
  name: string;
}
interface SlashCommand { id: string; label: string; desc: string; }
const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'explain', label: '/explain', desc: '解释选中的上下文' },
  { id: 'bug', label: '/bug', desc: '诊断代码缺陷' },
  { id: 'test', label: '/test', desc: '自动编写单元测试' },
];
interface InputContextAreaProps {
  agents: AgentProfile[];
  contextItems: ContextItem[];
  onRemoveContext: (id: string) => void;
  onSend: (text: string) => void;
  onDropFile?: (fileName: string) => void;
  replyToId?: string | null;
  onClearReply?: () => void;
}

function ContextChipsBar({ items, onRemove }: { items: ContextItem[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;
  const cfg: Record<string, { icon: string; pre: string; cls: string }> = {
    agent:   { icon: '🤖', pre: '提及', cls: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700/40 text-purple-700 dark:text-purple-300' },
    file:    { icon: '📄', pre: '附件', cls: 'bg-zinc-200 dark:bg-zinc-700/30 border-zinc-300 dark:border-zinc-600/40 text-zinc-600 dark:text-zinc-300' },
    snippet: { icon: '✂️', pre: '片段', cls: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300' },
  };
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item) => {
        const c = cfg[item.type] ?? cfg.snippet;
        return (
          <span key={item.id} className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md border shrink-0 ${c.cls}`}>
            <span>{c.icon}</span><span className="opacity-60">{c.pre}:</span>
            <span className="max-w-[100px] truncate font-medium">{item.name}</span>
            <button onClick={() => onRemove(item.id)} className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors">×</button>
          </span>
        );
      })}
    </div>
  );
}

export function InputContextArea({ agents, contextItems, onRemoveContext, onSend, onDropFile, replyToId, onClearReply }: InputContextAreaProps) {
  const [text, setText] = useState('');
  const [mentionKey, setMentionKey] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const filteredAgents = agents.filter((a) => a.name.toLowerCase().includes(mentionKey.toLowerCase()));
  const filteredCmds = SLASH_COMMANDS.filter((c) => c.label.includes(text.match(/\/\w*$/)?.[0] ?? ''));
  useEffect(() => {
    const mentionMatch = text.match(/@(\w*)$/);
    const slashMatch = text.match(/^\/\w*$/);
    if (mentionMatch) { setMentionKey(mentionMatch[1]); setIsMentionOpen(true); setMentionIdx(0); setIsSlashOpen(false); }
    else { setIsMentionOpen(false); }
    if (slashMatch && !mentionMatch) { setIsSlashOpen(true); setSlashIdx(0); }
    else { setIsSlashOpen(false); }
  }, [text]);
  const handleSelectMention = (agent: AgentProfile) => {
    setText((prev) => prev.replace(/@\w*$/, `@${agent.name} `));
    setIsMentionOpen(false);
    textareaRef.current?.focus();
  };
  const handleSelectSlash = (cmd: SlashCommand) => {
    setText(cmd.label + ' ');
    setIsSlashOpen(false);
    textareaRef.current?.focus();
  };
  const handleKeyDown = (e: KeyboardEvent) => {
    if (isMentionOpen && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx((i) => Math.min(i + 1, filteredAgents.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); handleSelectMention(filteredAgents[mentionIdx]); return; }
      if (e.key === 'Escape') { setIsMentionOpen(false); return; }
    }
    if (isSlashOpen && filteredCmds.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx((i) => Math.min(i + 1, filteredCmds.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter') { e.preventDefault(); handleSelectSlash(filteredCmds[slashIdx]); return; }
      if (e.key === 'Escape') { setIsSlashOpen(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const trimmed = text.trim(); if (trimmed) { onSend(trimmed); setText(''); } }
  };
  return (
    <div
      className={`relative p-4 border-t shrink-0 transition-colors duration-200 ${
        isDragOver ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/5' : 'border-zinc-200 dark:border-zinc-800'
      }`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragOver(false); const name = e.dataTransfer.getData('text/plain'); if (name && onDropFile) onDropFile(name); }}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/80 dark:bg-indigo-500/10 z-40 pointer-events-none">
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">📄 释放以附加文件</span>
        </div>
      )}
      {isSlashOpen && filteredCmds.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden z-50">
          <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider">快捷指令</span>
          </div>
          {filteredCmds.map((cmd, i) => (
            <button key={cmd.id} onClick={() => handleSelectSlash(cmd)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors ${i === slashIdx ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
              <span className="text-sm font-mono text-indigo-500 dark:text-indigo-400">{cmd.label}</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 truncate">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}
      <MentionList agents={filteredAgents} isOpen={isMentionOpen} highlightIndex={mentionIdx} onSelect={handleSelectMention} />
      <ContextChipsBar items={contextItems} onRemove={onRemoveContext} />
      {replyToId && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
          <span className="text-xs text-indigo-600 dark:text-indigo-400">↩️ 回复消息</span>
          <button onClick={onClearReply} className="ml-auto text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      <p className="text-[11px] text-zinc-400 dark:text-zinc-600 mb-2">
        @ 唤醒智能体 · / 快捷指令 · 拖拽文件附加 · Enter 发送
      </p>
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
          className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all resize-none min-h-[38px] max-h-[120px]"
          style={{ height: Math.min(120, Math.max(38, text.split('\n').length * 24)) }}
        />
        <button
          onClick={() => { const trimmed = text.trim(); if (trimmed) { onSend(trimmed); setText(''); } }}
          disabled={!text.trim()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors self-end"
        >
          发送
        </button>
      </div>
    </div>
  );
}
