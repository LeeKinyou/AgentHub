'use client';
import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import type { AgentProfile } from '@agenthub/shared/types/entities';
import { MentionList } from './MentionList';
import { apiClient } from '@/lib/api';

export interface ContextItem {
  id: string;
  type: 'file' | 'agent' | 'snippet';
  name: string;
  content?: string;
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
  onDropExternalFiles?: (files: FileList) => void;
  onFileUploaded?: (file: { url: string; filename: string; size: number; mimeType: string }) => void;
  replyToId?: string | null;
  onClearReply?: () => void;
}

function ContextChipsBar({ items, onRemove }: { items: ContextItem[]; onRemove: (id: string) => void }) {
  if (items.length === 0) return null;
  const cfg: Record<string, { icon: string; pre: string; cls: string }> = {
    agent:   { icon: '🤖', pre: '提及', cls: 'bg-minimal-accent/5 border-minimal-accent/20 text-minimal-accent' },
    file:    { icon: '📄', pre: '附件', cls: 'bg-minimal-bg border-minimal-border text-minimal-secondary' },
    snippet: { icon: '✂️', pre: '片段', cls: 'bg-minimal-bg border-minimal-border text-minimal-secondary' },
  };
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide">
      {items.map((item) => {
        const c = cfg[item.type] ?? cfg.snippet;
        return (
          <span key={item.id} className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-minimal border shrink-0 ${c.cls}`}>
            <span>{c.icon}</span><span className="opacity-60">{c.pre}:</span>
            <span className="max-w-[100px] truncate font-medium">{item.name}</span>
            <button onClick={() => onRemove(item.id)} className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-minimal-error/10 text-minimal-tertiary hover:text-minimal-error transition-colors duration-300">×</button>
          </span>
        );
      })}
    </div>
  );
}

export function InputContextArea({ agents, contextItems, onRemoveContext, onSend, onDropFile, onDropExternalFiles, onFileUploaded, replyToId, onClearReply }: InputContextAreaProps) {
  const [text, setText] = useState('');
  const [mentionKey, setMentionKey] = useState('');
  const [isMentionOpen, setIsMentionOpen] = useState(false);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashIdx, setSlashIdx] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await apiClient.uploadFile(file);
        if (result.data) onFileUploaded?.(result.data);
      }
    } finally {
      setIsUploading(false);
    }
  }, [onFileUploaded]);
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
      className={`relative p-4 border-t shrink-0 transition-colors duration-300 ${
        isDragOver ? 'border-minimal-accent bg-minimal-accent/5' : 'border-minimal-border'
      }`}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const name = e.dataTransfer.getData('text/plain');
        if (name && onDropFile) { onDropFile(name); return; }
        if (e.dataTransfer.files.length > 0 && onDropExternalFiles) { onDropExternalFiles(e.dataTransfer.files); }
      }}
    >
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center rounded-minimal border-2 border-dashed border-minimal-accent bg-minimal-accent/5 z-40 pointer-events-none">
          <span className="text-sm font-medium text-minimal-accent">释放以附加文件</span>
        </div>
      )}
      {isSlashOpen && filteredCmds.length > 0 && (
        <div className="absolute bottom-full left-4 mb-2 w-56 bg-minimal-glass/80 backdrop-blur-xl border border-minimal-glass-border rounded-minimal shadow-minimal-glass overflow-hidden z-50 shadow-minimal-glow">
          <div className="px-3 py-1.5 border-b border-minimal-glass-border">
            <span className="text-[10px] text-minimal-tertiary uppercase tracking-wider">快捷指令</span>
          </div>
          {filteredCmds.map((cmd, i) => (
            <button key={cmd.id} onClick={() => handleSelectSlash(cmd)}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors duration-300 ${i === slashIdx ? 'bg-minimal-bg' : 'hover:bg-minimal-bg'}`}>
              <span className="text-sm font-mono text-minimal-accent">{cmd.label}</span>
              <span className="text-xs text-minimal-tertiary truncate">{cmd.desc}</span>
            </button>
          ))}
        </div>
      )}
      <MentionList agents={filteredAgents} isOpen={isMentionOpen} highlightIndex={mentionIdx} onSelect={handleSelectMention} />
      <ContextChipsBar items={contextItems} onRemove={onRemoveContext} />
      {replyToId && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-minimal-accent/5 border border-minimal-accent/20 rounded-minimal">
          <span className="text-xs text-minimal-accent">回复消息</span>
          <button onClick={onClearReply} className="ml-auto text-minimal-tertiary hover:text-minimal-text transition-colors duration-300">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}
      <p className="text-[11px] text-minimal-tertiary mb-2">
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
          data-testid="message-input"
          className="flex-1 px-4 py-2 bg-minimal-bg border border-minimal-border rounded-minimal text-sm text-minimal-text placeholder-minimal-tertiary focus:outline-none focus:border-minimal-accent transition-colors duration-200 resize-none min-h-[38px] max-h-[120px]"
          style={{ height: Math.min(120, Math.max(38, text.split('\n').length * 24)) }}
        />
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="附件"
          className="px-3 py-2 border border-minimal-border rounded-minimal text-minimal-secondary hover:text-minimal-text hover:bg-minimal-bg transition-colors duration-200 disabled:opacity-50 self-end"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        </button>
        <button
          onClick={() => { const trimmed = text.trim(); if (trimmed) { onSend(trimmed); setText(''); } }}
          disabled={!text.trim()}
          data-testid="send-button"
          className="px-4 py-2 bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border disabled:text-minimal-tertiary text-white text-sm rounded-minimal transition-colors duration-200 self-end"
        >
          发送
        </button>
      </div>
    </div>
  );
}
