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
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded">
              选中代码
            </span>
            {selection.fileName && (
              <span className="text-xs text-zinc-500">{selection.fileName}</span>
            )}
            <span className="text-xs text-zinc-600">
              第 {selection.startLine}-{selection.endLine} 行
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-3 max-h-[120px] overflow-auto bg-zinc-950">
          <pre className="text-xs font-mono text-zinc-400 leading-relaxed">
            {selection.code.split('\n').map((line, i) => (
              <div key={i} className="flex">
                <span className="w-8 text-right pr-2 text-zinc-600 select-none">{selection.startLine + i}</span>
                <span className="flex-1">{line}</span>
              </div>
            ))}
          </pre>
        </div>

        <div className="p-3 border-t border-zinc-800">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述你想要的修改... (Enter 发送, Shift+Enter 换行)"
              className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-indigo-500"
              rows={2}
            />
            <button
              onClick={handleSubmit}
              disabled={!instruction.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-lg transition-colors self-end"
            >
              发送
            </button>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            💡 提示：选中代码后，在这里描述你想要的修改，AI 会根据你的指令修改选中的代码片段
          </p>
        </div>
      </div>
    </div>
  );
}