import type { AgentProfile, Session, Message } from '@agenthub/shared/types/entities';

export const agents: AgentProfile[] = [
  {
    id: 'agent-orchestrator-001',
    name: 'Orchestrator',
    avatar: '🤖',
    role: 'orchestrator',
    description: '主编排器，负责任务拆解与多 Agent 调度',
  },
  {
    id: 'agent-claude-001',
    name: 'Claude Code',
    avatar: '🦅',
    role: 'expert',
    description: '后端工程师专家，擅长 API 设计与数据库架构',
  },
  {
    id: 'agent-codex-001',
    name: 'Codex',
    avatar: '⚡',
    role: 'expert',
    description: '前端工程师专家，擅长 React 组件与 UI 实现',
  },
];

export const sessions: Session[] = [
  {
    id: 'session-group-001',
    title: '全栈协作 · Todo App 开发',
    type: 'group',
    agentIds: ['agent-orchestrator-001', 'agent-claude-001', 'agent-codex-001'],
    createdAt: '2026-05-27T09:00:00Z',
  },
  {
    id: 'session-single-001',
    title: '1v1 · Codex 前端咨询',
    type: 'single',
    agentIds: ['agent-codex-001'],
    createdAt: '2026-05-27T10:30:00Z',
  },
];

export const messages: Message[] = [
  {
    id: 'msg-001',
    sessionId: 'session-group-001',
    senderType: 'user',
    senderId: 'user-001',
    content: '帮我做一个带登录功能的 Todo 应用',
    contentType: 'text',
    createdAt: '2026-05-27T09:01:00Z',
  },
  {
    id: 'msg-002',
    sessionId: 'session-group-001',
    senderType: 'agent',
    senderId: 'agent-orchestrator-001',
    content: '收到，我将任务拆解如下：\n1. 数据库设计 → @Claude Code\n2. Auth API → @Claude Code\n3. 前端页面 → @Codex\n4. 联调部署 → @Codex',
    contentType: 'markdown',
    createdAt: '2026-05-27T09:01:05Z',
  },
  {
    id: 'msg-003',
    sessionId: 'session-group-001',
    senderType: 'agent',
    senderId: 'agent-claude-001',
    content: '已完成数据库 Schema 设计和 Auth API，以下是 User 表定义：',
    contentType: 'text',
    createdAt: '2026-05-27T09:02:30Z',
  },
  {
    id: 'msg-004',
    sessionId: 'session-group-001',
    senderType: 'agent',
    senderId: 'agent-codex-001',
    content: '前端倒计时组件已完成',
    contentType: 'card',
    createdAt: '2026-05-27T09:03:45Z',
    cardData: {
      codeBlock: {
        title: 'CountDown.tsx',
        language: 'tsx',
        code: `import { useState, useEffect } from 'react';

interface CountDownProps {
  seconds: number;
  onComplete?: () => void;
}

export function CountDown({ seconds, onComplete }: CountDownProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) {
      onComplete?.();
      return;
    }
    const timer = setInterval(() => {
      setRemaining(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining, onComplete]);

  return (
    <div className="text-4xl font-mono text-indigo-400">
      {String(Math.floor(remaining / 60)).padStart(2, '0')}:
      {String(remaining % 60).padStart(2, '0')}
    </div>
  );
}`,
      },
    },
  },
  {
    id: 'msg-005',
    sessionId: 'session-single-001',
    senderType: 'user',
    senderId: 'user-001',
    content: '帮我优化一下这个组件的性能',
    contentType: 'text',
    createdAt: '2026-05-27T10:31:00Z',
  },
  {
    id: 'msg-006',
    sessionId: 'session-single-001',
    senderType: 'agent',
    senderId: 'agent-codex-001',
    content: '好的，我来分析一下性能瓶颈并提供优化方案。',
    contentType: 'text',
    createdAt: '2026-05-27T10:31:15Z',
  },
];
