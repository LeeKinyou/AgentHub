/* eslint-disable */
/**
 * This file was automatically generated from entities.json
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file.
 */

export interface AgentProfile {
  id: string;
  name: string;
  avatar?: string;
  role: 'orchestrator' | 'expert';
  description?: string;
}

export interface Session {
  id: string;
  title: string;
  type: 'single' | 'group';
  agentIds: string[];
  createdAt: string;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
}

export interface DeployLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface CodeBlock {
  language: string;
  code: string;
  title: string;
}

export interface DiffBlock {
  filename: string;
  language: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  status: 'pending' | 'applied' | 'rejected';
}

export interface PreviewBlock {
  html: string;
  css?: string;
  js?: string;
  viewport: 'mobile' | 'tablet' | 'desktop';
}

export interface DeployBlock {
  status: 'queued' | 'building' | 'deploying' | 'live' | 'failed';
  progress: number;
  previewUrl?: string | null;
  logs: DeployLogEntry[];
}

export interface CardData {
  codeBlock?: CodeBlock;
  diffBlock?: DiffBlock;
  previewBlock?: PreviewBlock;
  deployBlock?: DeployBlock;
}

export interface Message {
  id: string;
  sessionId: string;
  senderType: 'user' | 'agent';
  senderId: string;
  content: string;
  contentType: 'text' | 'markdown' | 'card';
  cardData?: CardData;
  createdAt: string;
}
