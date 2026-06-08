import type { Message } from '@agenthub/shared/types/entities';

export type MockMessage = Message & {
  isStreaming?: boolean;
  deployStatus?: 'building' | 'deploying' | 'success';
};

const ts = () => new Date().toISOString();
const id = () => crypto.randomUUID();

const DIFF_PATCH = [
  '--- a/DigitalClock.tsx',
  '+++ b/DigitalClock.tsx',
  '@@ -12,7 +12,7 @@',
  ' import { useEffect, useState } from "react";',
  '',
  '-const speed = 10;',
  '+const speed = 45; // 性能优化：提升时钟渲染频率',
  '',
  ' export function DigitalClock() {',
  '   const [time, setTime] = useState(new Date());',
].join('\n');

export function getMockResponses(input: string, sessionId: string): MockMessage[] | null {
  const text = input.trim();

  if (text.includes('测试群聊')) {
    return [
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-orchestrator-001', content: '收到任务，正在将城市规划算法拆解。已指派前端工程师生成核心逻辑，指派后端工程师优化后端。', contentType: 'text', createdAt: ts() },
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-backend-001', content: '数据结构已设计完毕，正在输出底层核心代码...', contentType: 'text', createdAt: ts() },
    ];
  }

  if (text.includes('测试Diff')) {
    return [
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-frontend-001', content: '已生成针对 `DigitalClock.tsx` 的性能优化补丁，请审阅：', contentType: 'text', createdAt: ts() },
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-frontend-001', content: DIFF_PATCH, contentType: 'diff_patch' as MockMessage['contentType'], createdAt: ts() },
    ];
  }

  if (text.includes('测试部署')) {
    return [
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-orchestrator-001', content: '正在为你的项目触发全球边缘部署流水线...', contentType: 'text', createdAt: ts() },
      { id: id(), sessionId, senderType: 'agent', senderId: 'agent-frontend-001', content: '部署中', contentType: 'deploy_status' as MockMessage['contentType'], deployStatus: 'building', createdAt: ts() },
    ];
  }

  return null;
}
