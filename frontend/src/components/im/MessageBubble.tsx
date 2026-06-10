'use client';

import type { AgentProfile } from '@agenthub/shared/types/entities';
import type { DiffLine } from '@/hooks/useEditorTabs';
import type { StreamMessage } from './ChatArea';
import { MarkdownRenderer } from './MarkdownRenderer';
import { InlineDiffCard } from './InlineDiffCard';
import { DeployStatusCard } from './DeployStatusCard';
import { FileAttachment } from './FileAttachment';
import { SandboxPreview } from './SandboxPreview';
import { ArtifactPreview } from './ArtifactPreview';
import { OrchestratorStatusCard } from './OrchestratorStatusCard';
import { AgentStatusCard } from './AgentStatusCard';

function parseHtmlBlock(content: string): string | null {
  const match = content.match(/```html\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
  return [...new Set(text.match(urlRegex) ?? [])];
}

function LinkPreviewCard({ url }: { url: string }) {
  let domain = '';
  try { domain = new URL(url).hostname; } catch {}
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 p-2 rounded-minimal border border-minimal-border dark:border-minimal-dark-border bg-white dark:bg-minimal-dark-surface hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-colors duration-200 max-w-xs">
      <div className="w-8 h-8 rounded bg-minimal-bg dark:bg-minimal-dark-bg flex items-center justify-center text-xs shrink-0">🔗</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-minimal-text dark:text-minimal-dark-text truncate">{domain}</p>
        <p className="text-[10px] text-minimal-secondary dark:text-minimal-dark-secondary truncate">{url}</p>
      </div>
    </a>
  );
}

interface MessageBubbleProps {
  msg: StreamMessage;
  agents: AgentProfile[];
  activeTabId: string | null;
  onApplyDiff: (diffLines: DiffLine[]) => void;
  onReply?: (messageId: string) => void;
  onQuote?: (messageId: string) => void;
  onRegenerate?: (messageId: string) => void;
  onPinMessage?: (messageId: string) => void;
}

export function MessageBubble({ msg, agents, activeTabId, onApplyDiff, onReply, onQuote, onRegenerate, onPinMessage }: MessageBubbleProps) {
  const isUser = msg.senderType === 'user';
  const agent = agents.find((a) => a.id === msg.senderId);
  const htmlCode = !isUser ? parseHtmlBlock(msg.content) : null;
  const textContent = htmlCode ? msg.content.replace(/```html\n[\s\S]*?```/, '').trim() : msg.content;
  const urls = extractUrls(textContent);

  const handleApply = () => {
    const diffMatch = msg.content.match(/```diff\n([\s\S]*?)```/);
    const codeMatch = msg.content.match(/```(\w*)\n([\s\S]*?)```/);
    if (diffMatch) {
      const lines = diffMatch[1].split('\n').filter((l) => l.length > 0).map((line) => {
        if (line.startsWith('+') && !line.startsWith('+++')) return { type: 'added' as const, content: line.slice(1) };
        if (line.startsWith('-') && !line.startsWith('---')) return { type: 'removed' as const, content: line.slice(1) };
        return { type: 'normal' as const, content: line.startsWith(' ') ? line.slice(1) : line };
      });
      onApplyDiff(lines);
    } else if (codeMatch) {
      onApplyDiff(codeMatch[2].split('\n').map((line) => ({ type: 'added' as const, content: line })));
    } else {
      onApplyDiff([{ type: 'added', content: msg.content }]);
    }
  };

  const handleCopy = () => navigator.clipboard.writeText(msg.content);

  return (
    <div className={`group flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${isUser ? 'bg-minimal-accent' : 'bg-minimal-bg dark:bg-minimal-dark-bg border border-minimal-border dark:border-minimal-dark-border'}`}>
        {isUser ? '👤' : agent?.avatar ?? '🤖'}
      </div>
      <div className={`max-w-[75%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <span className="text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary mb-1">{isUser ? '你' : agent?.name ?? 'AI'}</span>
        <div className={`relative px-3 py-2 rounded-minimal text-sm leading-relaxed ${isUser ? 'bg-minimal-accent text-white' : 'bg-white/80 dark:bg-minimal-dark-glass backdrop-blur-sm border border-minimal-glass-border dark:border-minimal-dark-glass-border text-minimal-text dark:text-minimal-dark-text shadow-minimal-glow'}`}>
          {msg.replyToId && (
            <div className="mb-2 px-2 py-1 bg-minimal-bg dark:bg-minimal-dark-bg rounded text-[11px] text-minimal-secondary dark:text-minimal-dark-secondary border-l-2 border-minimal-border dark:border-minimal-dark-border">
              回复消息...
            </div>
          )}
          {textContent && <MarkdownRenderer content={textContent} />}
          {msg.isStreaming && <span className="inline-block w-1.5 h-4 bg-minimal-tertiary dark:bg-minimal-dark-tertiary animate-pulse ml-0.5 align-text-bottom" />}
        </div>
        {/* Action Toolbar */}
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-1 group-hover:translate-y-0">
          <button onClick={handleCopy} title="复制" className="p-1.5 rounded-minimal text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-all duration-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2"/></svg>
          </button>
          {onReply && (
            <button onClick={() => onReply(msg.id)} title="回复" className="p-1.5 rounded-minimal text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-all duration-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><polyline points="9 17 4 12 9 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 18v-2a4 4 0 00-4-4H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}
          {onQuote && (
            <button onClick={() => onQuote(msg.id)} title="引用" className="p-1.5 rounded-minimal text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg transition-all duration-200">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C9.591 11.69 11 13.166 11 15c0 1.933-1.567 3.5-3.5 3.5-1.193 0-2.31-.565-2.917-1.179zM14.583 17.321C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311C19.591 11.69 21 13.166 21 15c0 1.933-1.567 3.5-3.5 3.5-1.193 0-2.31-.565-2.917-1.179z"/></svg>
            </button>
          )}
          {onPinMessage && (
            <button onClick={() => onPinMessage(msg.id)} title={msg.isPinned ? '取消 Pin' : 'Pin 消息'} className={`p-1.5 rounded-minimal transition-all duration-200 ${msg.isPinned ? 'text-minimal-warning bg-minimal-warning/10 hover:bg-minimal-warning/20' : 'text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-text dark:hover:text-minimal-dark-text hover:bg-minimal-bg dark:hover:bg-minimal-dark-bg'}`}>
              <svg className="w-3.5 h-3.5" fill={msg.isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2C9.5 2 8 4 8 6c0 1.5.5 2.5 1.5 3.5L8 12l4 4 4-4-1.5-2.9c1-1 1.5-2 1.5-3.5 0-2-1.5-4-4-4zm0 0v5"/></svg>
            </button>
          )}
          {!isUser && onRegenerate && !msg.isStreaming && (
            <button onClick={() => onRegenerate(msg.id)} title="重新生成" className="p-1.5 rounded-minimal text-minimal-tertiary dark:text-minimal-dark-tertiary hover:text-minimal-accent hover:bg-minimal-accent/5 transition-all duration-200">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          )}
        </div>
        {htmlCode && (
          <div className="relative mt-2">
            <ArtifactPreview htmlCode={htmlCode} />
            {activeTabId && (
              <button onClick={handleApply} className="absolute top-3 right-3 px-2.5 py-1 text-[10px] rounded-minimal bg-minimal-accent/10 text-minimal-accent hover:bg-minimal-accent/20 transition-colors duration-200 z-10">
                Apply to File
              </button>
            )}
          </div>
        )}
        {msg.contentType === 'diff_patch' && (
          <div className="mt-2"><InlineDiffCard patchContent={msg.content} onApply={handleApply} /></div>
        )}
        {msg.contentType === 'deploy_status' && msg.deployStatus && (
          <div className="mt-2"><DeployStatusCard status={msg.deployStatus} url={msg.deployStatus === 'success' ? 'https://agenthub-demo.vercel.app' : undefined} /></div>
        )}
        {msg.contentType === 'orchestrator_status' && msg.orchestratorData && (
          <div className="mt-2">
            <OrchestratorStatusCard
              status={msg.orchestratorData.status}
              steps={msg.orchestratorData.steps}
              currentStep={msg.orchestratorData.currentStep}
            />
          </div>
        )}
        {msg.contentType === 'agent_status' && msg.agentStatusData && (
          <div className="mt-2">
            <AgentStatusCard
              agent={agents.find((a) => a.id === msg.agentStatusData?.agentId) ?? { id: msg.agentStatusData.agentId, name: 'Agent', role: 'expert', status: 'online' }}
              status={msg.agentStatusData.status}
              displayText={msg.agentStatusData.displayText}
              progress={msg.agentStatusData.progress}
            />
          </div>
        )}
        {msg.cardData?.fileAttachment && (
          <div className="mt-2">
            <FileAttachment
              url={msg.cardData.fileAttachment.url}
              filename={msg.cardData.fileAttachment.filename}
              size={msg.cardData.fileAttachment.size}
              mimeType={msg.cardData.fileAttachment.mimeType}
            />
          </div>
        )}
        {msg.cardData?.previewBlock && (
          <div className="mt-2 rounded-minimal overflow-hidden border border-minimal-border dark:border-minimal-dark-border" style={{ height: msg.cardData.previewBlock.viewport === 'mobile' ? 500 : msg.cardData.previewBlock.viewport === 'tablet' ? 400 : 300 }}>
            <SandboxPreview
              htmlContent={`<!DOCTYPE html><html><head><style>${msg.cardData.previewBlock.css ?? ''}</style></head><body>${msg.cardData.previewBlock.html}<script>${msg.cardData.previewBlock.js ?? ''}<\/script></body></html>`}
            />
          </div>
        )}
        {urls.length > 0 && (
          <div className="mt-2 space-y-1">
            {urls.slice(0, 3).map((url) => <LinkPreviewCard key={url} url={url} />)}
          </div>
        )}
      </div>
    </div>
  );
}
