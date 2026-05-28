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

export const ARTIFACT_HTML = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: linear-gradient(135deg, #0f0c29, #302b63, #24243e); font-family: 'Segoe UI', sans-serif; overflow: hidden; }
  .card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 40px; text-align: center; color: #fff; box-shadow: 0 25px 50px rgba(0,0,0,0.3); transition: transform 0.3s; }
  .card:hover { transform: translateY(-5px); }
  .clock { font-size: 64px; font-weight: 200; letter-spacing: 4px; background: linear-gradient(90deg, #667eea, #764ba2, #f093fb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: shimmer 3s ease-in-out infinite; }
  @keyframes shimmer { 0%,100% { filter: hue-rotate(0deg); } 50% { filter: hue-rotate(90deg); } }
  .label { font-size: 14px; color: rgba(255,255,255,0.5); margin-top: 8px; letter-spacing: 6px; text-transform: uppercase; }
  .dots { display: flex; justify-content: center; gap: 8px; margin-top: 24px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; animation: pulse 1.5s ease-in-out infinite; }
  .dot:nth-child(1) { background: #667eea; animation-delay: 0s; }
  .dot:nth-child(2) { background: #764ba2; animation-delay: 0.3s; }
  .dot:nth-child(3) { background: #f093fb; animation-delay: 0.6s; }
  @keyframes pulse { 0%,100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.3); opacity: 1; } }
  .btn { margin-top: 20px; padding: 10px 28px; border: 1px solid rgba(255,255,255,0.2); border-radius: 999px; background: transparent; color: #fff; cursor: pointer; transition: all 0.3s; }
  .btn:hover { background: rgba(255,255,255,0.1); border-color: #667eea; }
</style>
</head>
<body>
<div class="card">
  <div class="clock" id="clock">00:00:00</div>
  <div class="label">Digital Clock</div>
  <div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div>
  <button class="btn" onclick="document.querySelector('.clock').style.animationDuration = document.querySelector('.clock').style.animationDuration === '0.5s' ? '3s' : '0.5s'">✨ Toggle Speed</button>
</div>
<script>
  function update() {
    const d = new Date();
    document.getElementById('clock').textContent =
      [d.getHours(),d.getMinutes(),d.getSeconds()].map(v => String(v).padStart(2,'0')).join(':');
  }
  update(); setInterval(update, 1000);
</script>
</body>
</html>`;

export const ARTIFACT_PREFIX = '好的，我为你生成了一个炫酷的数字时钟 HTML 艺术品：\n\n```html\n';
export const ARTIFACT_SUFFIX = '\n```\n\n你可以点击 Preview 标签页查看实时效果，支持鼠标交互！';

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
