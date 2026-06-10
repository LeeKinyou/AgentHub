'use client';

import { useState, useRef, useEffect } from 'react';

interface CodeSelection {
  startLine: number;
  endLine: number;
  code: string;
  fileName?: string;
}

interface CodeSelectionChatProps {
  selection: CodeSelection | null;
  onSubmit: (instruction: string, selection: CodeSelection) => void;
  onClose: () => void;
}

export function CodeSelectionChat({ selection, onSubmit, onClose }: CodeSelectionChatProps) {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (selection) {
      inputRef.current?.focus();
    }
  }, [selection]);

  if (!selection) return null;

  const handleSubmit = () => {
    if (!instruction.trim()) return;
    onSubmit(instruction.trim(), selection);
    setInstruction('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[600px] max-w-[90vw]">
      <div className="bg-minimal-glass/80 backdrop-blur-xl border border-minimal-glass-border rounded-minimal shadow-minimal-glass overflow-hidden shadow-minimal-glow">
        <div className="flex items-center justify-between px-4 py-2 bg-minimal-glass/40 backdrop-blur-xl border-b border-minimal-glass-border">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-minimal-accent/10 text-minimal-accent rounded-minimal">
              选中代码
            </span>
            {selection.fileName && (
              <span className="text-xs text-minimal-secondary">{selection.fileName}</span>
            )}
            <span className="text-xs text-minimal-tertiary">
              第 {selection.startLine}-{selection.endLine} 行
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-minimal hover:bg-minimal-border text-minimal-tertiary hover:text-minimal-text transition-colors duration-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 max-h-[120px] overflow-auto bg-minimal-text">
          <pre className="text-xs font-mono text-white/80 leading-relaxed">
            {selection.code.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 text-white/30 select-none">{selection.startLine + i}</span>
                <span className="flex-1">{line}</span>
              </div>
            ))}
          </pre>
        </div>

        <div className="p-3 border-t border-minimal-border">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的修改... (Enter 发送, Shift+Enter 换行)"
              className="flex-1 px-3 py-2 bg-minimal-bg border border-minimal-border rounded-minimal text-sm text-minimal-text placeholder:text-minimal-tertiary resize-none focus:outline-none focus:border-minimal-accent transition-colors duration-300"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!instruction.trim()}
              className="px-4 py-2 bg-minimal-accent hover:bg-minimal-accent-hover disabled:bg-minimal-border disabled:text-minimal-tertiary text-white text-sm rounded-minimal transition-colors duration-300 self-end"
            >
              发送
            </button>
          </div>
          <p className="text-[10px] text-minimal-tertiary mt-2">
            提示：选中代码后，在这里描述你想要的修改，AI 会根据你的指令修改选中的代码片段
          </p>
        </div>
      </div>
    </div>
  );
}
