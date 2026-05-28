import type { Session } from '@agenthub/shared/types/entities';
import type { FileNode } from './mockFiles';

export interface Project {
  id: string;
  name: string;
  icon: string;
  fileTree: FileNode;
  sessions: Session[];
}

export const projects: Project[] = [
  {
    id: 'project_a',
    name: 'AgentHub 核心平台',
    icon: '🚀',
    fileTree: {
      name: 'agenthub-web',
      type: 'dir',
      children: [
        {
          name: 'src',
          type: 'dir',
          children: [
            { name: 'app', type: 'dir', children: [{ name: 'page.tsx', type: 'file' }, { name: 'layout.tsx', type: 'file' }] },
            { name: 'components', type: 'dir', children: [{ name: 'ChatArea.tsx', type: 'file' }, { name: 'Sidebar.tsx', type: 'file' }] },
          ],
        },
        { name: 'package.json', type: 'file' },
        { name: 'tailwind.config.js', type: 'file' },
      ],
    },
    sessions: [
      { id: 'sess_a1', title: '🎨 前端架构设计', type: 'group', agentIds: ['agent-orchestrator-001', 'agent-codex-001'], createdAt: '2026-05-27T09:00:00Z' },
      { id: 'sess_a2', title: '🔧 API 接口联调', type: 'group', agentIds: ['agent-orchestrator-001', 'agent-claude-001'], createdAt: '2026-05-27T10:00:00Z' },
      { id: 'sess_a3', title: '💬 Codex 1v1 咨询', type: 'single', agentIds: ['agent-codex-001'], createdAt: '2026-05-27T11:00:00Z' },
    ],
  },
  {
    id: 'project_b',
    name: 'QuantEngine 量化内核',
    icon: '🐍',
    fileTree: {
      name: 'quant-engine',
      type: 'dir',
      children: [
        {
          name: 'core',
          type: 'dir',
          children: [
            { name: 'strategy.py', type: 'file' },
            { name: 'backtest.py', type: 'file' },
            { name: 'risk.py', type: 'file' },
          ],
        },
        { name: 'pyproject.toml', type: 'file' },
        { name: 'Dockerfile', type: 'file' },
      ],
    },
    sessions: [
      { id: 'sess_b1', title: '📊 策略回测优化', type: 'group', agentIds: ['agent-orchestrator-001', 'agent-claude-001'], createdAt: '2026-05-27T12:00:00Z' },
      { id: 'sess_b2', title: '🛡️ 风控模块重构', type: 'group', agentIds: ['agent-orchestrator-001', 'agent-claude-001', 'agent-codex-001'], createdAt: '2026-05-27T13:00:00Z' },
    ],
  },
];
