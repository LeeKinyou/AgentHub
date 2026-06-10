'use client';

import { useState } from 'react';

export interface FileOperation {
  action: string;
  path: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
}

interface FileOperationDialogProps {
  operations: FileOperation[];
  onApprove: (operations: FileOperation[]) => void;
  onApproveAll: (operations: FileOperation[], remember: boolean) => void;
  onReject: () => void;
}

function getFileIcon(path: string): string {
  if (path.endsWith('.tsx') || path.endsWith('.ts')) return '📘';
  if (path.endsWith('.py')) return '🐍';
  if (path.endsWith('.json')) return '📋';
  if (path.endsWith('.md')) return '📝';
  if (path.endsWith('.css')) return '🎨';
  if (path.endsWith('.html')) return '🌐';
  if (path.endsWith('.js')) return '📒';
  return '📄';
}

function getActionLabel(action: string): { label: string; color: string } {
  switch (action) {
    case 'create': return { label: '新建', color: 'text-minimal-success bg-minimal-success/10 border-minimal-success/20' };
    case 'modify':
    case 'edit':
    case 'update':
    case 'write': return { label: '修改', color: 'text-minimal-warning bg-minimal-warning/10 border-minimal-warning/20' };
    case 'delete':
    case 'remove': return { label: '删除', color: 'text-minimal-error bg-minimal-error/10 border-minimal-error/20' };
    default: return { label: action ?? '未知', color: 'text-minimal-secondary bg-minimal-bg border-minimal-border' };
  }
}

function DiffPreview({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);
  const preview = [];
  for (let i = 0; i < Math.min(maxLines, 20); i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine !== newLine) {
      if (oldLine !== undefined) preview.push({ type: 'removed', content: oldLine });
      if (newLine !== undefined) preview.push({ type: 'added', content: newLine });
    } else {
      preview.push({ type: 'normal', content: oldLine ?? '' });
    }
  }
  if (maxLines > 20) preview.push({ type: 'normal', content: `... 还有 ${maxLines - 20} 行` });

  return (
    <pre className="mt-2 p-2 rounded-minimal bg-minimal-text dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border text-[11px] leading-relaxed overflow-x-auto max-h-40 overflow-y-auto">
      {preview.map((line, i) => (
        <div key={i} className={
          line.type === 'added' ? 'text-minimal-success bg-minimal-success/5' :
          line.type === 'removed' ? 'text-minimal-error bg-minimal-error/5' :
          'text-white/50'
        }>
          <span className="inline-block w-4 text-center mr-2">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          {line.content}
        </div>
      ))}
    </pre>
  );
}

export function FileOperationDialog({ operations, onApprove, onApproveAll, onReject }: FileOperationDialogProps) {
  const [selectedOps, setSelectedOps] = useState<Set<number>>(new Set(operations.map((_, i) => i)));
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [remember, setRemember] = useState(false);

  const toggleOp = (idx: number) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleApprove = () => {
    const approved = operations.filter((_, i) => selectedOps.has(i));
    onApprove(approved);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onReject}>
      <div className="bg-minimal-glass/80 dark:bg-minimal-dark-surface/80 backdrop-blur-xl border border-minimal-glass-border dark:border-minimal-dark-border rounded-minimal shadow-minimal-glass w-[480px] max-h-[80vh] flex flex-col shadow-minimal-glow" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-minimal-glass-border dark:border-minimal-dark-border">
          <div className="w-10 h-10 rounded-minimal bg-minimal-accent/10 border border-minimal-accent/20 flex items-center justify-center text-lg">📁</div>
          <div>
            <h3 className="text-sm font-semibold text-minimal-text dark:text-minimal-dark-text">文件操作请求</h3>
            <p className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">Agent 请求对 {operations.length} 个文件进行操作，请审查后确认</p>
          </div>
        </div>

        {/* Operations list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {operations.map((op, idx) => {
            const { label, color } = getActionLabel(op.action);
            const isExpanded = expandedIdx === idx;
            return (
              <div key={idx} className="rounded-minimal border border-minimal-border dark:border-minimal-dark-border overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedOps.has(idx)}
                    onChange={() => toggleOp(idx)}
                    className="w-4 h-4 rounded border-minimal-border text-minimal-accent focus:ring-minimal-accent focus:ring-offset-0"
                  />
                  <span className="text-sm">{getFileIcon(op.path)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-minimal-text dark:text-minimal-dark-text font-mono truncate block">{op.path}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${color}`}>{label}</span>
                  <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text transition-colors duration-300">
                    <span className="text-xs">{isExpanded ? '▲' : '▼'}</span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-minimal-border dark:border-minimal-dark-border">
                    {(op.action === 'create') && op.content && (
                      <pre className="mt-2 p-2 rounded-minimal bg-minimal-text dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border text-[11px] text-minimal-success leading-relaxed overflow-x-auto max-h-40 overflow-y-auto">
                        {op.content.slice(0, 1000)}{op.content.length > 1000 ? '\n...' : ''}
                      </pre>
                    )}
                    {['modify', 'edit', 'update', 'write'].includes(op.action) && op.oldContent && op.newContent && (
                      <DiffPreview oldContent={op.oldContent} newContent={op.newContent} />
                    )}
                    {['modify', 'edit', 'update', 'write'].includes(op.action) && !op.oldContent && op.newContent && (
                      <pre className="mt-2 p-2 rounded-minimal bg-minimal-text dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border text-[11px] text-minimal-warning leading-relaxed overflow-x-auto max-h-40 overflow-y-auto">
                        {op.newContent.slice(0, 1000)}{op.newContent.length > 1000 ? '\n...' : ''}
                      </pre>
                    )}
                    {['delete', 'remove'].includes(op.action) && (
                      <p className="mt-2 text-xs text-minimal-error">此操作将删除该文件，不可撤销</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-minimal-border dark:border-minimal-dark-border bg-minimal-bg dark:bg-minimal-dark-bg">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-minimal-border text-minimal-accent focus:ring-minimal-accent focus:ring-offset-0" />
              <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary">记住选择</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={onReject} className="px-4 py-1.5 text-xs font-medium text-minimal-secondary dark:text-minimal-dark-secondary hover:text-minimal-text dark:hover:text-minimal-dark-text border border-minimal-border dark:border-minimal-dark-border rounded-minimal hover:bg-white dark:hover:bg-minimal-dark-surface transition-colors duration-300">
              拒绝全部
            </button>
            <button onClick={handleApprove} disabled={selectedOps.size === 0}
              className="px-4 py-1.5 text-xs font-medium text-white bg-minimal-accent hover:bg-minimal-accent-hover rounded-minimal transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed">
              确认应用 ({selectedOps.size})
            </button>
            <button onClick={() => onApproveAll(operations, remember)}
              className="px-4 py-1.5 text-xs font-medium text-white bg-minimal-success hover:bg-minimal-success/90 rounded-minimal transition-colors duration-300">
              {remember ? '始终信任并全部应用' : '一键全部应用'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
